const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { dataPaths, backendEnvironment } = require("../runtime.cjs");
const { ORIGIN, isAppUrl, safeAssetPath, createProtocolHandler } = require("../protocol.cjs");

test("release folders never control durable data paths or browser preferences", () => {
  const data = dataPaths(path.join(os.tmpdir(), "repetitio-desktop-test"));
  const env = backendEnvironment({ dotnet: "C:\\App\\dotnet\\dotnet.exe" }, data, "a".repeat(64), 123);
  assert.equal(env.Backup__Directory, data.backups);
  assert.equal(env.Desktop__Token, "a".repeat(64));
  assert.equal(env.Desktop__ParentProcessId, "123");
  assert.equal(env.ASPNETCORE_URLS, "http://127.0.0.1:0");
  assert.equal(env.DOTNET_MULTILEVEL_LOOKUP, "0");
  assert(env.ConnectionStrings__Repetitio.includes(data.database));
  assert(data.browser.startsWith(data.root));
});

test("only the fixed application origin can receive local API privileges", () => {
  assert(isAppUrl(ORIGIN + "/api/backup/export"));
  for (const url of ["https://app", "repetitio://attacker/api/health", "repetitio://app:80", "repetitio://user@app", "javascript:alert(1)", "about:blank"]) assert(!isAppUrl(url), url);
});

test("asset paths cannot escape the bundled frontend", () => {
  const root = path.join(os.tmpdir(), "frontend");
  assert.equal(safeAssetPath(root, "/"), path.join(root, "index.html"));
  assert.equal(safeAssetPath(root, "/assets/code.js"), path.join(root, "assets", "code.js"));
  for (const value of ["/../database.db", "/%2e%2e/database.db", "/%5c..%5cprivate.db", "/C:%5cdata", "/%00file"]) assert.throws(() => safeAssetPath(root, value));
});

test("protocol serves local assets with CSP and refuses unknown files and methods", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "repetitio-protocol-"));
  try {
    await fs.writeFile(path.join(root, "index.html"), "<h1>Repetitio</h1>");
    const handler = createProtocolHandler(root, path.join(root, "index.html"), () => null);
    const response = await handler(new Request(ORIGIN + "/"));
    assert.equal(await response.text(), "<h1>Repetitio</h1>");
    assert(response.headers.get("content-security-policy").includes("script-src 'self'"));
    assert.equal((await handler(new Request(ORIGIN + "/missing"))).status, 404);
    assert.equal((await handler(new Request(ORIGIN + "/", { method: "POST" }))).status, 405);
    assert.equal((await handler(new Request("repetitio://evil/api/health"))).status, 403);
    assert.equal((await handler(new Request(ORIGIN + "/api/health"))).status, 503);
  } finally { await fs.rm(root, { recursive: true }); }
});

test("multipart requests and backup downloads stay streaming through the API bridge", async () => {
  const body = "multipart screenshot bytes";
  const backend = { origin: "http://127.0.0.1:1234", request: async (route, options) => {
    assert.equal(route, "/api/wiki/images?test=1");
    assert.equal(options.duplex, "half");
    assert.equal(await new Response(options.body).text(), body);
    return new Response("zip bytes", { headers: { "Content-Type": "application/zip" } });
  } };
  const handler = createProtocolHandler("unused", "unused", () => backend);
  const result = await handler(new Request(ORIGIN + "/api/wiki/images?test=1", { method: "POST", body }));
  assert.equal(await result.text(), "zip bytes");
});
