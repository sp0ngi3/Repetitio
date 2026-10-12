const fs = require("node:fs");
const path = require("node:path");

async function importBackupFile(backend, file) {
  const form = new FormData();
  form.append("file", await fs.openAsBlob(file), path.basename(file));
  const response = await backend.request("/api/backup/import", { method: "POST", body: form });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { }
  if (!response.ok || result?.imported !== true) {
    const detail = result?.validation?.message || result?.message || (text && !text.trim().startsWith("<") ? text : response.statusText);
    throw new Error(`Backup import failed (HTTP ${response.status}): ${detail || "The server returned no error details. Open the logs folder for details."}`);
  }
  return result;
}

module.exports = { importBackupFile };
