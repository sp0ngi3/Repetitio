import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const api = "http://localhost:5190";
const url = "http://localhost:5174";
const output = new URL("../.artifacts/wiki-verification/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await mkdir(output, { recursive: true });
async function json(path, body, method = "POST") {
  const response = await fetch(api + path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert(response.ok, await response.clone().text());
  return response.json();
}
const question = index => ({ prompt: `Question ${index}: which operation is correct?`, options: [
  { text: "The correct operation", isCorrect: true }, { text: "An incorrect operation", isCorrect: false }
] });
const rootTitle = "CompTIA study guide " + Date.now();
const result = await json("/api/wiki/batch", { pages: [{ title: rootTitle, summary: "A long reference article for browser verification.",
  contentMarkdown: Array.from({ length: 65 }, (_, index) => `## Topic ${index + 1}\n\n${("A useful definition with a concrete example and its tradeoffs. ").repeat(70)}\n\n### Detail ${index + 1}\n\n- Requirement\n- Tradeoff\n\n\
\`\`\`csharp\nvar topic = ${index};\n\`\`\``).join("\n\n"),
  quizQuestions: [question(1), question(2), question(3)],
  flashcards: [{ front: "What is a load balancer?", back: "It distributes requests across backend instances." }, { front: "What is redundancy?", back: "Additional components that keep the system available." }],
  children: [{ title: "Networking", quizQuestions: [question(4)] }]
}] });
const rootId = result.rootPages[0].id;
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto(url);
  await page.getByRole("button", { name: "Wiki", exact: true }).click();
  await page.getByRole("textbox", { name: "Search topic tree" }).fill(rootTitle);
  await page.getByRole("button", { name: rootTitle, exact: true }).first().click();
  await page.getByRole("heading", { name: rootTitle, exact: true }).waitFor();
  const toc = page.locator(".wiki-page-contents nav");
  assert(await toc.evaluate(element => element.scrollHeight > element.clientHeight), "Contents must have its own scroll area");
  await toc.evaluate(element => { element.scrollTop = element.scrollHeight; });
  assert(await toc.evaluate(element => element.scrollTop > 0), "Contents can scroll");
  await page.screenshot({ path: output + "/article-light.png" });
  await page.getByRole("button", { name: "Edit source" }).click();
  const editor = page.getByRole("textbox", { name: "Article source" });
  await editor.evaluate(element => { element.scrollTop = (element.scrollHeight - element.clientHeight) * 0.5; element.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await page.waitForTimeout(120);
  const ratios = await page.evaluate(() => {
    const source = document.querySelector(".wiki-source-textarea");
    const preview = document.querySelector(".wiki-preview-scroll");
    return [source.scrollTop / (source.scrollHeight - source.clientHeight), preview.scrollTop / (preview.scrollHeight - preview.clientHeight)];
  });
  assert(Math.abs(ratios[0] - ratios[1]) < 0.02, "Editor and preview scroll together");
  await page.screenshot({ path: output + "/editor-light.png" });
  await page.getByRole("button", { name: "Save article", exact: true }).click();
  await page.getByRole("heading", { name: rootTitle, exact: true }).waitFor();
  const updated = await (await fetch(api + "/api/wiki/" + rootId)).json();
  assert.equal(updated.quizQuestions[0].id, result.rootPages[0].quizQuestions[0].id, "Editing article preserves check identities");
  await page.locator(".wiki-page-contents").getByRole("link", { name: "Knowledge checks" }).click();
  await page.getByRole("button", { name: "Quiz 3 questions" }).click();
  assert.equal(await page.locator(".wiki-learning-player .wiki-player-body h3").count(), 1);
  await page.getByRole("button", { name: "A The correct operation" }).click();
  await page.getByRole("button", { name: "Next check" }).click();
  await page.getByRole("button", { name: "B An incorrect operation" }).click();
  await page.getByRole("button", { name: "Save results", exact: true }).click();
  await page.getByRole("heading", { name: "Results saved", exact: true }).waitFor();
  const overview = await (await fetch(api + "/api/wiki/study")).json();
  const progress = overview.pages.find(topic => topic.id === rootId).modes.find(mode => mode.kind === "quiz");
  assert.equal(progress.covered, 2);
  assert.equal(progress.correct, 1);
  assert.equal(progress.lastCompletedAt, null);
  await page.screenshot({ path: output + "/practice-results.png" });
  await page.getByRole("button", { name: "Study", exact: true }).click();
  await page.getByRole("button", { name: "All in order" }).click();
  await page.getByRole("heading", { name: rootTitle, exact: true }).waitFor();
  await page.screenshot({ path: output + "/builder-player-light.png" });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.waitForTimeout(300);
  const quizColors = await page.locator(".wiki-learning-player .wiki-quiz-options button").first().evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }));
  console.log("Dark quiz colors:", quizColors);
  assert.notEqual(quizColors.background, "rgb(255, 255, 255)", "Dark quiz options must have a dark surface");
  await page.screenshot({ path: output + "/builder-player-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".wiki-learning-player").scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/mobile-dark.png" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "No mobile horizontal overflow");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Reviews", exact: true }).click();
  await page.getByRole("button", { name: "In progress", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(rootTitle + ".*Quiz.*2 / 3 covered") }).waitFor();
  await page.screenshot({ path: output + "/reviews-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const wikiOverview = page.getByRole("region", { name: "Wiki study", exact: true });
  await wikiOverview.getByLabel("Find a Wiki topic").fill(rootTitle);
  await wikiOverview.getByRole("button", { name: "Needs practice", exact: true }).click();
  await wikiOverview.getByText("Quiz · 2 / 3 covered · 1 correct").waitFor();
  await wikiOverview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/overview-desktop-dark.png" });
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await page.waitForTimeout(300);
  await page.screenshot({ path: output + "/overview-desktop-light.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await wikiOverview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/overview-mobile-light.png" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "Overview has no mobile overflow");
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.waitForTimeout(300);
  await page.screenshot({ path: output + "/overview-mobile-dark.png" });
  await wikiOverview.getByRole("button", { name: `Practice ${rootTitle} Quiz`, exact: true }).click();
  await page.getByRole("region", { name: "Wiki practice player" }).waitFor();
  assert.equal(await page.locator(".wiki-player-body h3").count(), 1, "Overview opens the quiz player directly");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await wikiOverview.getByLabel("Find a Wiki topic").fill(rootTitle);
  await wikiOverview.getByRole("button", { name: "Never practiced", exact: true }).click();
  await wikiOverview.getByRole("button", { name: `Practice ${rootTitle} Flashcards`, exact: true }).click();
  await page.getByRole("button", { name: /Prompt What is a load balancer/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Verified: scrollable contents, synchronized preview, stable check IDs, one-at-a-time quiz, per-page results, study builder, dark/mobile layouts, review queue, Overview progress and direct quiz/flashcard practice links.");
} catch (error) {
  console.log((await page.locator("body").innerText()).slice(0, 2000));
  console.log(errors);
  await page.screenshot({ path: output + "/failure.png" });
  throw error;
} finally { await browser.close(); }
