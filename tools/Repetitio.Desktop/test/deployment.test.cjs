const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { readBuildInfo, refreshRendererCache, recordLoadedBuild } = require("../deployment.cjs");

test("updates clear only disposable caches and retain user storage", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "repetitio-update-"));
  const marker = path.join(directory, "loaded-build.json");
  const calls = [];
  const session = { clearCache: async () => calls.push("http"), clearCodeCaches: async () => calls.push("code"),
    clearStorageData: async options => calls.push(options.storages) };
  try {
    const build = { version: "0.2.0", id: "new-build" };
    await refreshRendererCache(session, build, marker, () => {});
    assert.deepEqual(calls, ["http", "code", ["serviceworkers", "cachestorage"]]);
    await assert.rejects(fs.stat(marker), { code: "ENOENT" });
    await recordLoadedBuild(build, marker);
    calls.length = 0;
    await refreshRendererCache(session, build, marker, () => {});
    assert.deepEqual(calls, []);
    await refreshRendererCache(session, { ...build, id: "another-build-with-the-same-version" }, marker, () => {});
    assert.equal(calls.length, 3);
    await fs.writeFile(marker, "broken marker");
    calls.length = 0;
    await refreshRendererCache(session, build, marker, () => {});
    assert.equal(calls.length, 3);
  } finally { await fs.rm(directory, { recursive: true }); }
});

test("packaged launcher rejects missing, mismatched or mixed build files", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "repetitio-build-"));
  const runtime = { root: directory, frontend: directory, api: path.join(directory, "api.dll") };
  const hash = text => createHash("sha256").update(text).digest("hex");
  try {
    await assert.rejects(readBuildInfo(runtime, "0.2.0", true), /build information/);
    assert.equal((await readBuildInfo(runtime, "0.2.0", false)).id, "development");
    await fs.writeFile(path.join(directory, "index.html"), "new frontend");
    await fs.writeFile(runtime.api, "new API");
    const info = { version: "0.2.0", id: "build-a", frontendSha256: hash("new frontend"), apiSha256: hash("new API") };
    await fs.writeFile(path.join(directory, "build-info.json"), JSON.stringify(info));
    assert.deepEqual(await readBuildInfo(runtime, "0.2.0", true), info);
    assert.deepEqual(await readBuildInfo(runtime, "0.1.0", false), info);
    await assert.rejects(readBuildInfo(runtime, "0.1.1", true), /versions do not match/);
    await fs.writeFile(path.join(directory, "index.html"), "stale frontend");
    await assert.rejects(readBuildInfo(runtime, "0.2.0", true), /mismatched application files/);
  } finally { await fs.rm(directory, { recursive: true }); }
});
