const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { streamRequest } = require("./streamRequest.cjs");

const TOKEN_HEADER = "X-Repetitio-Desktop-Token";
const copyProcesses = new Set();
process.on("exit", () => { for (const child of copyProcesses) if (child.exitCode === null) child.kill(); });

function dataPaths(root) {
  root = path.resolve(root);
  return { root, database: path.join(root, "data", "repetitio.db"), backups: path.join(root, "backups"),
    logs: path.join(root, "logs"), browser: path.join(root, "browser") };
}

function runtimePaths(root) {
  return { root, dotnet: path.join(root, "dotnet", "dotnet.exe"), api: path.join(root, "api", "Repetitio.Api.dll"), frontend: path.join(root, "frontend") };
}

function backendEnvironment(runtime, data, token, parentId = process.pid) {
  return { ...process.env, ASPNETCORE_ENVIRONMENT: "Production", ASPNETCORE_URLS: "http://127.0.0.1:0",
    ConnectionStrings__Repetitio: `Data Source="${data.database.replaceAll('"', '""')}"`, Backup__Directory: data.backups,
    Desktop__Enabled: "true", Desktop__Token: token, Desktop__ParentProcessId: String(parentId),
    DOTNET_ROOT: path.dirname(runtime.dotnet), DOTNET_MULTILEVEL_LOOKUP: "0", DOTNET_CLI_TELEMETRY_OPTOUT: "1",
    PATH: path.dirname(runtime.dotnet) + path.delimiter + (process.env.PATH || "") };
}

function runCopy(runtime, source, destination, log) {
  return runDataCommand(runtime, "--desktop-copy-database", source, destination, log);
}

function runRestore(runtime, source, destination, log) {
  return runDataCommand(runtime, "--desktop-restore-backup", source, destination, log);
}

function runDataCommand(runtime, command, source, destination, log) {
  return new Promise((resolve, reject) => {
    const child = spawn(runtime.dotnet, [runtime.api, command, source, "--desktop-copy-output", destination],
      { cwd: path.dirname(runtime.api), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    copyProcesses.add(child);
    let output = "";
    const receive = chunk => { output = (output + chunk.toString()).slice(-12000); log(chunk.toString()); };
    child.stdout.on("data", receive); child.stderr.on("data", receive);
    child.on("error", error => { copyProcesses.delete(child); reject(error); });
    child.on("exit", code => { copyProcesses.delete(child); code === 0 ? resolve() : reject(new Error(output || `Database copy failed (${code}).`)); });
  });
}

class Backend {
  constructor(runtime, data, log) { this.runtime = runtime; this.data = data; this.log = log; this.token = randomBytes(32).toString("hex"); this.child = null; this.origin = null; this.pendingBackups = new Set(); }
  async start() {
    for (const file of [this.runtime.dotnet, this.runtime.api, path.join(this.runtime.frontend, "index.html")])
      if (!fs.existsSync(file)) throw new Error(`The Windows package is incomplete: ${file}. Reinstall the complete release.`);
    this.child = spawn(this.runtime.dotnet, [this.runtime.api], { cwd: path.dirname(this.runtime.api), windowsHide: true,
      env: backendEnvironment(this.runtime, this.data, this.token), stdio: ["ignore", "pipe", "pipe"] });
    const address = await new Promise((resolve, reject) => {
      let tail = "", settled = false;
      const finish = (error, url) => { if (settled) return; settled = true; error ? reject(error) : resolve(url); };
      const receive = chunk => {
        const text = chunk.toString(); this.log(text); tail = (tail + text).slice(-16000);
        const match = tail.match(/Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) finish(null, match[1]);
      };
      this.child.stdout.on("data", receive); this.child.stderr.on("data", receive);
      this.child.once("error", error => finish(error));
      this.child.once("exit", code => finish(new Error(`The local API exited (${code}).\n${tail}`)));
    });
    this.origin = address;
    const response = await this.request("/api/health");
    if (!response.ok) throw new Error(`API health check failed (${response.status}).`);
    return this;
  }
  request(route, options = {}) {
    if (!this.origin || !route.startsWith("/") || route.startsWith("//")) throw new Error("Invalid local API request.");
    const headers = new Headers(options.headers); headers.set(TOKEN_HEADER, this.token);
    if (!route.startsWith("/api/backup/")) return fetch(this.origin + route, { ...options, headers, redirect: "error" });
    const request = streamRequest(this.origin + route, { ...options, headers });
    this.pendingBackups.add(request);
    const remove = () => this.pendingBackups.delete(request);
    request.then(remove, remove);
    return request;
  }
  async waitForPendingBackups() { await Promise.allSettled([...this.pendingBackups]); }
  async stop() {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise(resolve => child.once("exit", resolve));
    if (this.origin) {
      try { await this.request("/api/desktop/shutdown", { method: "POST", signal: AbortSignal.timeout(5000) }); } catch { }
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 8000))]);
    }
    if (child.exitCode === null) { child.kill(); await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]); }
  }
}

module.exports = { TOKEN_HEADER, dataPaths, runtimePaths, backendEnvironment, runCopy, runRestore, Backend };
