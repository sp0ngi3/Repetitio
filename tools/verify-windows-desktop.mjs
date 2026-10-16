import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, copyFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const require = createRequire(import.meta.url);
const { _electron } = require("playwright");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktop = path.join(workspace, "tools", "Repetitio.Desktop");
const artifacts = path.join(workspace, ".artifacts", "desktop-verification", String(Date.now()));
await mkdir(artifacts, { recursive: true });
const stageDirectories = await Promise.all((await readdir(path.join(workspace, ".artifacts", "desktop"))).filter(name => name.startsWith("stage-"))
  .map(async name => ({ name, time: (await stat(path.join(workspace, ".artifacts", "desktop", name))).mtimeMs })));
const runtime = path.join(workspace, ".artifacts", "desktop", stageDirectories.sort((a, b) => a.time - b.time).at(-1).name);
const executableArg = process.argv.indexOf("--executable");
const executable = executableArg >= 0 ? path.resolve(process.argv[executableArg + 1]) : path.join(desktop, "node_modules", "electron", "dist", "electron.exe");
const args = executableArg >= 0 ? ["--verify-desktop"] : [desktop, "--verify-desktop"];
let application;
const errors = [];
const screenshots = !process.argv.includes("--large-backup") && !process.argv.includes("--no-screenshots");
async function launch(root, source, backup) {
  const env = { ...process.env, REPETITIO_DESKTOP_TEST: "1", REPETITIO_DESKTOP_DATA: root,
    // No machine-wide dotnet command: Basics must execute using the private bundled runtime.
    PATH: path.join(process.env.SystemRoot || "C:\\Windows", "System32") };
  if (executableArg < 0) env.REPETITIO_DESKTOP_RUNTIME = runtime;
  else delete env.REPETITIO_DESKTOP_RUNTIME;
  if (source) env.REPETITIO_DESKTOP_TEST_SOURCE = source;
  else delete env.REPETITIO_DESKTOP_TEST_SOURCE;
  if (backup) env.REPETITIO_DESKTOP_TEST_BACKUP = backup;
  else delete env.REPETITIO_DESKTOP_TEST_BACKUP;
  application = await _electron.launch({ executablePath: executable, args, cwd: desktop, env, timeout: 120000 });
  await application.context().addInitScript(() => { window.print = () => { window.__printed = true; }; });
  const page = await application.firstWindow();
  page.on("pageerror", error => errors.push(error.message));
  await page.getByRole("navigation", { name: "Primary navigation" }).waitFor({ timeout: 120000 });
  await page.getByText("DB online", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => location.origin), "repetitio://app");
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  assert.equal(await page.evaluate(() => typeof window.process), "undefined");
  assert(await page.evaluate(() => window.isSecureContext));
  const ready = JSON.parse(await readFile(path.join(root, "test-ready.json"), "utf8"));
  const loaded = await page.evaluate(async () => (await fetch("/__desktop/version")).json());
  assert.equal(loaded.id, ready.build.id);
  assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()), `Repetitio ${loaded.version}`);
  assert.equal((await fetch(ready.origin + "/api/health")).status, 401, "Local API requires a private credential");
  assert.equal((await fetch(ready.origin + "/api/desktop/shutdown", { method: "POST" })).status, 401);
  return { page, ready, env };
}
async function api(page, route, body, method) {
  return page.evaluate(async ({ route, body, method }) => {
    const response = await fetch(route, body ? { method: method || "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    if (!response.ok) throw new Error(await response.text()); return response.json();
  }, { route, body, method });
}
const sourceRoot = path.join(artifacts, "source");
const copiedRoot = path.join(artifacts, "windows-copy");
try {
  const { page, ready, env } = await launch(sourceRoot);
  const image = await page.evaluate(async () => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvbkAAAAASUVORK5CYII="), c => c.charCodeAt(0));
    const form = new FormData(); form.append("file", new Blob([bytes], { type: "image/png" }), "existing-image.png");
    const response = await fetch("/api/wiki/images", { method: "POST", body: form });
    if (!response.ok) throw new Error(await response.text()); return response.json();
  });
  const title = "Desktop verification: Events";
  const wiki = await api(page, "/api/wiki/", { title, contentMarkdown: `## Contract\n\n:::definition Delegate\n\nA shared signature.\n\n:::\n\n![Existing image](wiki-image:${image.id})\n\n## Flow\n\n\`\`\`mermaid\nflowchart LR\n    Publisher --> Event\n    Event --> Subscriber\n\`\`\``,
    quizQuestions: [{ prompt: "What decouples subscribers?", options: [{ text: "The contract", isCorrect: true }, { text: "Their concrete classes", isCorrect: false }] }],
    flashcards: [{ front: "What is a delegate?", back: "A shared method signature." }], sources: [{ title: "Desktop source", type: "Book" }] });
  await api(page, "/api/wiki/study", { id: crypto.randomUUID(), answers: [{ pageId: wiki.id, itemId: wiki.quizQuestions[0].id, kind: "quiz", optionId: wiki.quizQuestions[0].options.find(option => option.isCorrect).id }] });
  const basics = await api(page, "/api/basics/");
  const executableExercise = basics.find(item => item.slug.includes("kadane")) ?? basics.find(item => item.slug === "reverse-linked-list");
  assert(executableExercise, "An executable Basics exercise must be available");
  const detail = await api(page, "/api/basics/" + executableExercise.slug);
  const execution = await api(page, "/api/basics/" + detail.slug + "/execute", { sourceCode: detail.referenceSolution, timeoutMs: 5000 });
  assert(execution.compiled && execution.passed, JSON.stringify(execution));
  console.log("Private-runtime Basics execution passed.");
  await page.getByRole("button", { name: "Wiki", exact: true }).click();
  await page.getByRole("textbox", { name: "Search topic tree" }).fill(title);
  await page.getByRole("button", { name: title, exact: true }).first().click();
  await page.locator(".wiki-diagram-svg svg").waitFor({ timeout: 60000 });
  assert(await page.locator(".official-wiki-content img").first().evaluate(img => img.complete && img.naturalWidth > 0));
  if (screenshots) await page.screenshot({ path: path.join(artifacts, "native-wiki.png"), timeout: 60000 });
  console.log("Wiki image and Mermaid rendered.");
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  await page.getByRole("button", { name: "Copy JSON", exact: true }).click();
  await page.getByRole("button", { name: "JSON copied", exact: true }).waitFor();
  console.log("Clipboard write passed.");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const popup = await popupPromise;
  await popup.locator(".print-article").waitFor();
  assert((await popup.locator(".print-article").textContent()).includes(title));
  await popup.close();
  console.log("PDF popup passed.");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "Vaporwave", exact: true }).check();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  if (process.argv.includes("--large-backup")) {
    const { DatabaseSync } = await import("node:sqlite");
    assert(ready.database.startsWith(artifacts), "Large backup fixtures only affect the disposable database");
    const database = new DatabaseSync(ready.database);
    try {
      database.exec("CREATE TABLE DesktopLargeBackup (Contents BLOB)");
      database.prepare("INSERT INTO DesktopLargeBackup VALUES (?)").run(randomBytes(144 * 1024 * 1024));
    } finally { database.close(); }
  }
  await page.getByRole("button", { name: "Export Data", exact: true }).click();
  let downloaded;
  for (let attempt = 0; attempt < 300; attempt++) {
    const files = await readdir(path.join(sourceRoot, "downloads")).catch(() => []);
    downloaded = files.find(file => file.endsWith(".zip"));
    if (downloaded) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(downloaded, "The native download manager writes the exported ZIP");
  await copyFile(path.join(sourceRoot, "downloads", downloaded), path.join(artifacts, "export.zip"));
  assert((await stat(path.join(artifacts, "export.zip"))).size > 1000);
  if (process.argv.includes("--large-backup")) assert((await stat(path.join(artifacts, "export.zip"))).size > 128 * 1024 * 1024, "Import must exceed both the old request cap and the default multipart cap");
  const second = spawn(executable, args, { cwd: desktop, env, windowsHide: true, stdio: "ignore" });
  assert.equal(await new Promise(resolve => second.once("exit", resolve)), 0, "Second instance should focus the first one");
  await application.close(); application = null;
  const automatic = (await readdir(path.join(sourceRoot, "backups"))).filter(name => name.includes("auto-shutdown"));
  assert(automatic.length > 0, "Closing the app creates the existing automatic backup");
  const originalDatabase = ready.database;
  const originalHash = createHash("sha256").update(await readFile(originalDatabase)).digest("hex");
  const relaunched = await launch(sourceRoot);
  assert.equal(await relaunched.page.evaluate(() => document.documentElement.dataset.style), "vaporwave");
  assert.equal(await relaunched.page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await application.close(); application = null;
  const finalSourceHash = createHash("sha256").update(await readFile(originalDatabase)).digest("hex");
  const copied = await launch(copiedRoot, originalDatabase);
  const restored = await api(copied.page, "/api/wiki/" + wiki.id);
  assert.equal(restored.contentMarkdown, wiki.contentMarkdown);
  assert.equal(restored.quizQuestions[0].id, wiki.quizQuestions[0].id);
  assert.equal(restored.sources[0].id, wiki.sources[0].id);
  assert.equal(restored.flashcards[0].id, wiki.flashcards[0].id);
  const progress = await api(copied.page, "/api/wiki/study");
  assert(progress.pages.some(item => item.id === wiki.id && item.modes.some(mode => mode.correct === 1)), "Wiki study history is retained");
  assert.equal(createHash("sha256").update(await readFile(originalDatabase)).digest("hex"), finalSourceHash, "Copy leaves the original database unchanged");
  assert(originalHash.length === 64);
  await copied.page.getByRole("button", { name: "Settings", exact: true }).click();
  await copied.page.getByRole("button", { name: "Import Data", exact: true }).waitFor();
  const importInput = copied.page.locator('input[type="file"][accept*="zip"]');
  await importInput.setInputFiles(path.join(artifacts, "export.zip"));
  await copied.page.getByRole("button", { name: "Import Data", exact: true }).click();
  await copied.page.getByText(/Import completed|Imported|successfully/i).first().waitFor();
  assert.equal((await api(copied.page, "/api/wiki/" + wiki.id)).quizQuestions[0].id, wiki.quizQuestions[0].id);
  if (screenshots) await copied.page.screenshot({ path: path.join(artifacts, "native-settings.png"), timeout: 60000 });
  await application.close(); application = null;
  const importedRoot = path.join(artifacts, "first-run-import");
  const backupFile = path.join(artifacts, "export.zip");
  const backupHash = createHash("sha256").update(await readFile(backupFile)).digest("hex");
  const firstRun = await launch(importedRoot, undefined, backupFile);
  const importedWiki = await api(firstRun.page, "/api/wiki/" + wiki.id);
  assert.equal(importedWiki.contentMarkdown, wiki.contentMarkdown);
  assert.equal(importedWiki.flashcards[0].id, wiki.flashcards[0].id);
  const importedImage = await firstRun.page.evaluate(async id => {
    const response = await fetch(`/api/wiki/images/${id}`);
    return { status: response.status, bytes: (await response.arrayBuffer()).byteLength };
  }, image.id);
  assert.equal(importedImage.status, 200);
  assert(importedImage.bytes > 0);
  if (process.argv.includes("--large-backup")) {
    const { DatabaseSync } = await import("node:sqlite");
    const restoredDatabase = new DatabaseSync(firstRun.ready.database, { readOnly: true });
    try { assert.equal(restoredDatabase.prepare("SELECT length(Contents) AS bytes FROM DesktopLargeBackup").get().bytes, 144 * 1024 * 1024); }
    finally { restoredDatabase.close(); }
  }
  assert((await api(firstRun.page, "/api/wiki/study")).pages.some(item => item.id === wiki.id && item.modes.some(mode => mode.correct === 1)));
  assert((await readdir(path.join(importedRoot, "backups"))).some(name => name.includes("pre-import")));
  assert(!(await readdir(importedRoot)).includes("pending-import.json"));
  assert.equal(createHash("sha256").update(await readFile(backupFile)).digest("hex"), backupHash, "Import never modifies the source ZIP");
  console.log("First-run ZIP import retained Wiki content, image bytes, study results and safety backup.");
  assert.deepEqual(errors, [], "Native renderer has no JavaScript exceptions");
  console.log("Verified native UI, private .NET execution, protected loopback API, image upload, Mermaid, clipboard, PDF window, exports/imports, single instance, automatic backup, fixed-origin preferences and lossless database copy.");
} catch (error) {
  console.error("Native errors:", errors);
  if (application && screenshots) { const page = await application.firstWindow(); await page.screenshot({ path: path.join(artifacts, "failure.png"), timeout: 10000 }).catch(() => {}); }
  throw error;
} finally { if (application) await application.close(); }
