# Progress Log

Reverse-chronological. Each entry is a single working session.

## 2026-05-19 — Document everything + production deploy plan

- Built this Obsidian vault (`docs/obsidian-vault/`) covering vision, stack,
  data model, every feature, every deploy step.
- Confirmed nginx + docker-compose are already pinned to `mediumformat.info`
  (no functional change needed).
- Fixed the VPS hostname typo in `DEPLOYMENT.md`: `port.rocketsystem.cloud`
  → `vps.rocketsystem.cloud`.
- Tracked the deploy target: VPS `vps.rocketsystem.cloud` (`31.97.220.192`),
  production domain `mediumformat.info`.
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
