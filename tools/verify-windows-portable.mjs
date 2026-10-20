import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exe = path.join(workspace, "artifacts", "Repetitio.exe");
const data = path.join(workspace, ".artifacts", "portable-verification", String(Date.now()));
await mkdir(data, { recursive: true });
const server = createServer(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port; await new Promise(resolve => server.close(resolve));
const env = { ...process.env, REPETITIO_DESKTOP_DATA: data, REPETITIO_DESKTOP_TEST: "1", PATH: path.join(process.env.SystemRoot || "C:\\Windows", "System32") };
delete env.REPETITIO_DESKTOP_RUNTIME;
const launcher = spawn(exe, ["--verify-desktop", `--remote-debugging-port=${port}`], { windowsHide: true, env, stdio: "ignore" });
const exited = new Promise(resolve => launcher.once("exit", resolve));
let browser;
try {
  let ready;
  for (let attempt = 0; attempt < 1200; attempt++) {
    ready = await readFile(path.join(data, "test-ready.json"), "utf8").catch(() => null);
    const error = await readFile(path.join(data, "test-error.txt"), "utf8").catch(() => null);
    if (error) throw new Error(error);
    if (ready) break;
    if (launcher.exitCode !== null) throw new Error(`Portable launcher exited before startup (${launcher.exitCode}).`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, "Portable EXE must self-extract and start its API without installed dotnet");
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];
  await page.getByRole("navigation", { name: "Primary navigation" }).waitFor();
  await page.getByText("DB online", { exact: true }).waitFor();
  assert.equal(await page.getByTestId("app-version").innerText(), `v${JSON.parse(ready).build.version}`);
  assert.equal(await page.evaluate(() => location.origin), "repetitio://app");
  assert.equal((await fetch(JSON.parse(ready).origin + "/api/health")).status, 401);
  await page.evaluate(() => window.close());
  let closeTimer;
  try {
    assert.equal(await Promise.race([exited, new Promise(resolve => { closeTimer = setTimeout(() => resolve("timeout"), 30000); })]), 0);
  } finally { clearTimeout(closeTimer); }
  assert((await readdir(path.join(data, "backups"))).some(name => name.includes("auto-shutdown")));
  console.log("Verified Portable EXE self-extraction, native UI, private runtime startup, protected API, graceful close and automatic backup.");
} finally { await browser?.close(); if (launcher.exitCode === null) launcher.kill(); }
