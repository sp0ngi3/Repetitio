import { createRequire } from "node:module";
import path from "node:path";
import { strict as assert } from "node:assert";
import { startBrowserTestApp } from "./browser-test-app.mjs";

const { chromium, webkit, devices } = createRequire(import.meta.url)("playwright");
const app = await startBrowserTestApp("tablet-landscape");
const browsers = [];
try {
  const root = await app.request("/api/wiki/", { title: "Distributed systems and application architecture", contentMarkdown: "## Overview\n\nA readable article with enough room for the topic library.\n\n## Tradeoffs\n\nCompare consistency, availability and latency.",
    quizQuestions: [{ prompt: "Which tradeoff matters?", options: [{ text: "Availability", isCorrect: true }, { text: "None", isCorrect: false }] }] });
  await app.request(`/api/wiki/${root.id}/studied`, { isStudied: true }, "PATCH");
  await app.request("/api/wiki/", { title: "Consistency models and their practical applications in distributed systems", parentId: root.id, contentMarkdown: "## Child\n\nKeep the child independent." });
  const card = await app.request("/api/flashcards/", { title: "Consistency and availability", question: "Explain the consistency versus availability tradeoff. ".repeat(8), explanation: "Describe a concrete failure scenario and explain the tradeoff. ".repeat(80) });
  for (const name of ["Architecture revision", "Networking revision"]) await app.request("/api/flashcards/decks", { name, flashcardIds: [card.id] });
  await app.request("/api/basics/");
  const mobile = await webkit.launch({ headless: true }); browsers.push(mobile);
  const desktop = await chromium.launch({ channel: "msedge", headless: true }); browsers.push(desktop);
  const profiles = [[1024, 768, true], [1180, 820, true], [1366, 1024, true], [390, 844, true], [1440, 1000, false]];
  for (const [width, height, touch] of profiles) {
    const landscape = touch && width >= 1000;
    const context = await (touch ? mobile : desktop).newContext({ ...(touch ? devices[landscape ? "iPad Pro 11" : "iPhone 13"] : {}),
      viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("repetitio-motion", "reduced"));
    await page.goto(app.site);
    await page.getByText("Flashcards 1", { exact: true }).waitFor();
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Wiki", exact: true }).click();
    await page.locator(".wiki-article-titlebar h1").waitFor();
    if (landscape) {
      assert.equal(await page.locator(".wiki-wikipedia-page").getAttribute("data-tablet-layout"), "reading");
      assert.equal(await page.getByRole("button", { name: "Topics", exact: true }).count(), 0);
      assert(await page.locator(".app-header").evaluate(element => element.getBoundingClientRect().height < 100), "Landscape header must be compact");
      assert.equal(await page.locator(".wiki-reading-layout").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    }
    async function library() {
      const topics = page.getByRole("button", { name: "Topics", exact: true });
      if (await topics.isVisible() && !await page.getByRole("dialog", { name: "Wiki topics", exact: true }).isVisible()) await topics.click();
      return page.getByRole("complementary", { name: "Wiki topic tree", exact: true });
    }
    let tree = await library();
    await tree.getByRole("button", { name: root.title, exact: true }).click();
    await page.getByRole("heading", { name: root.title, exact: true }).waitFor();
    tree = await library();
    for (const style of ["professional", "vaporwave"]) for (const theme of ["light", "dark"]) {
      await page.evaluate(({ style, theme }) => { document.documentElement.dataset.style = style; document.documentElement.dataset.theme = theme; }, { style, theme });
      await page.mouse.move(0, 0);
      const row = tree.locator(".wiki-tree-row.studied");
      const correctGreen = await row.evaluate(element => {
        const probe = document.createElement("span"); probe.style.color = "var(--success-soft)"; document.body.appendChild(probe);
        const expected = getComputedStyle(probe).color; probe.remove();
        return getComputedStyle(element).backgroundColor === expected;
      });
      assert(correctGreen, `${width}: studied row must use the green success background in ${style}/${theme}`);
      const label = row.locator(".wiki-tree-title");
      const check = row.getByRole("img", { name: "Studied" });
      const labelBox = await label.boundingBox(), checkBox = await check.boundingBox();
      assert(labelBox && checkBox && labelBox.x + labelBox.width <= checkBox.x + 1, "Check must not overlap the title");
      assert.equal(Math.round(checkBox.width), 20);
      assert.equal(await check.locator("svg").count(), 1);
      await tree.screenshot({ path: path.join(app.root, `${width}-tree-${style}-${theme}.png`) });
    }
    await page.evaluate(() => { document.documentElement.dataset.style = "professional"; document.documentElement.dataset.theme = "light"; });
    const closeSheet = page.getByRole("button", { name: "Close wiki topics", exact: true });
    if (await closeSheet.isVisible()) await closeSheet.click();
    if (landscape) await page.screenshot({ path: path.join(app.root, `${width}-wiki.png`), fullPage: true });
    await page.locator(".wiki-page-tabs").getByRole("button", { name: "Study", exact: true }).click();
    await page.getByRole("heading", { name: "Choose your topics", exact: true }).waitFor();
    const selected = page.locator(".wiki-study-topic-row.selected").first();
    const input = await selected.locator('input[type="checkbox"]').boundingBox();
    assert(input && Math.round(input.width) === 18 && Math.round(input.height) === 18, "Native selection checkbox must have stable dimensions");
    if (landscape) {
      assert.equal(await page.locator(".wiki-wikipedia-page").getAttribute("data-tablet-layout"), "workspace");
      assert.equal(await page.locator(".wiki-study-builder-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    }
    await page.screenshot({ path: path.join(app.root, `${width}-study-builder.png`), fullPage: true });
    await page.locator(".wiki-page-tabs").getByRole("button", { name: "Edit", exact: true }).click();
    const source = page.getByRole("textbox", { name: "Article source", exact: true });
    await source.waitFor();
    if (landscape) {
      await source.fill("## Unsaved tablet draft\n\nKeep this text during rotation.");
      await page.setViewportSize({ width: height, height: width });
      await page.setViewportSize({ width, height });
      assert.match(await source.inputValue(), /Keep this text during rotation/);
      assert.equal((await app.request(`/api/wiki/${root.id}`)).contentMarkdown, root.contentMarkdown);
      await page.screenshot({ path: path.join(app.root, `${width}-editor.png`), fullPage: true });
    }
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Flashcards", exact: true }).click();
    await page.getByText("Architecture revision", { exact: true }).waitFor();
    if (landscape) assert.equal(await page.locator(".flashcard-session-list").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    await page.locator(".flashcard-session-card").filter({ hasText: "Architecture revision" }).getByRole("button", { name: "Start", exact: true }).click();
    await page.locator(".flashcard-card").waitFor();
    if (landscape) assert.equal(await page.locator(".flashcard-study-panel").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    await page.getByRole("button", { name: "Flip", exact: true }).click();
    const face = page.locator(".flashcard-card-back");
    assert(await face.evaluate(element => { element.scrollTop = element.scrollHeight; return element.scrollTop > 0; }));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(app.root, `${width}-flashcards.png`), fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${width}x${height}: ${landscape ? "tablet landscape" : touch ? "phone" : "desktop"} passed`);
  }
  assert.equal((await app.request(`/api/wiki/${root.id}`)).isStudied, true);
  console.log(`Verified green studied states in both tree placements/all themes, aligned SVG checks and native checkboxes, landscape split layouts, rotation draft retention and scrollable cards. Screenshots: ${app.root}`);
} finally { for (const browser of browsers) await browser.close(); await app.close(); }
