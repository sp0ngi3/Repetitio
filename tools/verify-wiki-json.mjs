import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
// These fixed ports belong to the disposable Wiki verification database, never Docker production.
const api = "http://localhost:5190";
const output = new URL("../.artifacts/wiki-verification/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await mkdir(output, { recursive: true });
async function request(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(api + path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  assert(response.ok, await response.clone().text());
  return response.json();
}
const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvbkAAAAASUVORK5CYII=", "base64");
const form = new FormData();
form.append("file", new Blob([imageBytes], { type: "image/png" }), "existing-diagram.png");
const uploaded = await fetch(api + "/api/wiki/images", { method: "POST", body: form });
assert(uploaded.ok, await uploaded.clone().text());
const image = await uploaded.json();
const title = "JSON revision guide " + Date.now();
const root = await request("/api/wiki/", { title, contentMarkdown: `## Load balancing\n\nOriginal explanation.\n\n![Existing diagram](wiki-image:${image.id})\n\n## Tradeoffs\n\nOriginal tradeoffs.`,
  sources: [{ title: "Architecture book", type: "Book", locator: "Chapter 2" }],
  quizQuestions: [{ prompt: "What does a load balancer distribute?", options: [{ text: "Requests", isCorrect: true }, { text: "Source code", isCorrect: false }] }],
  flashcards: [{ front: "What is load balancing?", back: "Distributing requests across instances." }]
});
const child = await request("/api/wiki/", { parentId: root.id, title: "Balancing strategies", contentMarkdown: "Child explanation." });
const grandchild = await request("/api/wiki/", { parentId: child.id, title: "Round robin", contentMarkdown: "Grandchild explanation." });
await request("/api/wiki/study", { id: crypto.randomUUID(), answers: [{ pageId: root.id, itemId: root.quizQuestions[0].id, kind: "quiz", optionId: root.quizQuestions[0].options.find(option => option.isCorrect).id }] });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto("http://localhost:5174");
  await page.getByRole("button", { name: "Wiki", exact: true }).click();
  await page.getByRole("textbox", { name: "Search topic tree" }).fill(title);
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Article JSON", exact: true });
  await source.waitFor();
  let exported = JSON.parse(await source.inputValue());
  assert.equal(exported.pages[0].children.length, 0);
  assert.equal(exported.pages[0].images[0].id, image.id);
  assert.equal(exported.pages[0].images[0].lines[0], 5);
  await page.getByRole("button", { name: "Copy JSON", exact: true }).click();
  await page.getByRole("button", { name: "JSON copied", exact: true }).waitFor();
  assert.deepEqual(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())), JSON.parse(await source.inputValue()));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON", exact: true }).click();
  assert((await downloadPromise).suggestedFilename().endsWith("-edit.json"));
  await page.getByRole("checkbox", { name: "Include subpages", exact: true }).check();
  await page.waitForFunction(() => JSON.parse(document.querySelector('textarea[aria-label="Article JSON"]').value).pages[0].children.length === 1);
  exported = JSON.parse(await source.inputValue());
  assert.equal(exported.pages[0].children[0].children[0].id, grandchild.id);
  exported.pages[0].appendSections = [{ heading: "Vocabulary", definitions: [{ term: "Affinity", definition: "Keeping related requests on the same instance." }] }];
  exported.pages[0].children[0].contentMarkdown = "Improved child explanation.";
  exported.pages[0].children[0].children = [];
  await source.fill(JSON.stringify(exported, null, 2));
  assert(await page.getByRole("button", { name: "Save changes", exact: true }).isDisabled(), "Must review before saving");
  await page.getByRole("button", { name: "Review changes", exact: true }).first().click();
  await page.getByText("2 pages changed", { exact: true }).waitFor();
  await page.getByText("1 omitted pages kept", { exact: true }).waitFor();
  await page.locator(".wiki-json-preview .wiki-definition").waitFor();
  assert(await page.locator(".wiki-json-preview img").evaluate(element => element.complete && element.naturalWidth > 0), "Existing image renders in preview");
  await page.screenshot({ path: output + "/json-editor-light.png" });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.screenshot({ path: output + "/json-editor-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: output + "/json-editor-mobile-dark.png" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "JSON editor has no mobile overflow");
  await page.setViewportSize({ width: 1440, height: 1000 });
  const savedResponse = page.waitForResponse(response => response.url() === `${api}/api/wiki/${root.id}/json` && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.equal((await savedResponse).status(), 200);
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  const saved = await request(`/api/wiki/${root.id}`);
  assert(saved.contentMarkdown.startsWith(root.contentMarkdown), "Original body and image stay in position");
  assert(saved.contentMarkdown.includes("Affinity"));
  assert.equal(saved.quizQuestions[0].id, root.quizQuestions[0].id);
  assert.equal(saved.flashcards[0].id, root.flashcards[0].id);
  assert.equal(saved.sources[0].id, root.sources[0].id);
  assert.equal((await request(`/api/wiki/${child.id}`)).contentMarkdown, "Improved child explanation.");
  assert.equal((await request(`/api/wiki/${grandchild.id}`)).contentMarkdown, "Grandchild explanation.");
  const tracked = (await request("/api/wiki/study")).pages.find(item => item.id === root.id).modes.find(mode => mode.kind === "quiz");
  assert.equal(tracked.covered, 1); assert(tracked.lastCompletedAt);

  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  await source.waitFor();
  const fresh = JSON.parse(await source.inputValue());
  fresh.pages[0].contentMarkdown = fresh.pages[0].contentMarkdown.replace(`![Existing diagram](wiki-image:${image.id})`, "");
  await source.fill(JSON.stringify(fresh, null, 2));
  await page.getByRole("button", { name: "Review changes", exact: true }).first().click();
  assert(await page.getByRole("button", { name: "Save changes", exact: true }).isDisabled(), "Accidental image unlinking blocked");
  await page.getByRole("checkbox", { name: "Allow unlinking 1 image references" }).waitFor();
  // Restore image and simulate another editor changing the page after this snapshot.
  fresh.pages[0].contentMarkdown = saved.contentMarkdown + "\n\nMy pending edit.";
  await source.fill(JSON.stringify(fresh, null, 2));
  await page.getByRole("button", { name: "Review changes", exact: true }).first().click();
  await request(`/api/wiki/${root.id}/json`, { updates: [{ id: root.id, expectedUpdatedAt: saved.updatedAt, page: { parentId: saved.parentId, title: saved.title, slug: saved.slug,
    summary: saved.summary, contentMarkdown: saved.contentMarkdown + "\n\nNewer edit from another window.", sortOrder: saved.sortOrder, isArchived: saved.isArchived } }], allowImageRemoval: false }, "PUT");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "changed since" }).waitFor();
  assert((await source.inputValue()).includes("My pending edit."), "Failed save retains text");
  assert(!(await request(`/api/wiki/${root.id}`)).contentMarkdown.includes("My pending edit."), "Stale edit never overwrites newer content");
  assert.deepEqual(Buffer.from(await (await fetch(api + image.url)).arrayBuffer()), imageBytes);
  assert.deepEqual(errors, []);
  console.log("Verified JSON editor: copy/download, branch export, image placement, vocabulary append, atomic multi-page save, omitted children, stable check/source IDs and study history, image guard, stale conflict, retained text, dark/desktop/mobile layouts.");
} catch (error) {
  console.log("Browser errors:", errors);
  await page.screenshot({ path: output + "/json-editor-failure.png" });
  console.log((await page.locator("body").innerText()).slice(0, 2500));
  throw error;
} finally { await browser.close(); }
