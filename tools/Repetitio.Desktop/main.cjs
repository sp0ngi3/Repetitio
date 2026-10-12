const { app, BrowserWindow, Menu, dialog, protocol, session, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { randomUUID } = require("node:crypto");
const { Backend, dataPaths, runtimePaths, runCopy } = require("./runtime.cjs");
const { ORIGIN, isAppUrl, createProtocolHandler } = require("./protocol.cjs");
const { importBackupFile } = require("./backup.cjs");

protocol.registerSchemesAsPrivileged([{ scheme: "repetitio", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.setName("Repetitio");
const data = dataPaths(process.env.REPETITIO_DESKTOP_DATA || path.join(process.env.LOCALAPPDATA || app.getPath("appData"), "Repetitio"));
fs.mkdirSync(data.browser, { recursive: true });
app.setPath("userData", data.browser);
const developmentRuntime = path.join(__dirname, "..", "..", "artifacts", "windows", "resources", "runtime");
const runtime = runtimePaths(process.env.REPETITIO_DESKTOP_RUNTIME || (app.isPackaged ? path.join(process.resourcesPath, "runtime") : developmentRuntime));
let backend, window, allowQuit = false, shuttingDown = false, logFile;
const testMode = process.env.REPETITIO_DESKTOP_TEST === "1" && process.argv.includes("--verify-desktop");
const log = value => { try { if (logFile) fs.appendFileSync(logFile, String(value)); } catch { /* A logging failure must not abort database operations. */ } };
const preferences = { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false };

if (!app.requestSingleInstanceLock()) app.exit(0);
else {
  app.on("second-instance", () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", event => {
    if (allowQuit) return;
    event.preventDefault();
    if (shuttingDown) return;
    shuttingDown = true;
    void shutdown();
  });
  process.on("exit", () => { if (backend?.child?.exitCode === null) backend.child.kill(); });
  app.whenReady().then(start).catch(fail);
}

function secureWindow(win) {
  win.webContents.on("will-attach-webview", event => event.preventDefault());
  win.webContents.on("will-navigate", (event, target) => {
    if (isAppUrl(target)) return;
    event.preventDefault(); void openExternal(target);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === "about:blank") return { action: "allow", overrideBrowserWindowOptions: { width: 1100, height: 800, show: !testMode, webPreferences: preferences } };
    void openExternal(url); return { action: "deny" };
  });
  win.webContents.on("did-create-window", child => secureWindow(child));
}

async function openExternal(value) {
  try { const url = new URL(value); if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) await shell.openExternal(url.href); } catch { }
}

async function start() {
  for (const folder of [data.root, path.dirname(data.database), data.backups, data.logs, data.browser]) await fsp.mkdir(folder, { recursive: true });
  logFile = path.join(data.logs, `desktop-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`);
  log(`Repetitio ${app.getVersion()}\nData: ${data.database}\n`);
  session.defaultSession.protocol.handle("repetitio", createProtocolHandler(runtime.frontend, path.join(__dirname, "ui", "startup.html"), () => backend));
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(isAppUrl(contents.getURL()) && ["clipboard-read", "clipboard-sanitized-write"].includes(permission)));
  session.defaultSession.setPermissionCheckHandler((contents, permission, origin) => isAppUrl(origin) && ["clipboard-read", "clipboard-sanitized-write"].includes(permission));
  window = new BrowserWindow({ width: 1440, height: 1000, minWidth: 800, minHeight: 600, show: false,
    icon: path.join(__dirname, "assets", "icon.ico"), title: "Repetitio", backgroundColor: "#121718", webPreferences: preferences });
  secureWindow(window);
  window.on("close", event => { if (!allowQuit) { event.preventDefault(); app.quit(); } });
  if (testMode) session.defaultSession.on("will-download", (_event, item) => {
    const folder = path.join(data.root, "downloads"); fs.mkdirSync(folder, { recursive: true });
    item.setSavePath(path.join(folder, path.basename(item.getFilename())));
  });
  window.once("ready-to-show", () => { if (!testMode) window.show(); });
  await window.loadURL(ORIGIN + "/__desktop/startup");
  window.setProgressBar(2);
  const backupToImport = await prepareData();
  if (backupToImport === false) { allowQuit = true; app.quit(); return; }
  backend = new Backend(runtime, data, log);
  await backend.start();
  backend.child.on("exit", code => { if (!shuttingDown) void fail(new Error(`The local API stopped (${code}). Your database remains in ${data.root}.`)); });
  if (backupToImport) {
    await importBackupFile(backend, backupToImport);
    await fsp.rm(path.join(data.root, "pending-import.json"), { force: true });
  }
  installMenu();
  await window.loadURL(ORIGIN + "/");
  window.setProgressBar(-1);
  if (testMode) {
    await fsp.writeFile(path.join(data.root, "test-ready.json"), JSON.stringify({ origin: backend.origin, pid: backend.child.pid, database: data.database }));
  }
}

