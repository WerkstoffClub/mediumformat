# DealPOS Sync + Finance Feature — Design

**Date:** 2026-07-02 · **Status:** Approved (user confirmed scope + provided credentials)

## Goal

Clone the shop's live operational data from DealPOS (the POS SaaS currently running the
store at `doubledeer.dealpos.co.id`) into the Medium Format app database, populate the
back-office Inventory with that real data, and add a **Finance** section under Dashboard
for the finance team: sales & revenue summary, COGS & margins, payments breakdown, and
exportable CSV reports. Separately, remove the eBay channel from the Channels config
mockups.

## Decisions (from user)

- Target: **real app** (`apps/api` NestJS + `apps/backoffice` React), not the prototype.
- Finance scope: sales/revenue summary, COGS & margins, payments breakdown, CSV export.
- eBay: remove from Channels config screens (`mockup-channels.html` + mobile) only.
- Credentials: stored in root `.env` (git-ignored, symlinked into `apps/api/.env`):
  `DEALPOS_SUBDOMAIN`, `DEALPOS_CLIENT_ID`, `DEALPOS_CLIENT_SECRET`.

## DealPOS API facts (from OpenAPI spec)

- Auth: `POST /api/v3/Token/OAuth2` `{client_id, client_secret}` → bearer token with
  `expires_in`/`expiredat`. Secret must be a GUID.
- Invoices with lines + payments: `POST /api/v3/Invoice/MultipleOutlet/WithVariant`
  (header `IncludePayments: true`). Line items carry `Cost`, `Price`, `DiscountAmount`,
  `Sales`, `Tax`; invoice carries `Tag` (= sales channel) and `Payments[].Method`.
  Fallback path: `GET /api/v3/Invoice/WithTotalCount` (From/To/PageNumber/PageSize)
  + `GET /api/v3/Invoice/Detail`.
- Purchase orders: `GET /api/v3/Bill/WithTotalCount` + `GET /api/v3/Bill/Detail`
  (variants with cost `Price`, and `Payments`).
- Catalogue: `GET /api/v3/Product` (`QueryInventory=true`, paged) with nested `Variants`
  (`Code`, `UnitPrice`, `Inventory`); `GET /api/v3/Variant/Data` has `UnitCost`.
- Stock: `GET /api/v3/Inventory` (paged; `I.OnHand/Allocated/Available/Threshold`).
- Reference: `GET /api/v3/Outlet`, `/Supplier`, `/Customer`, `/PaymentMethod`.
- Rate limits documented per endpoint — sync throttles requests and retries on 429.

## Architecture

### 1. `apps/api/src/dealpos/` — sync module

- `dealpos.client.ts` — token acquisition + caching (refresh before `expiredat`),
  `get/post` helpers with rate-limit-aware retry (429/5xx exponential backoff),
  paginated iteration helpers.
- `dealpos-sync.service.ts` — per-entity sync steps, each upserting by DealPOS ID:
  outlets, suppliers, customers, payment methods, products→**Release** (see mapping),
  inventory→`Release.stock`, invoices (+lines/payments), bills (+lines).
  Sequential by default; each step records progress in `SyncState`.
- `dealpos.controller.ts` — `POST /dealpos/sync` (ADMIN/MANAGER; optional `?entity=`),
  `GET /dealpos/sync/status` (reads `SyncState`).
- CLI: `pnpm --filter @mf/api sync:dealpos` (ts-node script calling the service) for
  first full clone and cron use.
- Incremental: invoices/bills sync from `SyncState.cursor` (last synced `Created`
  timestamp minus 1-day overlap); catalogue/reference entities do full upsert sweeps.

### 2. Prisma additions

Mirror tables (raw-ish, source of truth for Finance): `DpOutlet`, `DpSupplier`,
`DpCustomer`, `DpPaymentMethod`, `DpInvoice` (+`DpInvoiceLine`, `DpInvoicePayment`),
`DpBill` (+`DpBillLine`), and `SyncState` (per-entity cursor/status/last-run).
Amounts are `Decimal`, quantities `Decimal`. `DpInvoice.tag` holds the channel.

`Release` gains: `dealposProductId`, `dealposVariantId` (unique), `costIdr Int?`
(latest known unit cost for COGS display). Product→Release mapping: variant code →
`barcode`/SKU match first, else create; product name split on " – "/" - " into
artist/title (fallback artist "Various"); category → `RecordFormat` heuristic
(LP default); price from `UnitPrice`; stock from Inventory `OnHand`.

### 3. `apps/api/src/finance/` — reporting module (ADMIN/MANAGER)

SQL aggregations over mirror tables (excludes voided invoices):

- `GET /finance/summary?from&to&outlet&tag` — revenue, orders, units, AOV, COGS,
  gross margin (amount + %).
- `GET /finance/timeseries?from&to&granularity=day|week|month` — revenue/orders/margin
  per bucket (for the chart).
- `GET /finance/payments?from&to` — amount/count/share per payment method.
- `GET /finance/margins?from&to&groupBy=release|category|tag` — revenue, COGS, margin
  per group, top-N by revenue.
- `GET /finance/export?report=summary|timeseries|payments|margins&...` — same data as
  CSV (`text/csv` attachment) for the accountant.

### 4. Back-office Finance page

Sidebar: **Finance** directly under Dashboard → route `/finance`.
Page (matches existing Tailwind + CSS-var idiom, monochrome, Noto Sans Mono figures):

- Filter bar: date-range presets (Today/7d/MTD/QTD/YTD/custom) + outlet/channel selects.
- KPI row: Revenue, Orders, AOV, Gross margin %.
- Revenue-over-time chart — dependency-free inline SVG (bars/line), accent-on-canvas.
- Payments reconciliation table (method, amount, count, share).
- Margins table with groupBy toggle (Release / Category / Channel).
- Every section has an Export CSV button hitting `/finance/export`.
- Sync status footer: last successful sync per entity + "Sync now" button (admin).

### 5. Mockup edit (separate concern)

Remove eBay from `mockup-channels.html` + `mockup-channels-mobile.html`: connection
card, channel-list rows, colour-key entry, and its channel CSS class. eBay indicators
on other mockup screens are intentionally left (out of scope per user).

## Error handling

- Sync: per-entity try/catch — one failing entity doesn't abort the run; failures land
  in `SyncState.status/message` and the CLI exit code.
- Client: 401 → re-auth once; 429/5xx → backoff retry (max 5); response shape guards
  (missing fields logged, row skipped, counted in summary).
- Finance endpoints validate date ranges (max 400-day span) and reject unknown groupBy.

## Testing

- Unit: product→Release mapper heuristics; finance aggregation SQL against seeded
  mirror rows; CSV serialisation.
- Integration: finance controller e2e with seeded data (existing jest-e2e setup).
- Manual: full sync against the live account once corrected client secret arrives,
  then spot-check totals against DealPOS's own reports.

## Out of scope

Writing anything back to DealPOS; webhook-based real-time sync (poll/cron is enough);
storefront changes; removing eBay indicators outside the Channels screens.
