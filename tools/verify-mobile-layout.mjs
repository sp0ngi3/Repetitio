import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { strict as assert } from "node:assert";
import { startBrowserTestApp } from "./browser-test-app.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit, devices } = require("playwright");
const safari = process.argv.includes("--webkit");
const baselineOnly = process.argv.includes("--baseline");
const compare = process.argv.find(value => value.startsWith("--compare="))?.slice(10);
const app = await startBrowserTestApp("mobile-layout");
let browser;
const report = [];
try {
  const text = "Explain the tradeoffs between consistency and availability, including failure scenarios and practical examples. ";
  const markdown = "## Overview\n\n" + text.repeat(5) + "\n\n## Comparison\n\n| Approach | Benefits | Tradeoffs |\n| --- | --- | --- |\n| Synchronous | " + text.repeat(3) + " | " + text.repeat(3) + " |\n\n## Code\n\n```csharp\npublic class Example { public int Sum(int a, int b) => a + b; }\n```\n\n## Summary\n\n" + text.repeat(5);
  const wiki = await app.request("/api/wiki/", { title: "Distributed systems study guide", contentMarkdown: markdown,
    quizQuestions: [{ prompt: text.repeat(4), options: [{ text: "Correct: " + text, isCorrect: true }, { text: "Incorrect: " + text, isCorrect: false }] }],
    flashcards: [{ front: text.repeat(3), back: text.repeat(20) }] });
  const dsa = await app.request("/api/dsa/", { title: "Find the longest contiguous subarray matching the given constraints", difficulty: "Medium", tags: ["arrays", "sliding-window"], problemStatement: text.repeat(10) });
  const system = await app.request("/api/system-design/", { title: "Design a globally distributed event processing system", difficulty: "Hard", tags: ["scalability", "availability"], problemStatement: text.repeat(10) });
  await app.request("/api/notes/", { title: "Interview preparation notes", area: "Dsa", content: text.repeat(30) });
  const card = await app.request("/api/flashcards/", { title: "Consistency versus availability", question: text.repeat(10), explanation: text.repeat(25), difficulty: "Medium", tags: ["distributed-systems"] });
  await app.request("/api/flashcards/decks", { name: "Distributed systems revision", description: text.repeat(2), flashcardIds: [card.id] });
  // Seed the built-in catalog once before dev-mode StrictMode issues parallel startup reads.
  await app.request("/api/basics/");
  // Deterministic timestamps make desktop screenshots comparable between test runs.
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(app.database);
  for (const table of ["WikiPages", "LearningItems", "NotePages", "FlashcardDecks"])
    database.exec(`UPDATE ${table} SET CreatedAt='2026-10-01 12:00:00', UpdatedAt='2026-10-01 12:00:00'`);
  database.close();
  browser = await (safari ? webkit.launch({ headless: true }) : chromium.launch({ channel: "msedge", headless: true }));
  const viewports = baselineOnly || process.argv.includes("--desktop-only") ? [[1440, 1000, false]] : safari ? [[390, 844, true], [820, 1180, true], [1180, 820, true]]
    : [[320, 640, true], [390, 844, true], [844, 390, true], [768, 1024, true], [820, 1180, true], [1024, 768, true], [1366, 1024, true], [1440, 1000, false]];
  for (const [width, height, touch] of viewports) {
    const device = touch ? devices[width >= 768 && height >= 600 ? "iPad Pro 11" : "iPhone 13"] : {};
    const context = await browser.newContext({ ...device, viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => { errors.push(error.message); console.error("Browser error:", error.message); });
    page.on("requestfailed", request => console.error("Request failed:", request.url(), request.failure()?.errorText));
    await page.addInitScript(() => { localStorage.setItem("repetitio-motion", "reduced"); });
    await page.goto(app.site);
    await page.getByText("DB online", { exact: true }).waitFor({ state: "attached" });
    await page.getByText("Flashcards 1", { exact: true }).waitFor();
    async function capture(name) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => ({ layoutWidth: innerWidth, scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("body *")].filter(element => {
          const box = element.getBoundingClientRect(); const style = getComputedStyle(element);
          return box.width > 0 && box.right > innerWidth + 2 && style.position !== "absolute" && style.visibility !== "hidden"
            && !element.closest("pre,.cm-scroller,.wiki-table-viewport,.flashcard-card-face,.code-touch-toolbar,.wiki-source-measure");
        }).slice(0, 10).map(element => ({ tag: element.tagName, className: String(element.className), width: element.getBoundingClientRect().width })) }));
      const file = `${width}-${touch ? "touch" : "desktop"}-${name}.png`;
      const screenshot = await page.screenshot({ path: path.join(app.root, file), fullPage: true, animations: "disabled", caret: "hide",
        // Backup paths vary per test run; equally-ranked weakness tags have no stable server ordering.
        mask: [page.getByText(/^[A-Z]:.*mobile-layout/), page.locator(".weakness-list")] });
      const hash = createHash("sha256").update(screenshot).digest("hex");
      report.push({ name, width, touch, file, hash, ...overflow });
      if (compare && !touch) {
        const baseline = JSON.parse(await readFile(path.join(compare, "report.json"), "utf8")).find(row => row.name === name && !row.touch);
        assert(baseline, `Missing desktop reference: ${name}`);
        if (hash !== baseline.hash) {
          const sharp = require("sharp");
          const before = await sharp(path.join(compare, baseline.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          const after = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          assert.equal(after.info.width, before.info.width, `Desktop width changed: ${name}`);
          assert.equal(after.info.height, before.info.height, `Desktop height changed: ${name}`);
          let different = 0;
          for (let offset = 0; offset < before.data.length; offset += 4) {
            if (before.data[offset] !== after.data[offset] || before.data[offset + 1] !== after.data[offset + 1]
                || before.data[offset + 2] !== after.data[offset + 2]) different++;
          }
          // A single antialiased corner can vary between identical browser renders.
          assert(different <= 20, `Desktop appearance changed: ${name} (${different} pixels). Compare ${compare} and ${app.root}`);
        }
      }
      console.log(`${width} ${name}: ${overflow.scroll > width + 1 ? "OVERFLOW " + JSON.stringify(overflow) : "fits"}`);
    }
    for (const name of ["Overview", "DSA", "System Design", "Basics", "Flashcards", "Wiki", "Notes", "Settings"]) {
      await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name, exact: true }).click();
      if (name === "Wiki") await page.locator(".wiki-article-titlebar h1").waitFor();
      if (name === "Basics") await page.getByText("Kadane's Algorithm: Maximum Subarray", { exact: true }).waitFor();
      if (name === "DSA") await page.getByText(dsa.title, { exact: true }).waitFor();
      if (name === "System Design") await page.getByText(system.title, { exact: true }).waitFor();
      if (name === "Flashcards") {
        await page.getByText("Distributed systems revision", { exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector(".flashcards-metric strong")?.textContent === "1");
      }
      if (name === "Notes") await page.getByRole("button", { name: "Interview preparation notes", exact: true }).waitFor();
      if (name === "Settings") {
        await page.getByRole("checkbox", { name: "Track reviews", exact: true }).waitFor();
        await page.getByText("Ready", { exact: true }).waitFor();
      }
      await capture(name.toLowerCase().replaceAll(" ", "-"));
    }
    await page.getByRole("button", { name: "DSA", exact: true }).click();
    await page.getByText(dsa.title, { exact: true }).click();
    await page.getByRole("heading", { name: "Attempt problem", exact: true }).waitFor();
    await capture("dsa-detail");
    await page.getByRole("button", { name: "System Design", exact: true }).click();
    await page.getByText(system.title, { exact: true }).click();
    await page.getByRole("heading", { name: "Attempt design", exact: true }).waitFor();
    await capture("system-detail");
    await page.getByRole("button", { name: "Flashcards", exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.locator(".flashcard-card").waitFor();
    await capture("flashcard-player");
    const flip = page.getByRole("button", { name: "Flip", exact: true });
    if (touch) await flip.tap(); else await flip.click();
    await capture("flashcard-answer");
    if (touch && !baselineOnly) {
      const transforms = await page.evaluate(() => [".flashcard-card-inner", ".flashcard-card-back"].map(selector => getComputedStyle(document.querySelector(selector)).transform));
      assert.equal(transforms[0], transforms[1], "Answer faces must not be mirrored: either both rotations are absent or the two 180-degree rotations cancel");
      const face = page.locator(".flashcard-card-back");
      assert(await face.evaluate(element => { element.scrollTop = element.scrollHeight; return element.scrollTop > 0; }), "Long answers must scroll inside the card");
      for (const style of ["professional", "vaporwave"]) for (const theme of ["light", "dark"]) {
        await page.evaluate(({ style, theme }) => { document.documentElement.dataset.style = style; document.documentElement.dataset.theme = theme; }, { style, theme });
        if (width === 390 || width === 820) await capture(`flashcard-${style}-${theme}`);
      }
      await page.evaluate(() => { document.documentElement.dataset.style = "professional"; document.documentElement.dataset.theme = "light"; });
    }
    await page.getByRole("button", { name: "Wiki", exact: true }).click();
    await page.locator(".wiki-article-titlebar h1").waitFor();
    // The compact navigation can be closed while the article is read.
    const topics = page.getByRole("button", { name: "Topics", exact: true });
    if (await topics.isVisible()) {
      await topics.click();
      await capture("wiki-topics");
      await page.getByRole("dialog", { name: "Wiki topics", exact: true }).getByRole("button", { name: wiki.title, exact: true }).click();
    } else await page.locator(".wiki-left-rail").getByRole("button", { name: wiki.title, exact: true }).click();
    await page.getByRole("heading", { name: wiki.title, exact: true }).waitFor();
    await capture("wiki-article");
    await page.locator(".wiki-study-mode-card").filter({ hasText: "Quiz" }).click();
    await page.getByRole("region", { name: "Wiki practice player" }).waitFor();
    await capture("wiki-quiz");
    if (touch && !baselineOnly) {
      const player = page.locator(".wiki-learning-player");
      const footer = await page.locator(".wiki-player-footer").boundingBox();
      const box = await player.boundingBox();
      assert(footer && box && footer.y + footer.height <= box.y + box.height + 1, "Quiz navigation must stay inside the player");
    }
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const actions = page.locator("summary").filter({ hasText: /^Article actions$/ });
    if (await actions.isVisible()) await actions.click();
    await page.getByRole("button", { name: "Edit source", exact: true }).click();
    await page.getByRole("textbox", { name: "Article source", exact: true }).waitFor();
    await capture("wiki-editor");
    if (touch && !baselineOnly && await page.getByRole("group", { name: "Editor layout", exact: true }).isVisible()) {
      const source = page.getByRole("textbox", { name: "Article source", exact: true });
      const initial = await source.inputValue();
      const draft = initial + "\n\n## Mobile draft\n\nKeep this draft across layout changes.";
      const layout = page.getByRole("group", { name: "Editor layout", exact: true });
      await layout.getByRole("button", { name: "Source", exact: true }).click();
      await source.fill(draft);
      await layout.getByRole("button", { name: "Preview", exact: true }).click();
      await page.getByRole("complementary", { name: "Markdown preview" }).getByText("Keep this draft across layout changes.", { exact: true }).waitFor();
      assert(!await source.isVisible(), "Inactive source pane must not obscure the preview");
      await layout.getByRole("button", { name: "Source", exact: true }).click();
      assert.equal(await source.inputValue(), draft);
      await page.setViewportSize({ width: height, height: width });
      await page.setViewportSize({ width, height });
      assert.equal(await source.inputValue(), draft, "Rotation must keep the unsaved source");
      assert.equal((await app.request(`/api/wiki/${wiki.id}`)).contentMarkdown, wiki.contentMarkdown, "Changing layout must never persist a draft");
    }
    if (!baselineOnly && touch && (width === 390 || width === 820)) {
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.locator(".wiki-page-tabs").getByRole("button", { name: "Study", exact: true }).click();
      await page.getByRole("heading", { name: "Choose your topics", exact: true }).waitFor();
      await capture("wiki-study-builder");
      await page.locator(".wiki-page-tabs").getByRole("button", { name: "Batch import", exact: true }).click();
      await capture("wiki-import");
      await page.locator(".wiki-page-tabs").getByRole("button", { name: "Article", exact: true }).click();
      const actions = page.locator("summary").filter({ hasText: /^Article actions$/ });
      if (await actions.isVisible()) await actions.click();
      await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
      await page.getByRole("textbox", { name: "Article JSON", exact: true }).waitFor();
      await capture("wiki-json");
      for (const module of ["DSA", "System Design"]) {
        await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: module, exact: true }).click();
        await page.getByRole("button", { name: "Add problem", exact: true }).click();
        await capture(module === "DSA" ? "dsa-create" : "system-create");
      }
      await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Flashcards", exact: true }).click();
      await page.getByRole("button", { name: "Add flashcard", exact: true }).click();
      await capture("flashcard-create");
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await page.getByRole("button", { name: "Create learning session", exact: true }).click();
      await capture("session-create");
      await page.getByRole("button", { name: "Open notes companion", exact: true }).click();
      await page.getByRole("complementary", { name: "Global notes", exact: true }).waitFor();
      await capture("notes-companion");
    }
    assert.deepEqual(errors, [], "No uncaught browser errors");
    await context.close();
  }
  await writeFile(path.join(app.root, "report.json"), JSON.stringify(report, null, 2));
  if (!baselineOnly) assert.equal(report.filter(row => row.scroll > row.width + 1 || row.layoutWidth > row.width + 1).length, 0, "Some pages still overflow; see report.json");
  console.log(`Layout screenshots and report: ${app.root}`);
} catch (error) {
  await writeFile(path.join(app.root, "report.json"), JSON.stringify(report, null, 2));
  console.error(`Partial report: ${app.root}`);
  throw error;
} finally { await browser?.close(); await app.close(); }
