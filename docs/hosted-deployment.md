# Private hosted Repetitio

Use one instance and one SQLite database across your devices. Cloudflare Access controls entry to the entire hostname. The hosted Compose file publishes no ports. The tunnel reaches Nginx, which serves the UI and forwards same-origin `/api/` requests to the private API. The normal local Compose and Windows launcher have their own entry points.

```text
Browser → Cloudflare Access → Tunnel → Nginx → API → SQLite and backups
                                               │
                                               └─→ Private broker → rootless engine → disposable gVisor sandbox
```

Basics uses the existing exercises, test harnesses and response format. Hosted requests go to the broker. The sandbox compiles and runs the solution with a read-only filesystem, bounded temporary space, no network, a non-root user, dropped capabilities and CPU, memory, process, output and time limits. Only the broker can control the dedicated runner engine. The broker chooses the image and options. API failure or broker unavailability returns an error instead of executing locally. Test results are a learning aid and can be forged by code running in the same process as its harness.

## Prepare the Linux host

1. Run the app stack on your normal Docker engine. Set up a **second, rootless Docker engine under a dedicated OS user** for the runner. Keep application files, backups, tunnel credentials, and access to the primary Docker engine outside that account's permissions. Enable the dedicated daemon at boot. Configure systemd delegation for CPU, memory, swap accounting and PIDs on cgroup v2. The broker checks the engine's reported capabilities at startup. [Rootless Docker and resource limits](https://docs.docker.com/engine/security/rootless/tips/)
2. Install gVisor and register the `runsc` runtime on the **dedicated engine**. Use the rootless Docker/OCI user namespace setup described by gVisor. Its standalone `runsc --rootless` flag does not support the OCI create flow used here. Run the smoke test below on your server before routing public traffic. [gVisor installation](https://gvisor.dev/docs/user_guide/install/) · [Rootless gVisor](https://gvisor.dev/docs/user_guide/rootless/)
3. Create an Access self-hosted application for the full hostname. Set an Allow policy for your exact identity and create a locally managed tunnel. Save its credentials JSON outside the checkout and grant read permission only to the operator and the cloudflared container user. Configure your Cloudflare cache rules to bypass this hostname. [Cloudflare Access for self-hosted apps](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)

Edit `x-hosted-settings` at the top of `docker-compose.hosted.yml` and the `cloudflared` block at the bottom. Set the same hostname in both places, with `https://` in `public-origin` and just the hostname in the ingress rule. Fill in the tunnel UUID, team name and Access application audience. The default bind mounts use `/srv/repetitio/data`, `/srv/repetitio/backups` and `/etc/repetitio/credentials.json`. If you already use other paths, put those existing paths in the corresponding `source` fields. Create the data and backup directories before startup. Keep the credentials file outside the repository and Docker build contexts. The inline tunnel configuration requires Compose 2.23.1 or newer. [Compose configs](https://docs.docker.com/reference/compose-file/configs/)

Build the sandbox image from the **same checkout** as the API. Run this as the dedicated runner user with its rootless Docker context active. Set `runner-socket` to that user's socket and `runner-user` to its numeric UID:GID. At startup the broker resolves the fixed local tag to an image ID and uses that ID for all jobs with image pulls disabled.

```sh
docker build --target sandbox -f src/backend/Repetitio.Api/Dockerfile -t repetitio-basics-sandbox .
```

Run the following from the checkout on the **primary engine**. Use the explicit Compose file so the local development override is excluded.

```sh
dc() { docker compose -f docker-compose.hosted.yml "$@"; }
dc up -d --build api web runner
dc ps
dc exec -T runner python3 - https://study.example.com < deploy/hosted/smoke.py
```

The smoke check uses the built-in matrix exercise to verify successful compilation, compiler diagnostics, blocked access to application paths and network interfaces, timeout and output-flood handling, and a clean run after those failures. It creates no practice attempts. Verify that the runner user cannot read the live database, backup directory or tunnel credentials from the host.

After the smoke test, restore a copy of your backup as described below. Then start the tunnel and create its DNS route for the Access-protected hostname. Verify from a signed-out browser that both the homepage and `/api/backup/export` require Access. Sign in and verify you can read your data and run a Basics exercise.

```sh
dc up -d tunnel
```

## Use the host broker when rootless gVisor cannot start

Use this mode only after testing gVisor and verifying CPU, memory, swap, and PID limits on the primary engine. The broker runs as a privileged systemd service and accepts only execution requests through a private Unix socket. Treat the installed broker script as privileged code. The API receives the broker socket, and the sandbox receives neither socket. The rootless broker is still available through the original Compose file.

Run from the deployment checkout as root. Repeat these steps when updating the API and sandbox image.

```sh
d() { docker --host unix:///var/run/docker.sock "$@"; }
dc() { d compose -f docker-compose.hosted.yml -f docker-compose.host-runner.yml "$@"; }

d build --target sandbox -f src/backend/Repetitio.Api/Dockerfile -t repetitio-basics-sandbox . &&
install -D -m 0644 deploy/hosted/runner.py /usr/local/lib/repetitio/runner.py &&
install -m 0644 deploy/hosted/repetitio-basics.service /etc/systemd/system/repetitio-basics.service &&
systemctl daemon-reload &&
systemctl enable repetitio-basics.service &&
systemctl restart repetitio-basics.service &&
dc up -d --build --wait api
```

Check `journalctl -u repetitio-basics.service -n 40 --no-pager` and run a Basics exercise through Cloudflare Access. Use both Compose files for subsequent deployment and recovery commands in this mode.

## Move data, export and restore

Keep your original ZIP separately. The hosted server uses the existing ZIP format, including the database and the wiki images stored in it. The restore procedure replaces the target database. Choose a fresh hosted data directory for your first migration, and check a few existing Wiki pages, images, and practice attempts after restore.

The UI can still import/export through Access. For initial migration, disaster recovery or large ZIPs, copy the archive to the server over SSH and use the existing offline recovery command through Compose. This avoids Cloudflare's per-request upload limit. Shut down the tunnel and API during recovery so that a browser cannot write while the database is replaced. The recovery command validates the archive, retains previous SQLite/WAL files in the backup directory and leaves a recovery journal if interrupted. The API checks that journal before opening the database. A compatible older database is migrated on startup with an automatic pre-migration backup. [Cloudflare upload limits](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/)

```sh
dc stop tunnel api
dc run --rm --no-deps -v /absolute/path/to/backup.zip:/restore.zip:ro api \
  --desktop-restore-backup /restore.zip --desktop-copy-output /data/repetitio.db
# Proceed only after the restore exits successfully.
dc up -d api web
dc ps
# Wait for the API to be healthy before exposing the tunnel again.
dc up -d tunnel
```

Schedule exports through the internal web container and copy the finished ZIPs to encrypted storage outside the server. Write to a temporary filename and rename only after the export succeeds. Test a restore in a separate data directory periodically.

```sh
archive="/srv/repetitio/backups/repetitio-$(date -u +%Y%m%dT%H%M%SZ).zip"
dc exec -T web wget -qO- http://127.0.0.1/api/backup/export > "$archive.partial" &&
  mv -- "$archive.partial" "$archive"
```

For updates, save a backup and rebuild the sandbox under the same tag on the dedicated engine. On the primary engine run `dc up -d --build api web runner`, then `dc restart runner` so it resolves the rebuilt image. Repeat the smoke test. The persistent data and backup paths are explicit bind mounts.

## Review notes

- The API checks the configured HTTPS Origin on hosted write requests to prevent cross-site browser writes. Trusted administrative clients making writes directly to the private API must supply that Origin. Origin checking complements the tunnel's JWT validation.
- The API has outbound access for Wiki image imports. Its downloader validates resolved addresses and revalidates redirects. Keep host firewall rules in place for internal infrastructure and metadata services.
- The live backup importer validates and migrates a temporary copy and creates a safety export before restoring. Use offline recovery for planned replacements so other devices cannot submit writes during the import.
- The existing desktop and local executor still runs code on the local machine. Use the hosted deployment profile for a remotely accessible instance. Keep the host, Docker, gVisor, and container images patched.
