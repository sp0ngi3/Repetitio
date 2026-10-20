# Repetitio for Windows

Repetitio has two independent launch modes: the original Docker Compose application and a Windows desktop application. The desktop app displays the same built React frontend in Electron and runs the existing ASP.NET Core API locally. It is not a React Native rewrite.

## Install or run

Windows 10/11 x64 is supported. The completed Windows release includes Chromium, the ASP.NET Core API, a private .NET 10 runtime, and SQLite native libraries. The target computer does not need Docker, Node.js, the .NET SDK, NuGet, or a separately installed .NET runtime. Starting an already-built release does not restore packages or rebuild anything. Explicit external actions, such as opening a problem URL or importing a remote image, still need a network connection.

1. Open the `artifacts` folder in the repository.
2. Double-click `Repetitio.exe` to run without installation, or `Repetitio-Setup.exe` to install/update the app for your Windows account. The installed app is available on the desktop and Start menu.
3. On first launch, choose **Copy Docker data**, **Import backup (.zip)**, or **Start a new database**.
4. For a Docker copy, stop the Docker application first, then select your repository folder or its `data` folder. The source file stays in place. The app creates and validates an independent SQLite snapshot, including committed WAL content, before opening the Windows copy.
5. For a ZIP import, select an existing Repetitio backup. It goes through the existing validation/import service and its pre-import safety backup. Failed first-run imports remain pending so reopening the app does not silently bypass the selected backup.

This is an unsigned local build unless you configure code signing. Windows may show a publisher/SmartScreen warning. Signing is not required for the app itself, but distributed public releases should use a trusted signing certificate.

## Your data

The installer and app binaries never own the data directory:

| Item | Location |
| --- | --- |
| SQLite database, including Wiki images | `%LOCALAPPDATA%\Repetitio\data\repetitio.db` |
| Safety and automatic shutdown backups | `%LOCALAPPDATA%\Repetitio\backups` |
| Startup/API logs | `%LOCALAPPDATA%\Repetitio\logs` |
| Theme, local checklists and browser preferences | `%LOCALAPPDATA%\Repetitio\browser` |

**File > Open Data Folder** and **File > Open Logs Folder** open these locations. **File > Export Data** provides a native save dialog, and **File > Import Backup** restores a ZIP with confirmation and a pre-import safety copy. The existing **Settings > Export Data / Import Data** controls also work. If an earlier failed import left an empty Windows database, simply use **File > Import Backup**; do not delete the data folder.

Both portable and installed versions use this durable data directory. "Portable" means the program does not require installation; it does not automatically carry your database inside the EXE. To move to another PC, export a ZIP and import it on the other computer.

Docker and Windows are independent after copying. They do not automatically synchronize. Continue using Docker normally with `docker compose up --build`, or run existing built images with `docker compose up -d --no-build` when a package server is unavailable. The original launcher and Compose files remain available.

The existing backup format is unchanged: `manifest.json` plus `repetitio.db`. Image bytes, attempts, quiz/flashcard identities, Wiki study history, and review settings remain in SQLite and therefore travel with the backup. Browser-local preferences/checklists remain per client, just as they did in the website; they are not added to the database backup format.

Backup upload routes have no application-level size cap in Windows or Docker: Kestrel's request limit is disabled for backup requests and their multipart parsing uses the maximum supported length. ZIP exports, shutdown copies, pre-import copies and pre-migration copies use disk-backed streams instead of allocating the entire archive in a byte array. A complete safety ZIP is flushed and published before live data is replaced; backup names are unique and existing ZIPs are never overwritten. The ZIP/SQLite format and schema are unchanged. Normal backup validation, older-schema upgrades and automatic-shutdown retention remain in place.

Windows backup requests have no artificial two-minute timeout or fetch header deadline; the app waits for an in-progress import/native export before closing. Initial database checking is not stopped merely because a large database takes more than two minutes. A failed shutdown backup explains that the **additional shutdown copy** failed, includes the actual error/status and points to logs; it does not describe the live database as deleted. Retry, keep the app open to export from **File > Export Data**, or explicitly exit without that extra copy. For very large exports, the native **File > Export Data** path streams directly to your chosen file.

