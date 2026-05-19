# Routes Map

## Public website — `app/(site)/`

| Route | Purpose |
|---|---|
| `/` | Homepage: hero + featured releases + latest news |
| `/shop` | Catalog with facets (format, genre, condition, price) |
| `/releases/[slug]` | Single release page: tracklist + previews + variants + add-to-cart |
| `/news` | News index (paginated) |
| `/news/[slug]` | Single news post (markdown body) |
| `/cart` | Cart review + promo code |
| `/checkout` | Address + courier (Biteship) + payment (Xendit) |
| `/account` | Customer dashboard (orders, addresses, wantlist) — JWT required |
| `/wholesale` | Wholesale catalog — `WHOLESALER` role only |

## Admin — `app/admin/`

| Route | Capability | Notes |
|---|---|---|
| `/admin/login` | — | Credentials sign-in |
| `/admin/dashboard` | any staff | Today's sales, low stock, pending orders |
| `/admin/catalog` | `catalog.read` / `catalog.write` | Releases + Products + Variants |
| `/admin/inventory` | `inventory.adjust` | Stock by location, movements log |
| `/admin/pos` | `pos.sell`, `pos.session` | Front-of-store POS |
| `/admin/orders` | `orders.manage` | All orders across channels |
| `/admin/customers` | `customers.manage` | Customer list + profiles |
| `/admin/messages` | `messages.manage` | Threads from website / Discogs / Tokopedia / Shopee |
| `/admin/marketing` | `marketing.manage` | Promos + Listmonk campaigns |
| `/admin/news` | `news.manage` | News post CRUD |
| `/admin/channels` | `channels.manage` | Channel enable/disable + listings audit |
| `/admin/reports` | `reports.sales` / `reports.financial` | Sales, AOV, sell-through |
| `/admin/settings` | `settings.manage` | Store config, tax rate, currency |

See `lib/permissions.ts` for the capability matrix.

## API — `app/api/`

| Route | Method | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | * | Auth.js handler |
| `/api/webhooks/xendit` | POST | Verifies `X-CALLBACK-TOKEN` |
| `/api/webhooks/biteship` | POST | Shipment status updates |
| `/api/webhooks/discogs` | POST | Marketplace order updates |
| `/api/webhooks/tokopedia` | POST | Tokopedia order / status push |
| `/api/webhooks/shopee` | POST | Shopee push notifications |

## Middleware matcher

`middleware.ts` runs on `/admin/:path*`, `/account/:path*`, `/wholesale/:path*`.
Anything outside is public.
