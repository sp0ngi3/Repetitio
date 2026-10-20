import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { openAsBlob, createReadStream, createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = path.resolve(process.argv[2] || "");
assert(archive.startsWith(path.join(workspace, ".artifacts") + path.sep), "Only disposable test backups may be used");
assert((await stat(archive)).size > 128 * 1024 * 1024, "Use a backup exceeding both old request limits");
const root = path.join(workspace, ".artifacts", "backup-api-verification", String(Date.now()));
await mkdir(root, { recursive: true });
const runtime = path.join(workspace, "artifacts/windows/resources/runtime");
const dotnet = path.join(runtime, "dotnet/dotnet.exe"), api = path.join(runtime, "api/Repetitio.Api.dll");
const reservation = createServer();
const standardPort = await new Promise(resolve => {
  reservation.once("error", () => resolve(false));
  reservation.listen(8080, "127.0.0.1", () => reservation.close(() => resolve(true)));
});
const env = { ...process.env, ASPNETCORE_ENVIRONMENT: "Production", ASPNETCORE_URLS: `http://127.0.0.1:${standardPort ? 8080 : 0}`, Desktop__Enabled: "false",
  ConnectionStrings__Repetitio: `Data Source="${path.join(root, "data/repetitio.db")}";Pooling=False`, Backup__Directory: path.join(root, "backups") };
let child;
async function hash(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
async function command(args) {
  const process = spawn(dotnet, [api, ...args], { env, windowsHide: true, stdio: "ignore" });
  const [code] = await once(process, "exit");
  return code;
}
try {
  child = spawn(dotnet, [api], { cwd: path.dirname(api), env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const origin = await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(output.slice(-5000))), 120000);
    const receive = chunk => {
      output = (output + chunk).slice(-12000);
      const match = output.match(/Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    };
    child.stdout.on("data", receive); child.stderr.on("data", receive);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`API exited (${code}): ${output}`)); });
  });
  if (standardPort) assert.equal(await command(["--health-check"]), 0);
  const before = await hash(archive);
  for (const route of ["validate", "import"]) {
    const form = new FormData(); form.append("file", await openAsBlob(archive), "existing-compatible-backup.zip");
    const response = await fetch(`${origin}/api/backup/${route}`, { method: "POST", body: form });
    const text = await response.text();
    assert.equal(response.status, 200, text.slice(0, 2000));
    if (route === "import") assert.equal(JSON.parse(text).imported, true);
  }
  const output = path.join(root, "round-trip.zip");
  const response = await fetch(origin + "/api/backup/export");
  assert.equal(response.status, 200);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(output, { flags: "wx" }));
  assert((await stat(output)).size > 128 * 1024 * 1024);
  assert.equal(await hash(archive), before);
  assert((await readdir(path.join(root, "backups"))).some(name => name.includes("pre-import")));
  const restored = path.join(root, "offline/data/repetitio.db");
  assert.equal(await command(["--desktop-restore-backup", output, "--desktop-copy-output", restored]), 0);
  assert((await stat(restored)).size > 128 * 1024 * 1024);
  console.log("Verified Docker-mode API validation/import/export beyond 128 MB, unchanged source ZIP, safety copy, offline restore, and packaged health-check CLI.");
} finally {
  if (child?.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
}
