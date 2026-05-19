# Progress Log

Reverse-chronological. Each entry is a single working session.

## 2026-05-19 — Pre-deploy consolidation

- Pulled the initial Prisma migration
  (`prisma/migrations/20260519193538_init/`) plus
  `migration_lock.toml` from `claude/local-deployment-setup-l4m5H` so
  `prisma migrate deploy` has something to apply. Schemas matched on
  both branches, so the migration is valid as-is.
- Confirmed there is no `main` branch on the remote yet — the CI deploy
  workflow is gated on `refs/heads/main`, so until `main` exists no
  auto-deploy can fire. Plan: create `main` pointing at the last shared
  commit (`1145eea`), then open a PR from this branch into it. Merging
  the PR makes that the production line going forward.
- Did NOT touch `claude/local-deployment-setup-l4m5H` itself — that
  branch's local-dev work is separate; the only piece this prod branch
  needed was the migration directory.

## 2026-05-19 — VPS hostname correction

- Reverted my earlier "fix" — VPS hostname is `port.rocketsystem.cloud`,
  not `vps.rocketsystem.cloud`. I'd assumed `port` was a typo in the
  original `DEPLOYMENT.md` based on the user's first prompt; it was the
  user's prompt that was inexact. Swept every reference back via
  `find ... -exec sed -i 's|vps.rocketsystem.cloud|port.rocketsystem.cloud|g'`
  across `scripts/`, `.github/`, `DEPLOYMENT.md` and the vault.
- Lesson logged in [[07-Memory/Conventions]]: do not "fix" identifiers
  that look like typos without confirming — registrar / provider
  hostnames can have any shape.

## 2026-05-19 — CI-driven deploy

- Added a `deploy` job to `.github/workflows/build-image.yml`, gated on
  `github.ref == 'refs/heads/main'` and `needs: build`. SSHes to
  `deploy@port.rocketsystem.cloud` and runs `./scripts/deploy.sh`. Uses
  raw `ssh` with known-hosts pinning + a dedicated CI keypair — no
  third-party actions. Concurrency group `vps-deploy`,
  `cancel-in-progress: false` so simultaneous deploys queue instead of
  half-running.
- Wrote [[CI Deploy]] documenting the four GitHub secrets (`VPS_HOST`,
  `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`), the dedicated
  CI key generation, the `ssh-keyscan` step for the known-hosts pin,
  failure modes, and the key-rotation procedure.
- Updated [[Deploy Runbook]] — `git push origin main` is now the
  standard deploy. Manual `./scripts/deploy.sh` is documented as the
  hotfix / non-main path.
- Updated [[Production Topology]] to mention the auto-deploy trigger.

## 2026-05-19 — Document everything + production deploy plan

- Built this Obsidian vault (`docs/obsidian-vault/`) covering vision, stack,
  data model, every feature, every deploy step.
- Confirmed nginx + docker-compose are already pinned to `mediumformat.info`
  (no functional change needed).
- Tracked the deploy target: VPS `port.rocketsystem.cloud` (`31.97.220.192`),
  production domain `mediumformat.info`.
- Added `scripts/bootstrap-vps.sh` — single idempotent root script that
  takes a fresh VPS to a live deploy in ~5 min. Writes generated secrets
  to `/root/mediumformat-secrets.txt` (mode 0600).
- Fixed `scripts/init-letsencrypt.sh` — was binding `$(pwd)/certbot-certs`
  as a host path, while the rest of the stack used named Docker volumes.
  Certs would have been issued into the wrong location and nginx would
  not have found them. Now uses `docker compose run --rm --entrypoint
  certbot certbot certonly --standalone` to inherit the named volumes.
- Nginx: dropped unused `admin.mediumformat.info` SAN (admin lives at
  `/admin` on the apex). Added a 301 from `https://www.mediumformat.info`
  to the apex for one canonical hostname.
- Added `scripts/preflight.sh` — read-only sanity check that prints OS /
  CPU / RAM / disk, DNS resolution, port availability, and outbound
  connectivity. Run before bootstrap.
- Added a GitHub Actions build-and-push pipeline
  (`.github/workflows/build-image.yml`) that pushes
  `ghcr.io/werkstoffclub/mediumformat:<tags>` on every push to main.
  Updated `docker-compose.yml` to declare both `image:` and `build:` so
  the VPS pulls in prod and devs build locally. Updated `deploy.sh` and
  `bootstrap-vps.sh` to pull-first with local-build fallback. This
  matters because `next build` peaks ~1.5 GB and would OOM a 2 GB VPS.
- Branch: `claude/document-and-deploy-setup-dOnw6`.

Open follow-ups (carried to backlog):

- Wire up Sentry on app + worker.
- Add `/health` route + Cloudflare uptime check.
- Ship a `bull-board` companion for queue inspection.
- Add image upload backup leg in `backup.sh`.

## 2026-04-30 — Move local dev server to port 8000

- `package.json` `dev` and `start` now use `-p 8000`.
- Reason: collision with other Next.js projects on 3000.
- README and `.env.example` updated.
- Commit: `1145eea`.

## 2026-04-29 — Scaffold Medium Format admin + website

Initial commit. Big bang scaffold (one session).

- Next.js 15 App Router + TS + Tailwind v4
- Prisma schema (640 lines) covering: Users/Auth, Catalog (Release/Product/
  Variant/Track), Inventory (Location/Stock/StockMovement), Channels
  (Channel/ChannelListing), Orders (Order/OrderItem/Payment/Shipment),
  POS (PosSession), CRM (CustomerProfile/Address/Wantlist/Message),
  Marketing (Promo/NewsPost), Shipping (ShippingPolicy), System
  (AuditLog/Setting)
- Auth.js v5 with Credentials provider + JWT sessions + edge-safe config split
- `lib/permissions.ts` capability matrix (5 roles × 17 capabilities)
- Middleware role gate for `/admin`, `/account`, `/wholesale`
- All public + admin route stubs
- BullMQ worker + 3 handlers: `resolve-tracks`, `sync-channel-listing`,
  `poll-discogs-orders`
- 10 integration clients (Discogs, Xendit, Biteship, iTunes, YouTube,
  Bandcamp, Tokopedia, Shopee, Listmonk, OpenRouter)
- 5 webhook endpoints (Xendit, Biteship, Discogs, Tokopedia, Shopee)
- Idempotent seed (admin + 2 locations + 5 channels + settings + 1 news post)
- Production Docker stack: app, worker, postgres, redis, listmonk,
  listmonk-db, nginx, certbot
- `scripts/init-letsencrypt.sh`, `scripts/deploy.sh`, `scripts/backup.sh`
- `DEPLOYMENT.md` with Cloudflare DNS recipe for `mediumformat.info`
- Commit: `1727239`.
