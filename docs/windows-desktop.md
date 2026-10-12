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

Desktop backup uploads have no application-level size cap: Kestrel's request limit is disabled and multipart parsing uses the maximum supported length. The main-process bridge streams uploads/downloads rather than duplicating the archive in memory. Available disk space, operating-system limits and memory still apply. The existing backend validation and export behavior is reused; exports of very large databases still need sufficient disk space and memory. These settings apply to the authenticated desktop API; Docker configuration is unchanged.

## Updating your own app

Save your work and close Repetitio before installing an update. Build the next version and run its Setup EXE over the existing installation. The stable application ID and the external data directory preserve your database, backups and browser preferences. No online auto-updater is enabled; installing updates is explicit and works with a local installer file.

The API reuses existing migrations and the pre-migration safety backup. Desktop startup refuses unknown/newer database schemas before applying migrations. An older EXE is not a database rollback tool. To recover older data, use a validated compatible backup and retain the newer data separately.

Uninstalling the program does not delete `%LOCALAPPDATA%\Repetitio`. Do not manually delete this folder unless you intend to erase your Windows data.

## Build with one click

The build computer needs the .NET 10 SDK, Node/npm, and dependencies. The target computer only needs the finished EXE.

Double-click **Build-Repetitio-Windows.cmd** in the repository. It builds the same frontend, publishes the API for Windows, copies an installed private .NET runtime, and produces `artifacts/Repetitio.exe` and `artifacts/Repetitio-Setup.exe`. The application's icon comes from the existing website icon. Build staging stays in `.artifacts/desktop`. The visible `artifacts` folder is replaced only after a complete successful build; the previous generated folder is retained internally for recovery. Close the Windows app before rebuilding. No build touches your databases or backups. Old `releases/windows` folders are not deleted.

To choose a version:

```powershell
.\Build-Repetitio-Windows.ps1 -Version 0.2.0
```

To use installed/cached dependencies during a NuGet outage:

```powershell
.\Build-Repetitio-Windows.ps1 -Version 0.2.0 -Offline
```

`-Offline` uses an empty NuGet feed plus the global package cache and skips npm dependency installation. It requires a previous online dependency setup. Electron/NSIS packaging tools must also already be cached; an entirely fresh build machine cannot manufacture dependencies it has never downloaded. This limitation affects building a new release, not running an existing release.

For a faster developer package:

```powershell
.\Build-Repetitio-Windows.ps1 -Version 0.2.0 -Offline -UnpackedOnly
```

Run `artifacts\windows\Repetitio.exe` and keep its complete `windows` folder together. Do not copy only that EXE: its accompanying resources contain Chromium, the API and .NET. The standalone `artifacts\Repetitio.exe` and Setup EXE include these resources already. An unpacked-only build replaces `artifacts` with an unpacked distribution and does not create the two standalone EXEs; use the normal build to produce them.

`release.json` records version, build date, runtime version and SHA-256 checksums of generated installers. Builds never publish to a remote release service automatically.

## Security and troubleshooting

- Only bundled frontend scripts run in the app. The renderer has no Node integration, runs sandboxed with context isolation and web security enabled, and cannot access native filesystem APIs directly.
- The API binds only to `127.0.0.1` on an available ephemeral port and requires a random per-launch token supplied by the main-process bridge. The frontend uses the stable `repetitio://app` origin so browser preferences survive restarts even when the local port changes.
- External HTTP/HTTPS links open in the default browser. PDF preview windows retain renderer isolation. Clipboard, file uploads and downloads remain available.
- Only one app instance opens a given desktop profile. Closing it requests the existing automatic shutdown backup, then stops its owned API process. The API also watches its parent so a crashed app does not leave a server running indefinitely.
- **Basics C# submissions execute on your computer with your Windows account, not inside Docker's container. Only execute code you trust.** Roslyn and the private .NET runtime are included; no SDK or package restore is needed to run the built-in harnesses.
- If startup fails, inspect the log under the data folder. Existing data is not deleted or silently replaced. Reinstall a complete matching/newer release if resources are missing. Keep/export your backups before manual recovery work.

For architecture/API references, see [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [custom protocols](https://www.electronjs.org/docs/latest/api/protocol), and [Windows NSIS packaging](https://www.electron.build/nsis/).