There is no promise of infinite storage or protection from every hardware/OS failure. Keep enough free space for the live database, temporary SQLite snapshot/extracted backup and ZIP/safety copies. Do not rely on the only backup living on the same physical disk as the database. Backup upload size is not artificially capped, but a corrupt ZIP or a backup from an unknown/newer schema is rejected without replacing current data.

### Recovery Without the API

If the local API cannot start, choose **Restore backup...** in the startup error dialog, select a Repetitio ZIP, and confirm. Recovery validates the ZIP and stages a checked SQLite copy before moving any existing database files. It retains the previous `.db`, `-wal` and `-shm` under `backups/recovery-original-.../`, leaves the source ZIP unchanged, then restarts normally. These retained files may be corrupt, but are not discarded. A recovery interrupted between file moves leaves a marker that blocks silently creating an empty database; choose Restore again to finish. Existing Docker data is not touched.

### Docker Startup

Compose uses the packaged `dotnet Repetitio.Api.dll --health-check` command and starts the frontend only after the API/database is healthy. It does not install a separate curl package. The frontend retries transient read failures and reloads its initial data when connectivity returns; mutations are not automatically replayed. The existing bind mounts for `data` and `backups` remain unchanged. Apply these changes with a rebuilt Compose application, not by deleting volumes or data folders.

## Updating your own app

**Normal workflow: save your work, double-click `Update-Repetitio-Windows.cmd`, and confirm closing the old app if prompted.** It builds the current source, automatically selects a newer version, starts the installer and verifies that the installed build matches the generated build. Installation starts the new application. There is no need to uninstall first, delete data, clear browser settings, run Docker or remember a version number.

`Build-Repetitio-Windows.cmd` remains available when you only want the finished EXEs without installing. Both workflows use the same build script; `Update-Repetitio-Windows.cmd -Offline` uses cached dependencies. A failed build never starts the installer or replaces the last successful `artifacts` folder. Cancelling installation does not remove your database or backups.

The version is chosen from the source package, last successful output and current installed version. Repeated builds increase the patch number automatically. Explicit `-Version` values must be newer than the last known build. Every build also has a unique ID, even across working directories. The window title and page footer show the running version; hover over the footer version for the build ID. **Help > About Repetitio** shows the build ID and actual executable path so an old portable copy is distinguishable from the installed app. The frontend version is embedded during packaging and matches the Windows build rather than the development package version.

On a changed build, startup clears only HTTP/code caches, service workers and Cache Storage. It does not clear localStorage, IndexedDB, cookies, browser preferences, SQLite or backups. The frontend origin stays `repetitio://app`. Launcher version, frontend entry point and API hashes are checked against the packaged build manifest before opening the app; a mixed/incomplete package is rejected instead of silently showing mismatched code.

The installer asks the existing app to close normally and create its shutdown backup. It waits before replacing files and never uses force-kill as a fallback. If the old app cannot respond (including releases that predate graceful-update support), save and close it manually, wait for the backup, then click **Retry**. If you keep it open or cancel, installation stops. A silent installation returns a failure rather than killing the app. Save unfinished editor changes first: a database backup cannot capture unsaved form text.

The stable application ID and the external data directory preserve your database, backups and browser preferences. No online auto-updater is enabled; installing updates is explicit and works with a local installer file.

The API reuses existing migrations and the pre-migration safety backup. Desktop startup refuses unknown/newer database schemas before applying migrations. An older EXE is not a database rollback tool. To recover older data, use a validated compatible backup and retain the newer data separately.

Uninstalling the program does not delete `%LOCALAPPDATA%\Repetitio`. Do not manually delete this folder unless you intend to erase your Windows data.

## Build with one click

