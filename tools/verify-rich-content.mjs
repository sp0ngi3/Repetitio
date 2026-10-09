import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const api = "http://127.0.0.1:5190";
const url = "http://127.0.0.1:5174";
const output = new URL("../.artifacts/rich-content-verification/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await mkdir(output, { recursive: true });
async function json(path, body) {
  const response = await fetch(api + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  assert(response.ok, await response.clone().text());
  return response.json();
}
const status = await json("/api/backup/status");
assert(status.databasePath.replaceAll("\\", "/").includes("/.artifacts/wiki-verification/preview.db"), "Never seed production data");
const title = "Rendering QA: Events and deployment";
const readiness = "Explain how an event decouples a publisher from concrete subscribers while retaining a shared delegate contract.";
const fence = (language, source) => `\n\n\`\`\`${language}\n${source}\n\`\`\`\n\n`;
const source = "## Exam, Practical Work, and Interview Readiness\n\n- [ ] " + readiness +
  "\n\n## Code examples" + fence("csharp", "public event Action<string>? Changed;\npublic void Publish(string message) => Changed?.Invoke(message);") +
  fence("python", "def publish(message):\n    for subscriber in subscribers:\n        subscriber(message)") +
  fence("yaml", 'services:\n  api:\n    image: example/api:latest\n    ports:\n      - "8080:8080"') +
  fence("dockerfile", "FROM mcr.microsoft.com/dotnet/aspnet:10.0\nWORKDIR /app\nCOPY . .\nENTRYPOINT [\"dotnet\", \"App.dll\"]") +
  fence("text", "Publisher -> Event -> Subscriber\n                   -> Another subscriber") +
  "## Event flow" + fence("mermaid", "flowchart LR\n    Publisher --> Event[Shared delegate contract]\n    Event --> SubscriberA\n    Event --> SubscriberB") +
  "## Invalid diagram" + fence("mermaid", "this is not a valid diagram") +
  "## Message sequence" + fence("mermaid", "sequenceDiagram\n    Publisher->>Event: Publish message\n    Event->>Subscriber: Invoke callback");
const existing = (await json("/api/wiki/?search=" + encodeURIComponent(title))).items.find(item => item.title === title);
const wiki = existing ? await json("/api/wiki/" + existing.id) : await json("/api/wiki/", { title, contentMarkdown: source });
const deckTitle = "Rendering QA: Fifty cards";
if (!(await json("/api/flashcards/decks?search=" + encodeURIComponent(deckTitle))).items.some(deck => deck.name === deckTitle)) {
  await json("/api/flashcards/batch", {
    flashcards: Array.from({ length: 50 }, (_, i) => ({ title: `Rendering card ${i + 1}`, question: `Question ${i + 1}`, explanation: `Answer ${i + 1}`, difficulty: "Easy", tags: ["rendering-qa"] })),
    createLearningSessions: true, learningSessionName: deckTitle, learningSessionSize: 50
  });
}
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
await context.addInitScript(() => { window.print = () => { window.__printed = true; }; });
const page = await context.newPage();
const errors = [], external = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (/^https?:/.test(request.url()) && !["localhost", "127.0.0.1"].includes(new URL(request.url()).hostname)) external.push(request.url()); });
async function navigate(name) {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name, exact: true }).click();
}
async function article() {
  await navigate("Wiki");
  await page.getByRole("textbox", { name: "Search topic tree" }).fill(title);
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
}
async function snapshot(name) {
  await page.screenshot({ path: `${output}/${name}.png`, animations: "disabled" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${name}: no page overflow`);
}
async function contrast(locator, label) {
  const result = await locator.evaluate(element => {
    const rgba = value => value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
    function bg(el) { if (!el) return [255, 255, 255]; const c = rgba(getComputedStyle(el).backgroundColor), p = bg(el.parentElement); return c.slice(0, 3).map((v, i) => v * (c[3] ?? 1) + p[i] * (1 - (c[3] ?? 1))); }
    const lum = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const a = lum(rgba(getComputedStyle(element).color)), b = lum(bg(element));
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), background: getComputedStyle(element).backgroundColor };
  });
  assert(result.ratio >= 4.5, `${label}: contrast ${JSON.stringify(result)}`);
}
try {
  await page.goto(url);
  for (const style of ["professional", "vaporwave"]) for (const mode of ["light", "dark"]) {
    console.log(`Checking ${style}/${mode}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("Settings");
    await page.getByRole("radio", { name: style === "professional" ? "Professional" : "Vaporwave", exact: true }).check();
    await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).check();
    await navigate("Flashcards");
    await page.getByRole("textbox", { name: "Search sessions", exact: true }).fill(deckTitle);
    await page.waitForTimeout(700);
    const deck = page.locator(".flashcard-session-card").filter({ hasText: deckTitle });
    const badge = deck.locator(".flashcard-count-badge");
    await badge.scrollIntoViewIfNeeded();
    assert.equal(await badge.innerText(), "50 cards");
    await contrast(badge, `${style}/${mode} card badge`);
    for (const tab of await page.locator(".dashboard-mode-toggle button").all()) await contrast(tab, `${style}/${mode} dashboard tab`);
    await snapshot(`${style}-${mode}-learning-sessions`);
    await deck.getByRole("button", { name: "Start", exact: true }).click();
    await page.locator(".flashcard-card").waitFor();
    await article();
    const content = page.locator(".official-wiki-content").first();
    for (const language of ["csharp", "python", "yaml", "dockerfile"]) {
      const code = content.locator(`code.language-${language}`);
      await code.waitFor();
      assert(await code.locator("[class^='hljs-']").count() > 0, `${language} has syntax tokens`);
      assert.equal(await code.locator("[class^='hljs-']").first().evaluate(el => getComputedStyle(el).display), "inline");
    }
    const checkbox = content.getByRole("checkbox", { name: readiness });
    await checkbox.check();
    assert(await checkbox.isChecked());
    await contrast(checkbox.locator(".."), `${style}/${mode} checklist`);
    await content.locator(".wiki-code-block").first().scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-code`);
    const flow = content.locator(".wiki-diagram-block").nth(0);
    await flow.scrollIntoViewIfNeeded();
    console.log("Checking flowchart rendering");
    await flow.locator(".wiki-diagram-svg svg").waitFor({ timeout: 60000 });
    const bounds = await flow.locator(".wiki-diagram-svg svg").boundingBox();
    assert(bounds.width > 100 && bounds.height > 40, "Diagram must be nonblank and framed");
    assert((await flow.locator(".wiki-diagram-svg svg").textContent()).includes("Publisher"));
    await snapshot(`${style}-${mode}-diagram`);
    await flow.getByRole("button", { name: "Show Mermaid source", exact: true }).click();
    assert(await flow.locator("pre").isVisible());
    await flow.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.equal(await flow.locator(".wiki-diagram-svg").evaluate(el => el.style.width), "125%");
    await flow.getByRole("button", { name: "Reset diagram zoom", exact: true }).click();
    const download = page.waitForEvent("download");
    await flow.getByRole("button", { name: "Download diagram SVG", exact: true }).click();
    assert.equal((await download).suggestedFilename(), "wiki-diagram.svg");
    const invalid = content.locator(".wiki-diagram-block").nth(1);
    await invalid.scrollIntoViewIfNeeded();
    await invalid.getByRole("status").filter({ hasText: "Could not render" }).waitFor();
    assert(await invalid.locator("pre").isVisible());
    const sequence = content.locator(".wiki-diagram-block").nth(2);
    await sequence.scrollIntoViewIfNeeded();
    await sequence.locator(".wiki-diagram-svg svg").waitFor({ timeout: 60000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await flow.scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-diagram-mobile`);
    await content.locator("code.language-yaml").scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-code-mobile`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await article();
  assert(await page.getByRole("checkbox", { name: readiness }).isChecked(), "Checklist persists across reloads");
  const original = await json("/api/wiki/" + wiki.id);
  assert.equal(original.contentMarkdown, wiki.contentMarkdown, "UI interactions never change database article source");
  assert.equal(original.updatedAt, wiki.updatedAt);
  const csharp = page.locator(".wiki-code-block").filter({ has: page.locator("code.language-csharp") }).first();
  await csharp.getByRole("button", { name: "Copy code", exact: true }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n"), await csharp.locator("code").textContent());
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await page.getByRole("combobox", { name: "Code snippet language" }).selectOption("yaml");
  const editor = page.getByRole("textbox", { name: "Article source" });
  const marker = (await editor.inputValue()).indexOf("## Code examples");
  await editor.evaluate((el, offset) => { el.focus(); el.setSelectionRange(offset, offset); }, marker);
  await page.getByRole("button", { name: "Code", exact: true }).click();
  assert((await editor.inputValue()).slice(marker).startsWith("```yaml"), "Code inserts at the cursor");
  await page.getByRole("button", { name: "Article", exact: true }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const popup = await popupPromise;
  await popup.waitForFunction(() => window.__printed, undefined, { timeout: 60000 });
  assert.equal(await popup.locator(".wiki-diagram-preview svg").count(), 2, "Valid diagrams print; invalid diagram source survives");
  assert(await popup.getByText("this is not a valid diagram", { exact: true }).isVisible());
  await popup.screenshot({ path: `${output}/pdf-preview.png` });
  await popup.close();
  await navigate("Basics");
  await page.locator(".record-row").first().click();
  const codeEditor = page.getByRole("textbox", { name: "Source code", exact: true });
  await codeEditor.fill(Array.from({ length: 100 }, (_, i) => `int value${i} = ${i}; // ` + "long text ".repeat(40)).join("\n"));
  await codeEditor.evaluate(el => { el.scrollTop = 400; el.scrollLeft = 300; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
  const scroll = await page.evaluate(() => {
    const input = document.querySelector(".dsa-code-input"), highlight = document.querySelector(".dsa-code-highlight"), gutter = document.querySelector(".dsa-code-lines");
    return { input: [input.scrollTop, input.scrollLeft], highlight: [highlight.scrollTop, highlight.scrollLeft], gutter: gutter.scrollTop };
  });
  assert.deepEqual(scroll.input, scroll.highlight, "Editor highlighting follows both scroll axes");
  assert.equal(scroll.gutter, scroll.input[0]);
  assert.equal(await codeEditor.evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)", "Textarea must not obscure highlighting");
  assert(await page.locator(".dsa-code-highlight [class^='hljs-']").count() > 0);
  await codeEditor.evaluate(el => { el.scrollTop = 0; el.scrollLeft = 0; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await page.waitForTimeout(250);
  await codeEditor.scrollIntoViewIfNeeded();
  await snapshot("basics-highlighted-editor");
  await page.setViewportSize({ width: 390, height: 844 });
  await codeEditor.scrollIntoViewIfNeeded();
  await snapshot("basics-highlighted-editor-mobile");
  assert.deepEqual(errors, [], "No browser exceptions");
  assert.deepEqual(external, [], "No external diagram or code requests");
  console.log("Rich content verified: four themes, 50-card contrast, checklist persistence, syntax, diagrams, PDF, cursor insertion and editor scrolling.");
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.error("Browser errors:", errors);
  throw error;
} finally { await browser.close(); }
