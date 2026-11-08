# Private hosted Repetitio

Use one instance and one SQLite database across your devices. Cloudflare Access controls entry to the entire hostname. The hosted Compose file publishes no ports. The tunnel reaches Nginx, which serves the UI and forwards same-origin `/api/` requests to the private API. The normal local Compose and Windows launcher have their own entry points.

```text
Browser → Cloudflare Access → Tunnel → Nginx → API → SQLite and backups
                                               │
                                               └─→ Private Unix socket → Basics worker
```

The hosted Basics worker uses the same compiler, test harnesses, and subprocess executor as the desktop app. It runs in an ordinary Docker container with no network, no Docker socket, and no access to the API's data or backups. The container runs as a non-root user with a read-only root filesystem, bounded temporary storage, and CPU, memory, and process limits. Use this mode for a private instance where only trusted users can submit code. The worker handles one submission at a time.

## Prepare the Linux host

Install Docker Engine with Compose. Create an Access self-hosted application for the full hostname. Set an Allow policy for your exact identity and create a locally managed tunnel. Save its credentials JSON outside the checkout and grant read permission only to the operator and the cloudflared container user. Configure your Cloudflare cache rules to bypass this hostname. [Cloudflare Access for self-hosted apps](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)

Edit `x-hosted-settings` at the top of `docker-compose.hosted.yml` and the `cloudflared` block at the bottom. Set the same hostname in both places, with `https://` in `public-origin` and just the hostname in the ingress rule. Fill in the tunnel UUID, team name and Access application audience. The default bind mounts use `/srv/repetitio/data`, `/srv/repetitio/backups` and `/etc/repetitio/credentials.json`. If you already use other paths, put those existing paths in the corresponding `source` fields. Create the data and backup directories before startup. Keep the credentials file outside the repository and Docker build contexts. The inline tunnel configuration requires Compose 2.23.1 or newer. [Compose configs](https://docs.docker.com/reference/compose-file/configs/)

From the deployment checkout, run both Compose files on the primary engine. Compose builds the API and worker from the same checkout.

```sh
dc() { docker compose -f docker-compose.hosted.yml -f docker-compose.host-runner.yml "$@"; }
dc up -d --build --wait api web basics
dc ps
```

For a first deployment, restore a copy of your backup as described below. Then start the tunnel and create its DNS route for the Access-protected hostname. Verify from a signed-out browser that both the homepage and `/api/backup/export` require Access. Sign in, check your data, and run a Basics exercise. Check `dc logs --tail=50 basics api` if execution fails.

```sh
dc up -d tunnel
```

Existing installations using the systemd broker can switch by running the same Compose command above. After a successful Basics run through the domain, retire the old service with `systemctl disable --now repetitio-basics.service`. The separately configured rootless gVisor runner remains available through `docker-compose.hosted.yml` alone.

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

Docker Compose enables daily backups in `/srv/repetitio/backups/daily`. Repetitio creates a ZIP at midnight UTC, or on startup when that UTC day's ZIP is missing. It keeps the three most recent successful daily backups. The previous copies are pruned after the new archive is saved. Failed runs retry after 15 minutes. Daily backups use the regular import format and have their own directory and rotation.

For a separate export through the internal web container, write to a temporary filename and rename it after the export succeeds.

```sh
archive="/srv/repetitio/backups/repetitio-$(date -u +%Y%m%dT%H%M%SZ).zip"
dc exec -T web wget -qO- http://127.0.0.1/api/backup/export > "$archive.partial" &&
  mv -- "$archive.partial" "$archive"
```

For updates, save a backup, pull the new version, and run `dc up -d --build --wait api web basics` using both Compose files. Run a Basics exercise again. The persistent data and backup paths are explicit bind mounts.

## Review notes

- The API checks the configured HTTPS Origin on hosted write requests to prevent cross-site browser writes. Trusted administrative clients making writes directly to the private API must supply that Origin. Origin checking complements the tunnel's JWT validation.
- The API has outbound access for Wiki image imports. Its downloader validates resolved addresses and revalidates redirects. Keep host firewall rules in place for internal infrastructure and metadata services.
- The live backup importer validates and migrates a temporary copy and creates a safety export before restoring. Use offline recovery for planned replacements so other devices cannot submit writes during the import.
- Keep the host, Docker, and container images patched. Submitted code shares the Basics worker container with the test harness and can affect other executions in that worker.
