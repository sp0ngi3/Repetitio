import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const api = "http://localhost:5190";
const output = new URL("../.artifacts/appearance-verification/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
await mkdir(output, { recursive: true });
async function json(path, body) {
  const response = await fetch(api + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  assert(response.ok, await response.clone().text()); return response.json();
}
const status = await json("/api/backup/status");
assert(status.databasePath.replaceAll("\\", "/").includes("/.artifacts/wiki-verification/preview.db"), "Visual fixtures must never touch the production database");
const dsaTitle = "Appearance QA: Longest substring without repeating characters";
if (!(await json("/api/dsa")).some(problem => problem.title === dsaTitle)) {
  for (const [index, title] of ["Longest substring without repeating characters", "Two Sum", "Validate Binary Search Tree", "Merge K Sorted Lists", "Number of Islands", "Minimum Window Substring"].entries())
    await json("/api/dsa", { title: "Appearance QA: " + title, difficulty: index % 2 ? "Easy" : "Medium", tags: [index % 2 ? "arrays" : "graphs", "interview"], source: "Personal practice", description: "Practice the invariant, clarify constraints, and test edge cases.", problemStatement: "Given a sequence, find the requested result. Explain your assumptions, the correctness argument and the time and space complexity.", testCases: "Empty input; one item; repeated values; large inputs." });
}
if (!(await json("/api/system-design")).some(problem => problem.title === "Appearance QA: Design a rate limiter"))
  for (const title of ["Design a rate limiter", "Design a notification service", "Design a distributed cache"])
    await json("/api/system-design", { title: "Appearance QA: " + title, difficulty: "Medium", tags: ["scalability", "distributed-systems"], source: "Personal practice", promptMarkdown: "## Requirements\n\nDesign a service that remains available under load.\n\n## Constraints\n\nDiscuss latency, consistency and capacity estimates.\n\n## Tradeoffs\n\nExplain the operational cost of each design choice." });
const decks = await json("/api/flashcards/decks");
if (!decks.items.some(deck => deck.name === "Architecture essentials")) {
  const ids = [];
  for (const [title, question, explanation] of [
    ["Load balancing", "What does a load balancer distribute?", "Incoming requests across healthy backend instances."],
    ["Cache invalidation", "Why is cache invalidation difficult?", "Cached values can become stale when the underlying data changes."],
    ["Consistency", "What is eventual consistency?", "Replicas converge when updates stop, without guaranteeing identical values at every instant."],
    ["Horizontal scaling", "What does horizontal scaling add?", "Additional instances rather than more resources in one instance."]
  ]) ids.push((await json("/api/flashcards", { title, question, explanation, difficulty: "Medium", tags: ["system-design", "architecture"] })).id);
  await json("/api/flashcards/decks", { name: "Architecture essentials", description: "Core mechanisms and their tradeoffs.", defaultSessionSize: 4, flashcardIds: ids });
}
if (!(await json("/api/notes")).some(note => note.title === "Interview observations")) await json("/api/notes", { title: "Interview observations", area: "Dsa", contentMarkdown: "## This week's focus\n\nClarify constraints before coding. State the invariant and test boundary cases.\n\n## Improve next\n\nCommunicate tradeoffs while solving, not only at the end." });
const wikiTitle = "Appearance QA: Architecture reference";
const existingWiki = await json("/api/wiki/?search=" + encodeURIComponent(wikiTitle));
const wiki = existingWiki.items.find(item => item.title === wikiTitle) ?? await json("/api/wiki/", { title: wikiTitle, summary: "Mechanisms, terminology and practical tradeoffs.", contentMarkdown: "## Load balancing\n\nA load balancer distributes incoming requests across available backend instances. Health checks prevent traffic from being routed to unhealthy nodes.\n\n:::important Separate routing from storage\n\nThe routing layer chooses a destination; it does not replace the data store.\n\n:::\n\n## Comparing strategies\n\n| Strategy | Strength | Limitation |\n| --- | --- | --- |\n| Round robin | Predictable distribution | Ignores workload differences |\n| Least connections | Accounts for active connections | Requires state tracking |\n\n## Example\n\n```csharp\nvar destination = servers[index % servers.Length];\nindex++;\n```\n\n## Vocabulary\n\n:::definition Affinity\n\nKeeping related requests on the same instance.\n\n:::\n\n" + Array.from({ length: 18 }, (_, i) => `## Operational consideration ${i + 1}\n\nMeasure latency, error rate and traffic volume. Explain the assumptions behind each design choice. Consider how failures affect both users and operators.\n\n- Clarify the requirement.\n- Identify the bottleneck.\n- Compare the tradeoffs.`).join("\n\n"),
  quizQuestions: [{ prompt: "Load balancing: what should health checks prevent?", explanation: "Traffic should not be routed to unhealthy backend instances.", options: [{ text: "Routing requests to unhealthy nodes", isCorrect: true }, { text: "Adding healthy instances", isCorrect: false }, { text: "Measuring request latency", isCorrect: false }, { text: "Distributing incoming requests", isCorrect: false }] }], flashcards: [{ front: "What is affinity in request routing?", back: "Keeping related requests on the same backend instance." }] });

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], audits = [];
page.on("pageerror", error => errors.push(error.message));
const modules = [["overview", "Overview"], ["dsa", "DSA"], ["system-design", "System Design"], ["basics", "Basics"], ["flashcards", "Flashcards"], ["wiki", "Wiki"], ["notes", "Notes"], ["settings", "Settings"]];
async function navigate(id, name) {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name, exact: true }).click();
  await page.locator(`.app-workspace[data-page="${id}"]`).waitFor();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function snapshot(name) {
  await page.screenshot({ path: output + "/" + name + ".png", animations: "disabled" });
  const layout = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
  assert(layout.document <= layout.width + 2, `${name}: horizontal overflow (${layout.document} > ${layout.width})`);
  const contrast = await page.evaluate(() => {
    function rgba(value) { const values = value.match(/[\d.]+/g)?.map(Number); return values?.length >= 3 ? [values[0], values[1], values[2], values[3] ?? 1] : [0, 0, 0, 0]; }
    function bg(element) { if (!element) return [255, 255, 255]; const c = rgba(getComputedStyle(element).backgroundColor), parent = bg(element.parentElement); return c.slice(0, 3).map((x, i) => x * c[3] + parent[i] * (1 - c[3])); }
    function lum(rgb) { return rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); }
    return [...document.querySelectorAll("button,label,p,strong,span,small,h1,h2,h3,th,td,summary,a,legend")].filter(el => el.getClientRects().length && el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0 && !el.closest(":disabled") && [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())).map(el => {
      const c = getComputedStyle(el), a = lum(rgba(c.color)), b = lum(bg(el)), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05), size = parseFloat(c.fontSize), limit = size >= 24 || size >= 18.66 && +c.fontWeight >= 700 ? 3 : 4.5;
      return { text: el.textContent.trim().slice(0, 60), class: el.className, ratio: +ratio.toFixed(2), limit };
    }).filter(item => item.ratio + .03 < item.limit).slice(0, 18);
  });
  audits.push({ name, contrast });
}
try {
  await page.goto("http://localhost:5174");
  for (const style of ["professional", "vaporwave"]) for (const mode of ["light", "dark"]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("settings", "Settings");
    await page.getByRole("radio", { name: style === "professional" ? "Professional" : "Vaporwave", exact: true }).check();
    await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).check();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.style), style);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), mode);
    for (const [id, name] of modules) {
      await navigate(id, name);
      await snapshot(`${style}-${mode}-${id}-desktop`);
      await page.setViewportSize({ width: 390, height: 844 });
      await snapshot(`${style}-${mode}-${id}-mobile`);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await navigate("wiki", "Wiki");
    await page.getByRole("textbox", { name: "Search topic tree" }).fill(wikiTitle);
    await page.getByRole("button", { name: wikiTitle, exact: true }).first().click();
    await page.getByRole("heading", { name: wikiTitle, exact: true }).waitFor();
    await snapshot(`${style}-${mode}-wiki-article`);
    await page.getByRole("button", { name: "Edit source", exact: true }).click();
    await snapshot(`${style}-${mode}-wiki-editor`);
    await page.getByRole("button", { name: "Article", exact: true }).click();
    await page.getByRole("button", { name: "Quiz 1 questions" }).click();
    await page.locator(".wiki-learning-player").scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-wiki-quiz`);
    await page.locator(".wiki-quiz-options").getByRole("button").first().click();
    await snapshot(`${style}-${mode}-wiki-quiz-answer`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".wiki-learning-player").scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-wiki-quiz-mobile`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("system-design", "System Design");
    await page.locator(".record-row").filter({ hasText: "Appearance QA: Design a rate limiter" }).click();
    await snapshot(`${style}-${mode}-system-design-attempt`);
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot(`${style}-${mode}-system-design-attempt-mobile`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("basics", "Basics");
    await page.locator(".record-row").first().click();
    await page.getByRole("textbox", { name: "Source code", exact: true }).fill("// Preserve my Basics draft\nint answer = 42;");
    await page.getByText("Peek solution", { exact: true }).click();
    await snapshot(`${style}-${mode}-basics-editor`);
    await page.getByRole("button", { name: mode === "dark" ? "Switch to light mode" : "Switch to dark mode" }).click();
    assert((await page.getByRole("textbox", { name: "Source code", exact: true }).inputValue()).includes("answer = 42"));
    await page.getByRole("button", { name: mode === "dark" ? "Switch to dark mode" : "Switch to light mode" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot(`${style}-${mode}-basics-editor-mobile`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("flashcards", "Flashcards");
    await page.locator(".flashcard-session-card").filter({ hasText: "Architecture essentials" }).getByRole("button", { name: "Start", exact: true }).click();
    await page.locator(".flashcard-card").waitFor();
    await snapshot(`${style}-${mode}-flashcard-player`);
    await page.getByRole("button", { name: "Flip", exact: true }).click();
    await page.waitForTimeout(500);
    await snapshot(`${style}-${mode}-flashcard-answer`);
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot(`${style}-${mode}-flashcard-answer-mobile`);
    await page.locator(".app-footer").scrollIntoViewIfNeeded();
    await snapshot(`${style}-${mode}-footer-mobile`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await navigate("dsa", "DSA");
    await page.getByRole("button", { name: new RegExp(dsaTitle) }).first().click();
    await snapshot(`${style}-${mode}-dsa-attempt`);
    const code = page.getByRole("textbox", { name: "Source code", exact: true });
    await code.fill("// Theme changes must retain this draft\nint answer = 42;");
    await page.getByRole("button", { name: mode === "dark" ? "Switch to light mode" : "Switch to dark mode" }).click();
    assert((await code.inputValue()).includes("answer = 42"), "Color mode change must retain code drafts");
    await page.getByRole("button", { name: mode === "dark" ? "Switch to dark mode" : "Switch to light mode" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot(`${style}-${mode}-dsa-attempt-mobile`);
  }
  await navigate("settings", "Settings");
  await page.getByRole("combobox", { name: "Motion preference" }).selectOption("system");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).animationName), "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("combobox", { name: "Motion preference" }).selectOption("reduced");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).animationName), "none");
  await page.reload();
  assert.deepEqual(await page.evaluate(() => ({ style: document.documentElement.dataset.style, mode: document.documentElement.dataset.theme, motion: document.documentElement.dataset.motion })), { style: "vaporwave", mode: "dark", motion: "reduced" });
  assert(await page.locator(".app-brand img").evaluate(el => el.complete && el.naturalWidth > 0), "Existing app icon must render");
  assert.deepEqual(errors, []);
  await writeFile(output + "/contrast-audit.json", JSON.stringify(audits, null, 2));
  console.log("Verified four appearance modes across all eight modules on desktop/mobile, Wiki reading/editing/quiz answers, System Design attempts, Basics/DSA draft retention, flashcard flipping, footer, logo, persistence and explicit/device reduced motion.");
  console.log("Contrast findings:", JSON.stringify(audits.filter(item => item.contrast.length)));
  assert.deepEqual(audits.filter(item => item.contrast.length), [], "Visible interface text must meet contrast thresholds");
} catch (error) {
  await page.screenshot({ path: output + "/failure.png" });
  await writeFile(output + "/contrast-audit.json", JSON.stringify(audits, null, 2));
  console.log("Browser errors:", errors);
  console.log((await page.locator("body").innerText()).slice(0, 2600));
  throw error;
} finally { await browser.close(); }