async function prepareData() {
  const pending = path.join(data.root, "pending-import.json");
  if (testMode && process.env.REPETITIO_DESKTOP_TEST_BACKUP) {
    const file = process.env.REPETITIO_DESKTOP_TEST_BACKUP;
    await fsp.writeFile(pending, JSON.stringify({ file }));
    return file;
  }
  if (fs.existsSync(pending)) {
    const previous = JSON.parse(await fsp.readFile(pending, "utf8"));
    const selected = await dialog.showOpenDialog(window, { title: "Choose the backup to finish the pending import", defaultPath: previous.file,
      filters: [{ name: "Repetitio backup", extensions: ["zip"] }], properties: ["openFile"] });
    if (selected.canceled) return false;
    await fsp.writeFile(pending, JSON.stringify({ file: selected.filePaths[0] }));
    return selected.filePaths[0];
  }
  if (fs.existsSync(data.database)) return null;
  if (testMode) {
    if (process.env.REPETITIO_DESKTOP_TEST_SOURCE) await runCopy(runtime, process.env.REPETITIO_DESKTOP_TEST_SOURCE, data.database, log);
    return null;
  }
  const choice = await dialog.showMessageBox(window, { type: "question", title: "Welcome to Repetitio", message: "Choose your Windows data",
    detail: "Windows keeps its own database outside the installation folder. Copy your existing Docker data, import a Repetitio backup, or start a new database. Your original Docker files will not be replaced.",
    buttons: ["Copy Docker data", "Import backup (.zip)", "Start a new database", "Cancel"], defaultId: 0, cancelId: 3 });
  if (choice.response === 3) return false;
  if (choice.response === 2) return null;
  if (choice.response === 1) {
    const selected = await dialog.showOpenDialog(window, { title: "Import Repetitio backup", filters: [{ name: "Repetitio backup", extensions: ["zip"] }], properties: ["openFile"] });
    if (selected.canceled) return false;
    await fsp.writeFile(pending, JSON.stringify({ file: selected.filePaths[0] }));
    return selected.filePaths[0];
  }
  const selected = await dialog.showOpenDialog(window, { title: "Select your Repetitio folder or its data folder", defaultPath: path.join(app.getPath("desktop"), "Repetitio"), properties: ["openDirectory"] });
  if (selected.canceled) return false;
  const folder = selected.filePaths[0];
  const source = [path.join(folder, "data", "repetitio.db"), path.join(folder, "repetitio.db")].find(fs.existsSync);
  if (!source) throw new Error("No repetitio.db was found in this folder or its data subfolder. Original files were not modified.");
  const confirm = await dialog.showMessageBox(window, { type: "warning", title: "Copy Docker data", message: "Stop the Docker application before copying.",
    detail: `A validated SQLite snapshot will be created from:\n${source}\n\nThe original database will stay in place. After copying, Docker and Windows have independent data; use Export/Import to move changes between them.`,
    buttons: ["Docker is stopped - copy data", "Cancel"], defaultId: 1, cancelId: 1 });
  if (confirm.response !== 0) return false;
  await runCopy(runtime, source, data.database, log);
  return null;
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "File", submenu: [{ label: "Export Data...", accelerator: "CmdOrCtrl+Shift+E", click: () => void exportData().catch(failOperation) },
      { label: "Import Backup...", click: () => void importData().catch(failOperation) },
      { label: "Open Data Folder", click: () => void shell.openPath(data.root) }, { label: "Open Logs Folder", click: () => void shell.openPath(data.logs) },
      { type: "separator" }, { role: "quit" }] },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "View", submenu: [{ role: "reload" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }] },
    { label: "Help", submenu: [{ label: "About Repetitio", click: () => void dialog.showMessageBox(window, { title: "Repetitio", message: `Repetitio ${app.getVersion()}`,
      detail: `Windows desktop mode\nDatabase: ${data.database}\nBackups: ${data.backups}\nInstall a newer Setup EXE to update; data stays outside the application folder.` }) }] }
  ]));
}

