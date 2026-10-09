import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const api = "http://127.0.0.1:5190", url = "http://127.0.0.1:5174";
const output = new URL("../.artifacts/wiki-readability/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await mkdir(output, { recursive: true });
async function json(path, body) {
  const response = await fetch(api + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  assert(response.ok, await response.clone().text()); return response.json();
}
const status = await json("/api/backup/status");
assert(status.databasePath.replaceAll("\\", "/").includes("/.artifacts/wiki-verification/preview.db"), "Never seed production data");
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const imageData = await page.evaluate(() => {
  const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 1800;
  const paint = canvas.getContext("2d"); paint.fillStyle = "#204b50"; paint.fillRect(0, 0, 800, 1800);
  paint.fillStyle = "#e0f4ef"; paint.font = "36px sans-serif";
  for (let row = 0; row < 10; row++) { paint.fillRect(60, 100 + row * 160, 680, 110); paint.fillStyle = "#204b50"; paint.fillText(`Diagram step ${row + 1}`, 100, 168 + row * 160); paint.fillStyle = "#e0f4ef"; }
  return canvas.toDataURL("image/png").split(",")[1];
});
const form = new FormData(); form.append("file", new Blob([Buffer.from(imageData, "base64")], { type: "image/png" }), "tall-diagram.png");
const imageResponse = await fetch(api + "/api/wiki/images", { method: "POST", body: form });
assert(imageResponse.ok, await imageResponse.clone().text());
const image = await imageResponse.json();
const title = "Wiki readability QA " + Date.now();
const prose = "A publisher depends on a shared contract instead of the concrete subscriber. Explain requirements, edge cases and delivery guarantees before comparing implementations. ";
const paragraphs = count => Array.from({ length: count }, (_, index) => `Paragraph ${index + 1}. ${prose.repeat(3)}`).join("\n\n");
const table = "| Mechanism | Purpose | Constraints | Failure handling | Tradeoffs |\n| --- | --- | --- | --- | --- |\n" +
  Array.from({ length: 4 }, (_, index) => `| Strategy ${index + 1} | ${prose.repeat(3)} | ${prose.repeat(2)} | ${prose.repeat(3)} | ${prose.repeat(2)} |`).join("\n");
const markdown = "## Overview\n\n" + paragraphs(8) + "\n\n## Before images\n\n" + paragraphs(3) +
  `\n\n![First tall diagram](wiki-image:${image.id})\n\n## After first image\n\n` + paragraphs(5) +
  `\n\n![Second tall diagram](wiki-image:${image.id})\n\n## After second image\n\n` + paragraphs(5) +
  "\n\n## Comparison\n\n" + table + "\n\n## Vocabulary\n\n:::definition **Delegate contract**\n\nA shared method signature used by publishers and subscribers.\n\n- Parameter types must agree.\n- The return type is part of the contract.\n\n:::\n\n:::definition Subscriber\n\nA component registered to receive an event. It may be implemented independently.\n\n:::\n\n::::important Active recall\n\nWhy is the publisher decoupled from subscribers?\n\n:::details Show hint\n\nThink about the delegate signature.\n\n:::\n\n:::details Reveal answer\n\nIt knows the shared contract, not the concrete implementation.\n\n" + paragraphs(5) + "\n\n```csharp\nChanged?.Invoke(message);\n```\n\n:::\n\n::::\n\n## After recall\n\n" + paragraphs(12) + "\n\n## End\n\n" + paragraphs(6);
const wiki = await json("/api/wiki/", { title, contentMarkdown: markdown, sources: [{ title: "Existing study book", type: "Book" }] });
async function navigate(name) { await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name, exact: true }).click(); }
async function openArticle() {
  await navigate("Wiki"); await page.getByRole("textbox", { name: "Search topic tree" }).fill(title);
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await page.locator(".official-wiki-content .wiki-definition").first().waitFor();
}
async function screenshot(name) {
  await page.screenshot({ path: `${output}/${name}.png`, animations: "disabled" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${name}: page must not overflow`);
}
async function alignSource(heading) {
  const position = await page.getByRole("textbox", { name: "Article source" }).evaluate((source, label) => {
    const mirror = document.querySelector(".wiki-source-measure"), text = mirror.firstChild;
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 1);
    const origin = range.getBoundingClientRect().top;
    const offset = source.value.indexOf("## " + label + "\n");
    if (offset < 0) throw new Error("Missing source heading");
    range.setStart(text, offset); range.setEnd(text, offset + 1);
    source.scrollTop = range.getBoundingClientRect().top - origin + parseFloat(getComputedStyle(source).paddingTop);
    source.dispatchEvent(new Event("scroll", { bubbles: true })); return source.scrollTop;
  }, heading);
  await page.waitForTimeout(250);
  await assertPreviewAligned(heading);
  return position;
}
async function assertPreviewAligned(heading) {
  const error = await page.locator(".wiki-preview-scroll").getByRole("heading", { name: heading, exact: true }).evaluate(el => el.getBoundingClientRect().top - el.closest(".wiki-preview-scroll").getBoundingClientRect().top);
  assert(Math.abs(error) < 35, `${heading}: corresponding preview block must align, error ${error}px`);
}
try {
  await page.goto(url); await openArticle();
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Article JSON", exact: true });
  const exported = JSON.parse(await editor.inputValue());
  exported.pages[0].contentMarkdown = exported.pages[0].contentMarkdown.replace("A shared method signature", "A precise shared method signature");
  await editor.fill(JSON.stringify(exported, null, 2));
  await page.getByRole("button", { name: "Review changes", exact: true }).first().click();
  await page.getByText("1 pages changed", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save changes", exact: true }).first().click();
  await page.getByRole("button", { name: "Edit source", exact: true }).waitFor();
  const saved = await json("/api/wiki/" + wiki.id);
  assert.equal(saved.contentMarkdown, exported.pages[0].contentMarkdown);
  assert.equal(saved.sources[0].id, wiki.sources[0].id);
  assert(saved.contentMarkdown.includes(`wiki-image:${image.id}`));
  for (const style of ["professional", "vaporwave"]) for (const mode of ["light", "dark"]) {
    console.log(`Readability ${style}/${mode}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("Settings");
    await page.getByRole("radio", { name: style === "professional" ? "Professional" : "Vaporwave", exact: true }).check();
    await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).check();
    await openArticle();
    const wrap = page.locator(".official-wiki-content .wiki-table-wrap").first();
    await wrap.scrollIntoViewIfNeeded();
    const viewport = wrap.locator(".wiki-table-viewport");
    assert(await viewport.evaluate(el => el.scrollWidth > el.clientWidth), "Long columns scroll instead of squeezing");
    const sizes = await wrap.locator("tbody td").evaluateAll(cells => cells.slice(0, 5).map(cell => cell.getBoundingClientRect().width));
    assert(sizes.slice(1).every(width => width >= 295), JSON.stringify(sizes));
    await screenshot(`${style}-${mode}-table`);
    await wrap.getByRole("button", { name: "Expand table", exact: true }).click();
    await page.getByRole("dialog", { name: "Expanded table" }).waitFor();
    assert(await page.locator(".wiki-table-dialog-scroll").evaluate(el => el.clientWidth >= el.closest("dialog").clientWidth - 2), "Expanded table uses the full dialog width");
    await screenshot(`${style}-${mode}-expanded-table`);
    await page.keyboard.press("Escape");
    await page.locator(".wiki-learning-important").scrollIntoViewIfNeeded();
    await page.getByText("Reveal answer", { exact: true }).click();
    assert(await page.locator(".wiki-learning-important code").isVisible());
    await page.locator(".wiki-definition").first().scrollIntoViewIfNeeded();
    await screenshot(`${style}-${mode}-learning-blocks`);
    await page.setViewportSize({ width: 390, height: 844 });
    await wrap.scrollIntoViewIfNeeded(); await screenshot(`${style}-${mode}-table-mobile`);
    await page.locator(".wiki-definition").first().scrollIntoViewIfNeeded(); await screenshot(`${style}-${mode}-definitions-mobile`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/wiki/images/**", async route => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.continue(); });
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Article source" });
  await source.waitFor(); await page.waitForTimeout(200);
  await alignSource("After first image");
  await page.waitForFunction(() => [...document.querySelectorAll(".wiki-preview-scroll img")].every(img => img.complete && img.naturalWidth));
  await page.waitForTimeout(250);
  await assertPreviewAligned("After first image");
  await alignSource("Before images"); await alignSource("After first image"); await alignSource("After second image");
  await page.locator(".wiki-editor-workspace").scrollIntoViewIfNeeded(); await screenshot("synchronized-after-images");
  await alignSource("After recall");
  const before = await source.evaluate(el => el.scrollTop);
  await page.locator(".wiki-preview-scroll").getByText("Reveal answer", { exact: true }).evaluate(el => el.click());
  await page.waitForTimeout(250);
  assert(Math.abs(await source.evaluate(el => el.scrollTop) - before) < 1, "Opening recall must not move the source");
  await assertPreviewAligned("After recall");
  await alignSource("After recall");
  const target = await alignSource("After second image");
  await source.evaluate(el => { el.scrollTop -= 100; el.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await page.waitForTimeout(150);
  await page.locator(".wiki-preview-scroll").getByRole("heading", { name: "After second image", exact: true }).evaluate(el => {
    const pane = el.closest(".wiki-preview-scroll"); pane.scrollTop += el.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    pane.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForTimeout(200);
  assert(Math.abs(await source.evaluate(el => el.scrollTop) - target) < 35, "Preview-to-source sync uses corresponding blocks");
  await page.evaluate(() => document.documentElement.dataset.style = "professional");
  await page.waitForTimeout(250); await alignSource("After first image");
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(250); await alignSource("After first image");
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250); await alignSource("After second image");
  await page.locator(".wiki-preview-scroll").scrollIntoViewIfNeeded(); await screenshot("preview-mobile-with-images");
  assert.deepEqual(errors, [], "No browser exceptions");
  assert.equal((await json("/api/wiki/" + wiki.id)).contentMarkdown, saved.contentMarkdown, "Preview and expansion never modify saved content");
  console.log("Verified: content-aware tables, expansion/Escape, four themes, JSON-edited definitions/recall, delayed tall images, bidirectional block sync, resizing, and unchanged stored content.");
} catch (error) {
  console.error("Browser errors:", errors); await page.screenshot({ path: `${output}/failure.png` }); throw error;
} finally { await browser.close(); }
