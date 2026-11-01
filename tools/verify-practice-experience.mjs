import { createRequire } from "node:module";
import { strict as assert } from "node:assert";
import path from "node:path";
import { startBrowserTestApp } from "./browser-test-app.mjs";

const { chromium, webkit, devices } = createRequire(import.meta.url)("playwright");
const app = await startBrowserTestApp("practice-experience");
const browsers = [];
try {
  const exercises = await app.request("/api/basics/");
  const exercise = exercises.find(item => item.slug === "matrix-read-and-update");
  const dsa = await app.request("/api/dsa/", { title: "Interview review verification", difficulty: "Easy" });
  await app.request("/api/practice/", { learningItemId: dsa.id, outcome: "Partial", clarifiedRequirements: true,
    testedSolution: true, notes: "Retain this legacy review", sourceCode: "// saved legacy code" });
  const desktop = await chromium.launch({ channel: "msedge", headless: true }); browsers.push(desktop);
  const safari = await webkit.launch({ headless: true }); browsers.push(safari);
  for (const [width, height, touch] of [[1440, 1000, false], [1180, 820, true], [390, 844, true], [320, 640, true]]) {
    const context = await (touch ? safari : desktop).newContext({ ...(touch ? devices[width > 1000 ? "iPad Pro 11" : "iPhone 13"] : {}),
      viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(app.site);
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await nav.getByRole("button", { name: "Basics", exact: true }).click();
    const search = page.getByRole("textbox", { name: "Search", exact: true });
    await search.fill(exercise.title);
    await page.getByRole("button", { name: exercise.title, exact: true }).click();
    for (const name of ["Outcome", "Confidence", "Duration minutes", "Next review", "Notes", "What helped", "What was difficult", "Improve next"])
      assert.equal(await page.getByLabel(name, { exact: true }).count(), 0, `Basics must not contain ${name}`);
    const initial = (await app.request(`/api/basics/${exercise.slug}`)).successfulAttempts;
    await page.getByRole("button", { name: "Mark completed", exact: true }).click();
    await page.locator(".basics-completion-stats dd").filter({ hasText: String(initial + 1) }).waitFor();
    const savedBasic = await app.request(`/api/basics/${exercise.slug}`);
    assert.equal(savedBasic.successfulAttempts, initial + 1);
    assert(savedBasic.lastPracticedAt);
    assert.equal(savedBasic.practiceSessions[0].outcome, "Completed");
    await page.screenshot({ path: path.join(app.root, `${width}-basics.png`), fullPage: true });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await search.fill("");
    await page.getByRole("combobox", { name: "Practice activity" }).selectOption("never");
    assert.equal(await page.getByRole("button", { name: exercise.title, exact: true }).count(), 0);
    await page.getByRole("combobox", { name: "Practice activity" }).selectOption("30");
    assert.equal(await page.getByRole("button", { name: exercise.title, exact: true }).count(), 0);
    await nav.getByRole("button", { name: "DSA", exact: true }).click();
    await page.getByText(dsa.title, { exact: true }).click();
    const card = page.getByRole("region", { name: "Interview scorecard", exact: true }).filter({ has: page.getByRole("checkbox").first() });
    assert.equal(await card.getByRole("checkbox").count(), 13);
    await card.getByRole("checkbox", { name: "Restated the problem in my own words" }).check();
    await card.getByRole("checkbox", { name: "Used meaningful variable names" }).check();
    await card.getByRole("checkbox", { name: "Tested edge cases manually" }).check();
    await card.getByRole("button", { name: "Communication: 4 of 5", exact: true }).click();
    await card.getByRole("button", { name: "Coding: 3 of 5", exact: true }).click();
    for (const style of ["professional", "vaporwave"]) for (const theme of ["light", "dark"]) {
      await page.evaluate(({ style, theme }) => { document.documentElement.dataset.style = style; document.documentElement.dataset.theme = theme; }, { style, theme });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${style}/${theme} page overflow`);
      await card.screenshot({ path: path.join(app.root, `${width}-scorecard-${style}-${theme}.png`) });
    }
    await page.getByRole("button", { name: "Save attempt", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.interview-scorecard:not(.readonly) input:checked').length === 0);
    await page.locator(".attempt-history-entry .readonly").first().waitFor({ state: "attached" });
    const problem = await app.request(`/api/dsa/${dsa.id}`);
    const saved = problem.practiceSessions[0];
    assert.equal(saved.interviewReview.restatedProblem, true);
    assert.equal(saved.interviewReview.meaningfulNames, true);
    assert.equal(saved.interviewReview.testedEdgeCases, true);
    assert.equal(saved.interviewReview.communication, 4);
    assert.equal(saved.interviewReview.coding, 3);
    assert.equal(saved.interviewReview.speed, null);
    assert.equal(saved.testedSolution, true, "The old summary flags remain available to shared consumers");
    const legacy = problem.practiceSessions.find(attempt => attempt.notes === "Retain this legacy review");
    assert.equal(legacy.interviewReview, null);
    assert(legacy.clarifiedRequirements && legacy.testedSolution);
    assert.equal(legacy.sourceCode, "// saved legacy code");
    assert.equal(await card.getByRole("checkbox", { checked: true }).count(), 0, "A new attempt starts with an empty checklist");
    await page.locator(".attempt-history-entry").first().locator("summary").first().click();
    await page.locator(".attempt-history-entry .readonly").first().screenshot({ path: path.join(app.root, `${width}-history.png`) });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${width}: simplified Basics, filters, DSA checklist/ratings, history, all themes and no page overflow passed`);
  }
  console.log(`Practice UI verified on isolated data. Screenshots: ${app.root}`);
} finally { for (const browser of browsers) await browser.close(); await app.close(); }
