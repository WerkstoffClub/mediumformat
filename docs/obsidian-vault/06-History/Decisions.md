# Decisions (ADRs, lightweight)

One-paragraph rationale for each significant choice. Add new ones at the top.

## D-005 · Self-host Listmonk for newsletter

> 2026-04-29

**Decision**: ship Listmonk as a sibling container, surface its admin at
`mail.mediumformat.info`. Wrap its REST API for campaign creation from our
own `/admin/marketing`.

**Why**: free, owns the subscriber list (no Mailchimp lock-in), works with
local Indonesian SMTP relays, and the operational load (one container,
one DB) is trivial.

## D-004 · Two-config Auth.js split

> 2026-04-29

**Decision**: keep an edge-safe `lib/auth.config.ts` (no Prisma, no bcrypt)
and a Node-runtime `lib/auth.ts` that spreads it.

**Why**: Auth.js v5 wants to run in middleware (Edge runtime), but the
Credentials provider needs bcrypt + Prisma. Splitting is the documented
pattern; it also keeps JWT-only verification fast (no DB roundtrip).

## D-003 · JWT sessions, not DB sessions

> 2026-04-29

**Decision**: `session: { strategy: "jwt" }`.

**Why**: middleware verifies role on every protected request — DB sessions
would mean a Postgres roundtrip per page load. JWT trades cheaper reads for
a slightly slower logout story; acceptable.

## D-002 · BullMQ + dedicated worker container

> 2026-04-29

**Decision**: separate `worker` container running `tsx jobs/worker.ts`.

**Why**: Discogs is rate-limited (60 req/min); Apple Music + YouTube
lookups are slow; newsletter sends are bursty. Inline processing would
either time out user requests or rate-limit-trip during catalog imports.
BullMQ gives retries + backoff + visibility for free.

## D-001 · Self-managed VPS, not Vercel/Fly/Render

> 2026-04-29

**Decision**: Docker Compose on `vps.rocketsystem.cloud` behind Cloudflare.

**Why**:

- **Cost** — fixed €10-ish/month vs scaling-bill platforms.
- **Indonesian latency** — Cloudflare edge fronts cache; origin can be in
  Singapore region for low RTT to ID.
- **Self-hosted dependencies** — Listmonk + Postgres + Redis all share the
  box; no per-service vendor.
- **No vendor lock** — `docker-compose down` and we can move to another VPS
  in an hour.
- Trade-off: we own ops (backups, OS patches, TLS renewal). Acceptable for a
  small team; documented in this vault.

## D-000 · Inspired by common-ground.io

> 2026-04-29

**Decision**: model the domain on common-ground.io's three-tier shape
(Release / Product / Variant) and channel-listing model.

**Why**: common-ground has 5+ years of real record-shop usage and gets this
right. Reinventing inventory primitives is busy-work. We diverge on the
Indonesia-specific layer (PPN, IDR, Xendit, Biteship, Tokopedia, Shopee).
