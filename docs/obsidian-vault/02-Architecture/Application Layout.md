# Application Layout

```
mediumformat/
├── app/                            # Next.js App Router
│   ├── (site)/                     # public website route group
│   │   ├── page.tsx                # /
│   │   ├── shop/page.tsx           # /shop
│   │   ├── releases/[slug]/page.tsx
│   │   ├── news/{page.tsx,[slug]/page.tsx}
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── account/page.tsx
│   │   └── wholesale/page.tsx
│   ├── admin/                      # /admin/* — staff dashboard
│   │   ├── layout.tsx              # shell + role-gated nav
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── catalog/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── pos/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── marketing/page.tsx
│   │   ├── news/page.tsx
│   │   ├── channels/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── webhooks/
│   │       ├── xendit/route.ts
│   │       ├── biteship/route.ts
│   │       ├── discogs/route.ts
│   │       ├── tokopedia/route.ts
│   │       └── shopee/route.ts
│   ├── layout.tsx                  # root layout
│   └── globals.css                 # Tailwind v4 entrypoint
│
├── components/
│   └── admin/PageShell.tsx
│
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── redis.ts                    # ioredis + BullMQ connection
│   ├── auth.ts                     # full Auth.js (Node)
│   ├── auth.config.ts              # edge-safe Auth.js subset
│   ├── auth-handlers.ts
│   ├── permissions.ts              # capability matrix per Role
│   ├── format.ts                   # IDR money, dates (id-ID)
│   ├── logger.ts                   # pino
│   ├── utils.ts                    # cn(), misc
│   ├── barcode/render.ts           # bwip-js wrappers
│   └── integrations/
│       ├── discogs/client.ts
│       ├── xendit/client.ts
│       ├── biteship/client.ts
│       ├── itunes/client.ts
│       ├── youtube/client.ts
│       ├── bandcamp/embed.ts
│       ├── tokopedia/client.ts
│       ├── shopee/client.ts
│       ├── openrouter/client.ts
│       └── listmonk/client.ts
│
├── jobs/                           # BullMQ worker process
│   ├── worker.ts                   # `npm run worker`
│   ├── queues.ts
│   └── handlers/
│       ├── resolve-tracks.ts
│       ├── sync-channel-listing.ts
│       └── poll-discogs-orders.ts
│
├── prisma/
│   ├── schema.prisma               # single source of truth
│   └── seed.ts                     # `npm run db:seed`
│
├── .github/
│   └── workflows/
│       └── build-image.yml         # build → push GHCR → ssh VPS → deploy
│
├── scripts/
│   ├── preflight.sh                # read-only VPS sanity check
│   ├── bootstrap-vps.sh            # one-shot fresh-VPS bootstrap
│   ├── init-letsencrypt.sh         # one-shot TLS bootstrap on the VPS
│   ├── deploy.sh                   # pull image (or build) + migrate + up
│   └── backup.sh                   # nightly pg_dump → rclone r2
│
├── nginx/
│   ├── nginx.conf
│   └── conf.d/mediumformat.conf    # TLS + reverse proxy
│
├── public/
├── middleware.ts                   # role gate for /admin, /account, /wholesale
├── next.config.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── DEPLOYMENT.md
└── README.md
```

## Route groups

- **`app/(site)/`** — public, customer-facing, no auth required (cart/checkout/account
  use cookies + JWT but no role gate).
- **`app/admin/`** — `middleware.ts` redirects to `/admin/login` unless
  `role ∈ {ADMIN, STAFF, SHOPKEEPER}`.
- **`app/api/webhooks/*`** — public POST endpoints; each verifies its own
  signature (Xendit/Biteship/Discogs callback tokens).

## Process model in production

```
                  ┌────────────────────────────────────────────┐
                  │  vps.rocketsystem.cloud (31.97.220.192)     │
                  │                                            │
        80/443 ───►  nginx ──► app   (Next.js, port 3000)      │
                  │              └─► postgres                  │
                  │              └─► redis ──► worker (BullMQ) │
                  │              └─► listmonk ──► listmonk-db  │
                  │                                            │
                  │  certbot sidecar (renews every 12h)        │
                  └────────────────────────────────────────────┘
                                  ▲
                                  │ Cloudflare proxy (orange cloud)
                                  │
                              the internet
```

See [[04-Deployment/Production Topology]].
