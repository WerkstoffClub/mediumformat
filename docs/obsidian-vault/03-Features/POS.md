# POS (Point of Sale)

`/admin/pos` — front-of-store register.

> Targeted at MVP-2. Scaffolding exists; full UX still to be built.

## Roles allowed

`ADMIN`, `STAFF`, `SHOPKEEPER` — see `lib/permissions.ts` (`pos.sell`, `pos.session`).

## Cashbox lifecycle

1. **Open session** — pick Location, enter `openingFloat` (cash on hand).
   Writes `PosSession` row.
2. **Sell** — repeated. Each sale is an `Order` with `channelId = ch-pos`.
3. **Close session** — count drawer, enter `closingCount`, app reports variance.
   Writes `closedAt` + optional `notes`.

## Sell flow

1. Scan barcode (`internalBarcode` or `extBarcode`) — `@zxing/browser` reads
   the camera or scanner.
2. Cart accumulates `OrderItem` rows; price defaults to `Variant.priceIdr`.
3. Discount (manual or promo code) → updates `Order.discount`.
4. Tender:
   - **Cash** — `Payment{gateway: "CASH"}`.
   - **QRIS** — `Payment{gateway: "XENDIT", method: "QRIS"}`. POS shows a
     QR code on screen for the customer to scan; we poll Xendit for paid status.
   - **Card** — out-of-band terminal; staff confirms then we record
     `Payment{gateway: "POS_CARD"}`.
   - **Bank transfer** — `Payment{gateway: "BANK_TRANSFER"}` (rare in store).
5. Receipt — ESC/POS print over USB / network thermal printer.

## Barcode labelling

`lib/barcode/render.ts` (uses `bwip-js`) renders an SVG Code128 barcode for
the variant's `internalBarcode`. Staff prints a sticker per copy when goods
arrive.

## Offline behaviour

V1: requires connectivity (we still call Xendit for QRIS). Cash-only
sales degrade gracefully — queue stock movements locally; sync on reconnect.
(Not yet implemented — flagged as a v2 enhancement.)
