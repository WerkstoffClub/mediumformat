# Phases & Roadmap

Four phases. Each ships independently; everything from a previous phase keeps
working.

## MVP-1 — Catalog + Website + Manual orders

> _Where we are today._

- ✅ Auth.js credentials login + role middleware
- ✅ Catalog: Releases (Discogs-cached) → Products → Variants → Stock
- ✅ Locations, Stock, StockMovement (manual receiving + adjustments)
- ✅ Public website: `/`, `/shop`, `/releases/[slug]`, `/news`, `/news/[slug]`,
  `/cart`, `/checkout`, `/account`
- ✅ Cart + Xendit checkout (single-channel: WEBSITE)
- ✅ News (markdown body, hero image)
- ✅ Track preview resolver (Apple → Bandcamp → YouTube) running on the worker
- ✅ Channels seeded (Website on, POS on, Discogs on, Tokopedia/Shopee off)
- ✅ Audit log, Settings, Promo, Wantlist scaffolds

## MVP-2 — POS + Discogs Marketplace

- POS UI (`/admin/pos`): cashbox open/close, scan-to-cart, split tender,
  QRIS via Xendit, cash drawer reconciliation
- Barcode scanning with `@zxing/browser`; internal barcodes via `bwip-js`
- Receipt + label printing (thermal: ESC/POS)
- Discogs Marketplace push (list `Variant` → `ChannelListing` of type DISCOGS)
- Discogs Marketplace inbound poll (`pollDiscogsOrders` worker)
- Customer accounts on the public site, wantlist UI, address book
- Inbound message thread per channel (Discogs DMs surfaced in `/admin/messages`)

## MVP-3 — Tokopedia + Newsletter

- Tokopedia FS API integration (catalog push, order pull, status sync)
- Listmonk wiring: `lib/integrations/listmonk/client.ts` already exists;
  add admin UI in `/admin/marketing`
- OpenRouter-assisted blurb generator (default: `anthropic/claude-sonnet-4-6`;
  bulk: `openai/gpt-4o-mini`)
- Reports: sales by channel / month, top sellers, AOV, sell-through

## MVP-4 — Shopee + Wholesale + Advanced reports

- Shopee Open Platform integration
- Wholesale role (`WHOLESALER`) gets `/wholesale` with `wholesalePriceIdr`
- Wholesale-only catalog filters and minimum-order rules
- COGS & margin reports, channel fee tracking already in `Order.channelFeeAmount`
- Stocktake workflow (count → variance → bulk movement)

## Backlog

- Pre-orders (status `PRE_ORDER` on `Product`)
- Multi-warehouse with transfer-orders UI (the data model already supports it
  via `StockMovement.reason = TRANSFER_IN/OUT`)
- Loyalty / store credit (`Setting`-backed for now, table later)
- R2 / S3 image storage with on-the-fly resize
- Webhook signature verification hardening for Discogs/Tokopedia/Shopee
