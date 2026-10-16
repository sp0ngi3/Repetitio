const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

async function readBuildInfo(runtime, version, packaged) {
  let info;
  try { info = JSON.parse((await fs.readFile(path.join(runtime.root, "build-info.json"), "utf8")).replace(/^\uFEFF/, "")); }
  catch (error) {
    if (!packaged && error.code === "ENOENT") return { version, id: "development", builtAt: null };
    throw new Error("The Windows package has no valid build information. Rebuild or reinstall the complete application.", { cause: error });
  }
  if (!info.id || !info.version || (packaged && info.version !== version)) throw new Error("The launcher and bundled application versions do not match. Reinstall the complete application.");
  for (const [file, expected] of [[path.join(runtime.frontend, "index.html"), info.frontendSha256], [runtime.api, info.apiSha256]]) {
    const actual = createHash("sha256").update(await fs.readFile(file)).digest("hex");
    if (!expected || actual !== expected.toLowerCase()) throw new Error("The Windows package contains mismatched application files. Reinstall the complete application.");
  }
  return info;
}

async function refreshRendererCache(session, build, markerFile, log) {
  let previous;
  try { previous = JSON.parse(await fs.readFile(markerFile, "utf8")); }
  catch (error) { if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error; }
  if (previous?.id === build.id) return;
  await session.clearCache();
  await session.clearCodeCaches({});
  // Only disposable caches: never clear localStorage, IndexedDB, cookies, or the database.
  await session.clearStorageData({ storages: ["serviceworkers", "cachestorage"] });
  log(`Renderer cache refreshed for build ${build.id}. User preferences retained.\n`);
}

async function recordLoadedBuild(build, markerFile) {
  const temporary = markerFile + ".pending";
  await fs.writeFile(temporary, JSON.stringify(build));
  await fs.rename(temporary, markerFile);
}

module.exports = { readBuildInfo, refreshRendererCache, recordLoadedBuild };
