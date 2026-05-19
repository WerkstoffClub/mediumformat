# Decisions (ADRs, lightweight)

One-paragraph rationale for each significant choice. Add new ones at the top.

## D-008 · CI deploys via raw SSH, no third-party action

> 2026-05-19

**Decision**: the deploy job in `.github/workflows/build-image.yml` uses
plain `ssh` with `BatchMode=yes` + a known-hosts pin, instead of
`appleboy/ssh-action` or similar.

**Why**: less supply-chain surface, less magic. The whole deploy step is
`ssh deploy@host './scripts/deploy.sh'` — auditable in two lines. The
`appleboy/ssh-action` is fine but it's another dependency to pin and
audit, and it offers nothing we need.

## D-007 · Pre-build image in CI, never on the VPS

> 2026-05-19

**Decision**: GitHub Actions builds the Docker image and pushes to
`ghcr.io/werkstoffclub/mediumformat`. The VPS only ever `docker compose
pull`s.

**Why**: `next build` peaks ~1.5 GB of RAM. Building on a 2 GB VPS will
OOM mid-deploy and leave a half-shipped state. CI has unlimited memory
and is the right place. Side benefits: deploys are ~60 s (pull + restart),
the deploy artifact is content-addressed by SHA so rollback = pin the tag,
and the VPS never needs Node/npm/build tooling installed.

## D-006 · Self-hosted VPS, single host, no Kubernetes / no Portainer

> 2026-05-19

**Decision**: keep the stack on a single `port.rocketsystem.cloud` VM,
orchestrated by `docker compose`. No Kubernetes, no Portainer UI, no
Coolify / Dokku.

**Why**: this is a one-store record shop with five sales channels. Every
container talks to local Postgres and local Redis; nothing benefits from
horizontal scale. A single compose file + a deploy script is the entire
control plane, fits in one head, and survives the bus factor. Portainer
would add a clicky UI and another service to update, while drifting from
the git source of truth.

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

**Decision**: Docker Compose on `port.rocketsystem.cloud` behind Cloudflare.

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
