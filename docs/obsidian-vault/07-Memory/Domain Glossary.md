# Domain Glossary

## Records & metadata

- **Release** — a Discogs identity for an album/single (artist + title +
  label + catno + year). Cached in our DB as `Release`.
- **Catno** — catalogue number on the label (e.g. `R&S RS 9007`).
- **Pressing** — a particular manufacturing run of a release. Often
  different year/country than the original Release year.
- **Track** — a song on a release, with side/position (`A1`, `B3`, `D2`).
- **Track preview** — a 30-second clip on a release page, sourced from
  Apple Music, Bandcamp or YouTube.

## Conditions (Goldmine grading)

- **M** — Mint, sealed.
- **NM** — Near Mint, looks unplayed.
- **VG+** — Very Good Plus, minor signs of play.
- **VG** — Very Good, audible surface noise.
- **G+ / G** — Good, plays but heavily worn.
- **F** — Fair, plays through.
- **P** — Poor, distortion.

Sleeves additionally: **GENERIC** (white inner / plain), **NO_SLEEVE**.

## Inventory

- **Variant** — a sellable SKU. Stock is tracked per Variant, not per Product.
- **SKU** — Stock Keeping Unit. Our internal id, e.g. `MF-RS9007-001`.
- **Internal barcode** — Code128 we print on a sticker. Unique.
- **External barcode** — UPC/EAN if the label printed one. Optional.
- **On-hand** — physical units present.
- **Reserved** — units committed to an unfinished order.
- **Available** — `onHand - reserved`.

## Channels

- **Channel** — a place we sell. `WEBSITE`, `POS`, `DISCOGS`, `TOKOPEDIA`, `SHOPEE`.
- **ChannelListing** — the per-channel record for a Variant: marketplace id,
  price, status, last sync.
- **POS** — Point of Sale, the in-store register.
- **Toko Medium Format** — the physical store name (toko = shop in Indonesian).
- **Listmonk** — the self-hosted newsletter tool.

## Indonesian money / tax / shipping

- **IDR** — Indonesian rupiah. Stored as `Decimal(14, 2)`.
- **PPN** — Pajak Pertambahan Nilai. Indonesian VAT, currently 11%.
- **QRIS** — Quick Response Code Indonesian Standard, universal QR-pay rail.
- **OVO / GoPay / DANA / ShopeePay** — Indonesian e-wallets (we accept via Xendit).
- **VA** — Virtual Account, bank-transfer rail with auto-reconciliation.
- **AWB** — Air Waybill, the courier tracking number.
- **Biteship** — Indonesian shipping aggregator (JNE / J&T / SiCepat / etc.).
- **Xendit** — Indonesian payments aggregator (QRIS / VA / e-wallet / card).

## Roles

- **ADMIN** — full access; the shop owner.
- **STAFF** — counter staff plus office (catalog, inventory, orders, etc.).
- **SHOPKEEPER** — counter only (POS + catalog read).
- **WHOLESALER** — external — sees `/wholesale` pricing.
- **CUSTOMER** — external — normal shopper.

## System

- **BullMQ** — Redis-backed job queue we use for async work.
- **Auth.js** — the auth library, also called next-auth.
- **Audit log** — append-only `AuditLog` table tracking staff mutations.
