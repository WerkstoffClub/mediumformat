# Stack

## Runtime

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15.5.4** (App Router) | RSC by default; route handlers for webhooks |
| Language | **TypeScript 5** | strict |
| UI | **Tailwind v4** + Radix primitives + lucide icons | `@tailwindcss/postcss` |
| Data fetching | **TanStack Query 5** | client; server actions for mutations |
| Forms | **react-hook-form** + **zod** | shared schemas client/server |
| i18n | **next-intl** | `id-ID` default, `en-US` secondary |
| Node | **22-alpine** in Docker | |

## Persistence

| Layer | Choice |
|---|---|
| Primary DB | **PostgreSQL 16** |
| ORM | **Prisma 5.22** |
| Cache + queues | **Redis 7** (`appendonly yes`) |
| Job runner | **BullMQ 5** via `tsx jobs/worker.ts` |
| File uploads | Local volume `/app/public/uploads` (R2 later) |

## Auth

- **Auth.js v5 (`next-auth@5.0.0-beta.25`)**
- Credentials provider (email + bcrypt password)
- **JWT sessions** (Edge-safe, used by middleware)
- Prisma adapter for account/session/verification-token tables

> ⚠️ `lib/auth.config.ts` is the **edge-safe** subset imported by `middleware.ts`.
> The full config (Prisma adapter + bcrypt) lives in `lib/auth.ts` and is only
> imported by Node-runtime handlers.

## Integrations

| Service | Use | Client file |
|---|---|---|
| **Discogs** | Catalog metadata + marketplace listing sync | `lib/integrations/discogs/client.ts` |
| **Xendit** | Payments (QRIS / OVO / GoPay / VA / cards) | `lib/integrations/xendit/client.ts` |
| **Biteship** | Domestic shipping aggregator + label printing | `lib/integrations/biteship/client.ts` |
| **Tokopedia FS** | Marketplace sync (MVP-3) | `lib/integrations/tokopedia/client.ts` |
| **Shopee Open API** | Marketplace sync (MVP-4) | `lib/integrations/shopee/client.ts` |
| **Apple Music / iTunes** | Track preview resolution | `lib/integrations/itunes/client.ts` |
| **YouTube Data v3** | Track preview fallback | `lib/integrations/youtube/client.ts` |
| **Bandcamp** | Embed-based preview | `lib/integrations/bandcamp/embed.ts` |
| **Listmonk** | Newsletter (self-hosted, behind `mail.mediumformat.info`) | `lib/integrations/listmonk/client.ts` |
| **OpenRouter** | AI assist (blurbs, translation, newsletter copy) | `lib/integrations/openrouter/client.ts` |

## Deployment

- **Docker Compose** on a self-managed VPS (`vps.rocketsystem.cloud`).
- **GitHub Actions** builds the image on push to `main`, pushes to GHCR,
  then SSHes into the VPS and runs `scripts/deploy.sh`. `git push main`
  is the entire deploy.
- **nginx-alpine** as TLS terminator + reverse proxy in front of the
  Next.js container.
- **Let's Encrypt** via `certbot` sidecar; auto-renews every 12h.
- **Cloudflare** in front (proxy / WAF / cache / DNS).

See [[04-Deployment/Production Topology]], [[04-Deployment/Image Build Pipeline]],
[[04-Deployment/CI Deploy]].

## Why these choices

- **Next.js 15 App Router** — RSC keeps payloads small for slow Indonesian
  3G/4G connections; server actions remove the boilerplate REST layer.
- **Prisma** — typed model, painless migrations, plays well with App Router
  servers.
- **BullMQ** — Discogs polls, marketplace pushes, track resolution and
  newsletter blasts are inherently async with retries.
- **Self-hosted VPS + nginx + Docker Compose** — predictable cost (~$10/mo),
  no vendor lock-in, fits one engineer's mental model. Cloudflare gives us
  free DDoS/WAF/cache on top.
- **Auth.js + Credentials only** — no social login needed; staff sign in once
  per device with email/password.
