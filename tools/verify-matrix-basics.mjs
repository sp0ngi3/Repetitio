import { createRequire } from "node:module";
import { strict as assert } from "node:assert";
import path from "node:path";
import { startBrowserTestApp } from "./browser-test-app.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const app = await startBrowserTestApp("matrix-basics");
let browser;
try {
  // Seed once before dev StrictMode mounts the app.
  const exercises = await app.request("/api/basics/");
  const matrices = exercises.filter(item => item.tags.includes("matrix"));
  assert.equal(matrices.length, 4);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(app.site);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Basics", exact: true }).click();
  for (const exercise of matrices) {
    await page.getByRole("textbox", { name: "Search", exact: true }).fill(exercise.title);
    await page.getByRole("button", { name: exercise.title, exact: true }).click();
    await page.getByRole("textbox", { name: "Code", exact: true }).fill(exercise.referenceSolution);
    await page.getByRole("button", { name: "Run tests", exact: true }).click();
    await page.getByText("All tests passed", { exact: true }).waitFor({ timeout: 30000 });
    assert.equal((await app.request(`/api/basics/${exercise.slug}`)).totalAttempts, 0, "Running code must not record a completion");
    await page.getByRole("button", { name: "Mark completed", exact: true }).click();
    await page.getByRole("button", { name: "Mark completed", exact: true }).waitFor();
    await page.locator(".basics-completion-stats dd").filter({ hasText: "1" }).waitFor();
    const saved = await app.request(`/api/basics/${exercise.slug}`);
    assert.equal(saved.totalAttempts, 1);
    assert.equal(saved.successfulAttempts, 1);
    assert.equal(saved.practiceSessions[0].sourceCode, exercise.referenceSolution);
    assert(saved.lastPracticedAt);
    await page.screenshot({ path: path.join(app.root, `${exercise.slug}.png`), fullPage: true });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    console.log(`${exercise.title}: searchable, runnable and recorded in history`);
  }
  const legacy = (await app.request("/api/basics/")).find(item => item.slug === "reverse-linked-list");
  assert.equal(legacy.totalAttempts, 0);
  assert.deepEqual(errors, []);
  console.log(`Matrix Basics UI verified on disposable data. Screenshots: ${app.root}`);
} finally { if (browser) await browser.close(); await app.close(); }
