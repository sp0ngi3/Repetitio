const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { importBackupFile } = require("../backup.cjs");

test("native backup upload uses the existing file field and requires an explicit success result", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "repetitio-backup-"));
  const file = path.join(directory, "backup.zip");
  try {
    await fs.writeFile(file, "existing ZIP bytes");
    const backend = { request: async (route, options) => {
      assert.equal(route, "/api/backup/import");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("file").name, "backup.zip");
      assert.equal(await options.body.get("file").text(), "existing ZIP bytes");
      return Response.json({ imported: true, message: "Backup imported successfully." });
    } };
    assert.equal((await importBackupFile(backend, file)).imported, true);
    assert.equal(await fs.readFile(file, "utf8"), "existing ZIP bytes");
    for (const [status, body, message] of [
      [413, "", "HTTP 413"],
      [400, JSON.stringify({ validation: { message: "Invalid SQLite database." } }), "Invalid SQLite database"],
      [200, JSON.stringify({ imported: false, message: "Import rejected." }), "Import rejected"],
      [200, "not an import result", "HTTP 200"]
    ]) {
      await assert.rejects(importBackupFile({ request: async () => new Response(body, { status }) }, file), new RegExp(message));
    }
  } finally { await fs.rm(file, { force: true }); await fs.rmdir(directory); }
});
