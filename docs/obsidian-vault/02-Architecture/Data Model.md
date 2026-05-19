# Data Model

Single source of truth: `prisma/schema.prisma`.
Postgres 16, all decimal money in `Decimal(14, 2)` IDR.

## High-level entity map

```
User ──► CustomerProfile          (1:1 if customer)
User ──► Address (n)
User ──► Order (n) (as customer)
User ──► PosSession (n) (as opener)
User ──► StockMovement (n)
User ──► NewsPost (n)
User ──► AuditLog (n)

Release ──► Track (n)
Release ──► Product (n)

Product ──► Variant (n)

Variant ──► Stock (n)          per Location
Variant ──► StockMovement (n)
Variant ──► ChannelListing (n) per Channel
Variant ──► OrderItem (n)

Channel ──► ChannelListing (n)
Channel ──► Order (n)

Order ──► OrderItem (n)
Order ──► Payment (n)
Order ──► Shipment (n)
Order ──► Address               (shipping)
```

## Why this shape

- **Release vs Product vs Variant** — a single Discogs release (`Cocteau Twins
  — Treasure, 4AD CAD 412, 1984`) can correspond to many *Products* (we might
  sell sealed copy and a worn copy as separate listings with separate prose),
  and each Product has *Variants* by condition / pressing / colour. Stock is
  tracked per Variant.
- **Stock per (Variant, Location)** — composite primary key. `onHand` and
  `reserved` let us avoid oversell during checkout: reserving deducts from
  available without yet moving stock.
- **StockMovement** is the journal — every change to `Stock` writes a movement
  with a reason and a back-pointer (`refType`, `refId`) to the order /
  stocktake / transfer that caused it.
- **ChannelListing** lives between Variant and Channel — captures the
  per-channel state of a single physical copy: marketplace ID, current
  listing status, sync timestamps, raw payload, sync error.
- **Order.channelId** — every order knows which channel it came from. POS
  sessions create POS orders. The website creates WEBSITE orders. Marketplace
  pollers create DISCOGS / TOKOPEDIA / SHOPEE orders.
- **Payment** and **Shipment** are siblings of Order (1:n each) — partial
  refunds and split shipments work out of the box.

## Enum quick reference

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `STAFF`, `SHOPKEEPER`, `WHOLESALER`, `CUSTOMER` |
| `ProductType` | `RELEASE`, `MERCH`, `BOOK`, `ACCESSORY` |
| `ProductStatus` | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| `MediaCondition` | `M`, `NM`, `VG_PLUS`, `VG`, `G_PLUS`, `G`, `F`, `P` |
| `SleeveCondition` | (same as media) + `GENERIC`, `NO_SLEEVE` |
| `LocationType` | `STORE`, `WAREHOUSE` |
| `ChannelType` | `WEBSITE`, `POS`, `DISCOGS`, `TOKOPEDIA`, `SHOPEE` |
| `ListingStatus` | `DRAFT`, `FOR_SALE`, `SOLD`, `SUSPENDED`, `DELETED`, `ERROR` |
| `OrderStatus` | `DRAFT`, `PENDING_PAYMENT`, `PAID`, `PACKED`, `SHIPPED`, `COMPLETED`, `CANCELLED`, `REFUNDED` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `EXPIRED` |
| `ShipmentStatus` | `PENDING`, `LABEL_CREATED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `RETURNED`, `CANCELLED` |
| `StockMovementReason` | `RECEIVING`, `SALE`, `RETURN`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `STOCKTAKE`, `DAMAGE`, `WRITE_OFF` |
| `PromoType` | `PCT`, `FIXED`, `FREE_SHIP` |
| `NewsStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |

## Money

- `priceIdr Decimal(14, 2)` — gross price in IDR (PPN-inclusive by convention).
- `wholesalePriceIdr` — alternative price shown to `WHOLESALER` only.
- `taxRate Decimal(5, 4)` — defaults to `0.1100` (PPN 11%).
- `weightG Int` default `350` — used by Biteship for courier rates and by
  `ShippingPolicy.formatWeightClass` lookups.

## Track previews

`Track` carries `previewSource ∈ {APPLE | YOUTUBE | BANDCAMP | MANUAL | NONE}`,
`previewUrl`, `previewExternalId`, `previewLocked`. The resolve worker
(`jobs/handlers/resolve-tracks.ts`) fills these on import; `previewLocked = true`
prevents the worker from overwriting a manual override.

See [[03-Features/Track Previews]].

## Audit + settings

- `AuditLog` — `entity`, `entityId`, `beforeJson`, `afterJson`, `userId` —
  written on every staff mutation by the API handlers.
- `Setting` — key/value store (e.g. `tax.ppn_rate`, `store.locale_default`).
