import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

export const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function startBrowserTestApp(suite) {
  const root = path.join(workspace, ".artifacts", suite, String(Date.now()));
  await mkdir(root, { recursive: true });
  const database = path.join(root, "data", "repetitio.db");
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const site = `http://127.0.0.1:${port}`;
  const children = [];
  async function close() {
    for (const child of children.reverse()) if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  }
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
      ConnectionStrings__Repetitio: `Data Source="${database}";Pooling=False`, Backup__Directory: path.join(root, "backups"), Cors__AllowedOrigins__0: site
    }, /Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/);
    await start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)],
      process.env.REPETITIO_TEST_FRONTEND || path.join(workspace, "src/frontend/repetitio-web"), { VITE_API_BASE_URL: api }, /(http:\/\/127\.0\.0\.1:\d+\/)/);
    async function request(route, body, method = "POST") {
      const response = await fetch(api + route, body ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
      assert(response.ok, await response.clone().text());
      return response.json();
    }
    return { root, site, api, database, request, close };
  } catch (error) { await close(); throw error; }
}