async function importData() {
  const selected = await dialog.showOpenDialog(window, { title: "Import Repetitio backup", filters: [{ name: "Repetitio backup", extensions: ["zip"] }], properties: ["openFile"] });
  if (selected.canceled) return;
  const confirm = await dialog.showMessageBox(window, { type: "warning", title: "Import backup", message: "Replace the current Windows data with this backup?",
    detail: "The backup is validated first. A safety backup of your current database is saved before replacement. The selected ZIP and your Docker database stay unchanged.",
    buttons: ["Import backup", "Cancel"], defaultId: 1, cancelId: 1 });
  if (confirm.response !== 0) return;
  window.setProgressBar(2);
  try {
    const result = await importBackupFile(backend, selected.filePaths[0]);
    await window.loadURL(ORIGIN + "/");
    await dialog.showMessageBox(window, { title: "Backup imported", message: result.message, detail: `Safety backup: ${result.preImportBackupFileName}` });
  } finally { window.setProgressBar(-1); }
}

async function exportData() {
  const selected = await dialog.showSaveDialog(window, { title: "Export Repetitio Data", defaultPath: `repetitio-backup-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.zip`, filters: [{ name: "Repetitio backup", extensions: ["zip"] }] });
  if (selected.canceled || !selected.filePath) return;
  const response = await backend.request("/api/backup/export", { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(await response.text());
  const temporary = selected.filePath + ".pending-" + randomUUID();
  try { await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary, { flags: "wx" })); await fsp.rename(temporary, selected.filePath); }
  finally { await fsp.rm(temporary, { force: true }); }
}

async function shutdown() {
  try {
    if (backend?.origin && backend.child?.exitCode === null) {
      let retry = true;
      while (retry) {
        retry = false;
        try {
          const response = await backend.request("/api/backup/automatic-shutdown", { method: "POST", signal: AbortSignal.timeout(120000) });
          if (!response.ok) throw new Error(await response.text());
          log("Automatic shutdown backup created.\n");
        } catch (error) {
          log(`Backup failed: ${error.message}\n`);
          if (testMode) break;
          const choice = await dialog.showMessageBox(window, { type: "warning", title: "Automatic backup", message: "The automatic backup could not be created.",
            detail: "Your existing database is still on disk. You can retry, keep the app open, or exit without this additional backup.", buttons: ["Retry", "Keep app open", "Exit without backup"], defaultId: 1, cancelId: 1 });
          if (choice.response === 1) { shuttingDown = false; return; }
          retry = choice.response === 0;
        }
      }
    }
    await backend?.stop();
    allowQuit = true; app.quit();
  } catch (error) { shuttingDown = false; await failOperation(error); }
}

async function failOperation(error) { log(`${error.stack || error}\n`); await dialog.showMessageBox(window, { type: "error", title: "Repetitio", message: error.message }); }
async function fail(error) {
  shuttingDown = true;
  log(`${error.stack || error}\n`);
  if (testMode) { await fsp.writeFile(path.join(data.root, "test-error.txt"), String(error.stack || error)); await backend?.stop(); app.exit(1); return; }
  const choice = await dialog.showMessageBox(window, { type: "error", title: "Repetitio could not start", message: "The Windows application could not start.",
    detail: `${error.message}\n\nYour data was not deleted. Data: ${data.root}\nLog: ${logFile || data.logs}`, buttons: ["Close", "Open data folder"], defaultId: 0 });
  if (choice.response === 1) await shell.openPath(data.root);
  await backend?.stop(); allowQuit = true; app.quit();
}
