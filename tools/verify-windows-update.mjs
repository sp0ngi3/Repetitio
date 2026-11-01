import { createRequire } from "node:module";
import { mkdir, readFile, readdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const { _electron } = createRequire(import.meta.url)("playwright");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(workspace, "artifacts");
const release = JSON.parse((await readFile(path.join(output, "release.json"), "utf8")).replace(/^\uFEFF/, ""));
const previousVersion = process.argv.find(argument => argument.startsWith("--previous-version="))?.split("=")[1];
const previousFolders = (await readdir(path.join(workspace, ".artifacts", "desktop")))
  .filter(name => name.startsWith("previous-")).sort().reverse();
let previousExe;
for (const name of previousFolders) {
  if (previousVersion) {
    const manifestPath = path.join(workspace, ".artifacts", "desktop", name, "release.json");
    if (!await access(manifestPath).then(() => true, () => false)) continue;
    const manifest = JSON.parse((await readFile(manifestPath, "utf8")).replace(/^\uFEFF/, ""));
    if (manifest.version !== previousVersion) continue;
  }
  const candidate = path.join(workspace, ".artifacts", "desktop", name, "windows", "Repetitio.exe");
  if (await access(candidate).then(() => true, () => false)) { previousExe = candidate; break; }
}
assert(previousExe, "A previous packaged build must be retained before testing an upgrade");
const newExe = path.join(output, "windows", "Repetitio.exe");
const root = path.join(workspace, ".artifacts", "update-verification", String(Date.now()));
await mkdir(root, { recursive: true });
const env = { ...process.env, REPETITIO_DESKTOP_TEST: "1", REPETITIO_DESKTOP_DATA: root,
  PATH: path.join(process.env.SystemRoot || "C:\\Windows", "System32") };
for (const key of ["REPETITIO_DESKTOP_RUNTIME", "REPETITIO_DESKTOP_TEST_SOURCE", "REPETITIO_DESKTOP_TEST_BACKUP"]) delete env[key];
let application;
async function launch(exe) {
  application = await _electron.launch({ executablePath: exe, args: ["--verify-desktop"], env, timeout: 120000 });
  const page = await application.firstWindow();
  await page.getByRole("navigation", { name: "Primary navigation" }).waitFor({ timeout: 120000 });
  await page.getByText("DB online", { exact: true }).waitFor();
  // In particular, the previous binary has no guard against parallel initial catalog seeding.
  await page.getByText(/^Basics\s*[1-9]\d*$/, { exact: true }).waitFor();
  return page;
}
async function api(page, route, body) {
  return page.evaluate(async ({ route, body }) => {
    const response = await fetch(route, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status} ${await response.text()}`);
    return response.json();
  }, { route, body });
}
try {
  const oldPage = await launch(previousExe);
  const oldBasics = await api(oldPage, "/api/basics/");
  const oldBasic = oldBasics.find(item => item.slug === "reverse-linked-list");
  assert(oldBasic);
  const oldAttempt = await api(oldPage, "/api/practice/", { learningItemId: oldBasic.learningItemId,
    outcome: "Completed", confidence: 4, notes: "Retain my old Basics history", sourceCode: oldBasic.referenceSolution });
  const oldDsa = await api(oldPage, "/api/dsa/", { title: "Keep my legacy DSA checklist", difficulty: "Easy" });
  const oldDsaAttempt = await api(oldPage, "/api/practice/", { learningItemId: oldDsa.id, outcome: "Partial",
    clarifiedRequirements: true, testedSolution: true, notes: "Keep my legacy checklist" });
  const wiki = await api(oldPage, "/api/wiki/", { title: "Preserve this page during upgrades", contentMarkdown: "## Saved content\n\nExisting notes must survive.",
    flashcards: [{ front: "Persistent question", back: "Persistent answer" }] });
  await api(oldPage, "/api/wiki/study", { id: crypto.randomUUID(), answers: [{ pageId: wiki.id, itemId: wiki.flashcards[0].id, kind: "flashcard", knew: true }] });
  const oldBackup = await oldPage.evaluate(async () => {
    const response = await fetch("/api/backup/export");
    if (!response.ok) throw new Error(await response.text());
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  await oldPage.evaluate(async () => {
    localStorage.setItem("repetitio.update-test", "keep my preferences");
    const cache = await caches.open("old-interface-cache");
    await cache.put("https://example.com/old-interface", new Response("stale interface"));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("update-test", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("preferences");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("preferences", "readwrite");
        transaction.objectStore("preferences").put("keep indexed data", "sentinel");
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await application.close(); application = null;
  const oldBackups = await readdir(path.join(root, "backups"));
  assert(oldBackups.length > 0);
  const page = await launch(newExe);
  const currentBuild = await page.evaluate(async () => (await fetch("/__desktop/version")).json());
  assert.equal(currentBuild.id, release.id);
  assert.equal(currentBuild.version, release.version);
  assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()), `Repetitio ${release.version}`);
  assert.equal(new URL(page.url()).searchParams.get("desktopBuild"), release.id);
  assert.equal(await page.evaluate(() => localStorage.getItem("repetitio.update-test")), "keep my preferences");
  assert(!(await page.evaluate(() => caches.keys())).includes("old-interface-cache"), "Stale interface caches must be removed");
  assert.equal(await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("update-test", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const query = database.transaction("preferences").objectStore("preferences").get("sentinel");
      query.onsuccess = () => { database.close(); resolve(query.result); };
      query.onerror = () => reject(query.error);
    };
  })), "keep indexed data");
  const restored = await api(page, "/api/wiki/" + wiki.id);
  assert.equal(restored.contentMarkdown, wiki.contentMarkdown);
  assert.equal(restored.flashcards[0].id, wiki.flashcards[0].id);
  assert((await api(page, "/api/wiki/study")).pages.some(item => item.id === wiki.id && item.modes.some(mode => mode.correct === 1)));
  async function verifyBasics() {
    const basic = await api(page, "/api/basics/" + oldBasic.slug);
    assert.equal(basic.learningItemId, oldBasic.learningItemId);
    assert(basic.practiceSessions.some(attempt => attempt.id === oldAttempt.id && attempt.notes === "Retain my old Basics history"));
    const matrices = (await api(page, "/api/basics/")).filter(item => item.tags.includes("matrix"));
    assert.equal(matrices.length, 4);
    for (const exercise of matrices) {
      assert.equal(exercise.totalAttempts, 0);
      const result = await api(page, `/api/basics/${exercise.slug}/execute`, { sourceCode: exercise.referenceSolution });
      assert(result.compiled && result.passed, JSON.stringify(result));
    }
  }
  await verifyBasics();
  // Import an actual archive from the previous packaged release into this disposable profile.
  const imported = await page.evaluate(async bytes => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/zip" }), "previous-version.zip");
    const response = await fetch("/api/backup/import", { method: "POST", body: form });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }, oldBackup);
  assert(imported.imported);
  await verifyBasics();
  assert.equal((await api(page, "/api/wiki/" + wiki.id)).flashcards[0].id, wiki.flashcards[0].id);
  const legacyDsa = (await api(page, `/api/dsa/${oldDsa.id}`)).practiceSessions.find(attempt => attempt.id === oldDsaAttempt.id);
  assert(legacyDsa.clarifiedRequirements && legacyDsa.testedSolution);
  assert.equal(legacyDsa.interviewReview, null);
  const review = { restatedProblem: true, talkedThroughCode: true, testedEdgeCases: true, communication: 4, coding: 3 };
  const detailed = await api(page, "/api/practice/", { learningItemId: oldDsa.id, outcome: "Completed", interviewReview: review });
  assert.equal(detailed.interviewReview.communication, 4);
  const savedDetailed = (await api(page, `/api/dsa/${oldDsa.id}`)).practiceSessions.find(attempt => attempt.id === detailed.id);
  assert(savedDetailed.interviewReview.restatedProblem && savedDetailed.interviewReview.talkedThroughCode && savedDetailed.interviewReview.testedEdgeCases);
  assert.equal(savedDetailed.interviewReview.coding, 3);
  assert.equal(savedDetailed.interviewReview.speed, null);
  const retainedBackups = await readdir(path.join(root, "backups"));
  if (previousVersion === "0.3.11") assert(retainedBackups.some(file => file.includes("pre-migration")), "The old database must be backed up before adding the review column");
  for (const file of oldBackups) assert(retainedBackups.includes(file), "Existing backups must stay in place during an upgrade");
  const closed = application.waitForEvent("close", { timeout: 120000 });
  const helper = spawn(newExe, ["--prepare-update"], { env, windowsHide: true, stdio: "ignore" });
  assert.equal(await new Promise(resolve => helper.once("exit", resolve)), 0);
  await closed;
  application = null;
  assert((await readdir(path.join(root, "backups"))).some(file => file.includes("auto-shutdown")));
  console.log(`Verified upgrade to ${release.version}: current bundled UI, cache refresh, preserved Wiki/study IDs, Basics history and legacy DSA checklists, localStorage, IndexedDB and backups; previous-release backup import, detailed DSA reviews, all four matrix exercises on the private runtime, and graceful installer shutdown.`);
} finally { if (application) await application.close(); }
