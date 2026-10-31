import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(workspace, "src/frontend/repetitio-web");
const root = path.join(workspace, ".artifacts", "practice-editing", String(Date.now()));
await mkdir(root, { recursive: true });
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const site = `http://127.0.0.1:${port}`;
const children = [];
let browser;
function start(executable, args, cwd, env, match) {
  const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(output.slice(-4000))), 120000);
    const receive = chunk => { output += chunk; const result = output.match(match); if (result) { clearTimeout(timeout); resolve(result[1]); } };
    child.stdout.on("data", receive); child.stderr.on("data", receive);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Test service exited (${code}): ${output.slice(-4000)}`)); });
  });
}
try {
  const api = await start("dotnet", [path.join(workspace, "src/backend/Repetitio.Api/bin/Debug/net10.0/Repetitio.Api.dll")], workspace, {
    ASPNETCORE_ENVIRONMENT: "Production", ASPNETCORE_URLS: "http://127.0.0.1:0", Desktop__Enabled: "false",
    ConnectionStrings__Repetitio: `Data Source="${path.join(root, "data", "repetitio.db")}";Pooling=False`, Backup__Directory: path.join(root, "backups"),
    Cors__AllowedOrigins__0: site
  }, /Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/);
  await start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], frontend,
    { VITE_API_BASE_URL: api }, /(http:\/\/127\.0\.0\.1:\d+\/)/);
  async function request(route, body, method = "POST") {
    const response = await fetch(api + route, body ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    assert(response.ok, await response.clone().text());
    return response.json();
  }
  const title = "Practice editing verification";
  const article = await request("/api/wiki/", { title, contentMarkdown: "## Original material\n\nKeep this article unchanged.",
    quizQuestions: [{ prompt: "First question", options: [{ text: "Right answer", isCorrect: true }, { text: "Wrong answer", isCorrect: false }] },
      { prompt: "Second question", options: [{ text: "Second right", isCorrect: true }, { text: "Second wrong", isCorrect: false }] }],
    flashcards: [{ front: "Card prompt", back: "Card answer" }] });
  const problem = await request("/api/dsa/", { title: "Editor verification problem", source: "Local", difficulty: "Easy", tags: ["arrays"] });
  const basics = await request("/api/basics/");
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(site);
  await page.getByText("DB online", { exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Wiki study", exact: true }).count(), 0);

  await page.getByRole("button", { name: "Basics", exact: true }).click();
  await page.getByText(basics[0].title, { exact: true }).click();
  const code = page.getByRole("textbox", { name: "Code", exact: true });
  await code.fill("public class Solution{public int Sum(int a,int b){return a+b;}}");
  await page.getByRole("button", { name: "Format code", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".cm-line").length > 3);
  assert.match(await code.innerText(), /return a \+ b;/);
  await code.fill(basics[0].referenceSolution);
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.getByText("All tests passed", { exact: true }).waitFor({ timeout: 30000 });

  for (const style of ["professional", "vaporwave"]) for (const theme of ["light", "dark"]) {
    await page.evaluate(({ style, theme }) => { document.documentElement.dataset.style = style; document.documentElement.dataset.theme = theme; }, { style, theme });
    await page.locator(".code-workbench").screenshot({ path: path.join(root, `editor-${style}-${theme}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await code.scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Editor must not overflow the mobile page");
  assert(await page.getByRole("button", { name: "Insert {", exact: true }).evaluate(element => element.getBoundingClientRect().width >= 44));
  await page.getByRole("button", { name: "Expand editor", exact: true }).click();
  if (await page.getByRole("button", { name: "Wrap lines", exact: true }).getAttribute("aria-pressed") === "false")
    await page.getByRole("button", { name: "Wrap lines", exact: true }).click();
  const expanded = await page.locator(".code-workbench-expanded").boundingBox();
  await page.screenshot({ path: path.join(root, "editor-phone.png") });
  assert(expanded && Math.abs(expanded.x) <= 1 && Math.abs(expanded.y) <= 1 && expanded.width >= 388, `Expanded mobile editor must fill the viewport: ${JSON.stringify(expanded)}. Screenshots: ${root}`);
  await page.getByRole("button", { name: "Exit expanded editor", exact: true }).click();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.locator(".code-workbench").screenshot({ path: path.join(root, "editor-tablet.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "DSA", exact: true }).click();
  await page.getByText(problem.title, { exact: true }).click();
  const dsaCode = page.getByRole("textbox", { name: "Source code", exact: true });
  await dsaCode.fill("public int Answer(){return 42;}");
  await page.getByRole("button", { name: "Format code", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".cm-content")?.textContent.includes("return 42;"));
  await page.locator(".code-workbench").screenshot({ path: path.join(root, "editor-dsa.png") });

  await page.getByRole("button", { name: "Wiki", exact: true }).click();
  await page.getByRole("textbox", { name: "Search topic tree", exact: true }).fill(title);
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await page.locator(".wiki-study-mode-card").filter({ hasText: "Quiz" }).click();
  const player = page.getByRole("region", { name: "Wiki practice player", exact: true });
  await player.getByRole("button", { name: "A Right answer", exact: true }).click();
  await player.getByRole("button", { name: "Next check", exact: true }).click();
  await player.getByRole("button", { name: "Edit this check", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Question", exact: true }).fill("Clearer second question");
  assert.equal((await request(`/api/wiki/${article.id}`)).quizQuestions[1].prompt, "Second question", "Editing is only a draft until confirmed");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await player.getByRole("heading", { name: "Clearer second question", exact: true }).waitFor();
  assert.match(await player.innerText(), /1 \/ 2 answered/);
  await player.getByRole("button", { name: "A Second right", exact: true }).click();
  await player.getByRole("button", { name: "Previous check", exact: true }).click();
  await player.getByRole("button", { name: "Delete this check", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal((await request(`/api/wiki/${article.id}`)).quizQuestions.length, 2);
  await player.getByRole("button", { name: "Delete this check", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.match(await player.innerText(), /1 \/ 1 answered/);
  await player.screenshot({ path: path.join(root, "wiki-quiz.png") });
  await player.getByRole("button", { name: "Save results", exact: true }).click();
  await player.getByRole("button", { name: "Back to topics", exact: true }).click();
  await page.locator(".wiki-study-mode-card").filter({ hasText: "Flashcards" }).click();
  await player.getByRole("button", { name: "Edit this check", exact: true }).click();
  await page.getByRole("textbox", { name: "Back", exact: true }).fill("Improved card answer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await player.getByRole("button", { name: /Card prompt/ }).click();
  await player.getByText("Improved card answer", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await player.getByRole("button", { name: "Delete this check", exact: true }).click();
  await page.getByRole("dialog").screenshot({ path: path.join(root, "wiki-delete-phone.png") });
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await player.getByRole("heading", { name: "No checks remaining", exact: true }).waitFor();
  const saved = await request(`/api/wiki/${article.id}`);
  assert.equal(saved.contentMarkdown, article.contentMarkdown);
  assert.equal(saved.quizQuestions.length, 1);
  assert.equal(saved.quizQuestions[0].prompt, "Clearer second question");
  assert.equal(saved.flashcards.length, 0);
  assert.equal((await request("/api/wiki/study")).history.length, 1);
  const backup = await fetch(api + "/api/backup/export");
  assert(backup.ok);
  const archive = new File([await backup.arrayBuffer()], "verification.zip", { type: "application/zip" });
  const form = new FormData(); form.append("file", archive);
  const restored = await fetch(api + "/api/backup/import", { method: "POST", body: form });
  assert(restored.ok, await restored.clone().text());
  assert.deepEqual(await request(`/api/wiki/${article.id}`), saved);
  assert.equal((await request("/api/wiki/study")).history.length, 1);
  assert.deepEqual(errors, []);
  console.log(`Verified Basics/DSA formatting and execution, all themes, desktop/tablet/phone layout, confirmed in-player edits/deletes, retained answers and backup round-trip. Screenshots: ${root}`);
} finally {
  await browser?.close();
  for (const child of children.reverse()) if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
}