The build computer needs the .NET 10 SDK, Node/npm, and dependencies. The target computer only needs the finished EXE.

Double-click **Build-Repetitio-Windows.cmd** in the repository. It builds the same frontend, publishes the API for Windows, copies an installed private .NET runtime, and produces `artifacts/Repetitio.exe` and `artifacts/Repetitio-Setup.exe`. The application's icon comes from the existing website icon. Build staging stays in `.artifacts/desktop`. The visible `artifacts` folder is replaced only after a complete successful build; the previous generated folder is retained internally for recovery. Close the Windows app before rebuilding. No build touches your databases or backups. Old `releases/windows` folders are not deleted.

You normally do not need to choose a version. To explicitly choose a newer release:

```powershell
.\Build-Repetitio-Windows.ps1 -Version 0.3.0
```

To use installed/cached dependencies during a NuGet outage:

```powershell
.\Build-Repetitio-Windows.ps1 -Offline
```

`-Offline` uses an empty NuGet feed plus the global package cache and skips npm dependency installation. It requires a previous online dependency setup. Electron/NSIS packaging tools must also already be cached; an entirely fresh build machine cannot manufacture dependencies it has never downloaded. This limitation affects building a new release, not running an existing release.

For a faster developer package:

```powershell
.\Build-Repetitio-Windows.ps1 -Offline -UnpackedOnly
```

Run `artifacts\windows\Repetitio.exe` and keep its complete `windows` folder together. Do not copy only that EXE: its accompanying resources contain Chromium, the API and .NET. The standalone `artifacts\Repetitio.exe` and Setup EXE include these resources already. An unpacked-only build replaces `artifacts` with an unpacked distribution and does not create the two standalone EXEs; use the normal build to produce them.

`release.json` records version, build date, runtime version and SHA-256 checksums of generated installers. Builds never publish to a remote release service automatically.

## Deployment verification

- `node --test tools/Repetitio.Desktop/test/*.test.cjs` checks cache refresh, preserved storage boundaries, streaming backup handling, origin security and mismatched-package rejection.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-WindowsDeployment.ps1` checks automatic version increases and rejection of old/invalid explicit versions.
- `tools/verify-windows-update.mjs` uses Playwright/Electron to open a retained previous EXE and the newly built EXE against the same disposable profile under `.artifacts/update-verification`. It verifies retained Wiki content, flashcard IDs, study history, backups, localStorage and IndexedDB, removal of stale UI caches, the current build identity and graceful update shutdown. It never uses the real Windows or Docker database.
- `tools/verify-windows-desktop.mjs` and `tools/verify-windows-portable.mjs` cover the native UI and standalone EXE. The Playwright module must be available to Node when running these developer scripts.

## Security and troubleshooting

- Only bundled frontend scripts run in the app. The renderer has no Node integration, runs sandboxed with context isolation and web security enabled, and cannot access native filesystem APIs directly.
- The API binds only to `127.0.0.1` on an available ephemeral port and requires a random per-launch token supplied by the main-process bridge. The frontend uses the stable `repetitio://app` origin so browser preferences survive restarts even when the local port changes.
- External HTTP/HTTPS links open in the default browser. PDF preview windows retain renderer isolation. Clipboard, file uploads and downloads remain available.
- Only one app instance opens a given desktop profile. Closing it requests the existing automatic shutdown backup, then stops its owned API process. The API also watches its parent so a crashed app does not leave a server running indefinitely.
- **Basics C# submissions execute on your computer with your Windows account, not inside Docker's container. Only execute code you trust.** Roslyn and the private .NET runtime are included; no SDK or package restore is needed to run the built-in harnesses.
- If startup fails, inspect the log under the data folder. Existing data is not deleted or silently replaced. Reinstall a complete matching/newer release if resources are missing. Keep/export your backups before manual recovery work.

For architecture/API references, see [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [custom protocols](https://www.electronjs.org/docs/latest/api/protocol), and [Windows NSIS packaging](https://www.electron.build/nsis/).
