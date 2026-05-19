# Product Vision

## One-liner

> A unified backend for Medium Format — Jakarta's independent record shop —
> running website, POS, Discogs, Tokopedia and Shopee from a single inventory.

## Why

Common-Ground.io ([common-ground.io](https://common-ground.io)) does this for
European record shops, but:

- doesn't speak Indonesian rupiah, Indonesian taxation (PPN 11%) or Indonesian
  shipping/payment rails (Xendit, Biteship, Tokopedia, Shopee);
- is closed-source SaaS.

This app is the **Indonesia-native equivalent**, owned and self-hosted by Medium
Format.

## Pillars

1. **Single inventory across channels.** A copy of *Cocteau Twins – Treasure*
   that sells on Discogs must instantly disappear from the website and the POS.
2. **POS works without internet at the desk.** Optimised for the front-of-store
   tablet — barcode scan → cart → cash/QRIS → receipt + label.
3. **Discogs first.** Catalog and metadata derived from Discogs releases;
   listings sync both ways with the Marketplace.
4. **Indonesian first.** Default language `id-ID`, currency IDR, taxation
   PPN 11%, payments via Xendit (QRIS / OVO / GoPay / VA / cards), shipping via
   Biteship aggregator.
5. **Curated content.** News posts, track previews, wantlist — the site should
   feel like a record shop, not a Shopify clone.

## Non-goals

- Multi-tenant SaaS for other shops (single-tenant only).
- Mobile apps (the responsive web POS is enough).
- Custom payment gateway integrations beyond Xendit (Xendit aggregates the rest).
- Replacing Listmonk for newsletter — we wrap it, not rebuild it.

## Inspirations

- [common-ground.io](https://common-ground.io) — overall structure
- [juno.co.uk](https://juno.co.uk) — track preview UX
- [bleep.com](https://bleep.com) — release pages
- [boomkat.com](https://boomkat.com) — editorial / news cadence
