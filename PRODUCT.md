# PRODUCT.md — Medium Format

> Synthesized from CLAUDE.md, DESIGN.md, and the deployed screen mockups.
> Medium Format is an independent record shop in Jakarta and the platform that
> runs it: **storefront**, **back-office**, and **POS**.

## Register

`product` — the back-office and POS are operational tools. Design **serves** the
work: dense, fast, legible under load. (The public storefront is `brand`, but
this file governs internal app work.)

## Users

- **Shop owner / manager** (e.g. "Raka Pratama, Owner") — watches sales, margins,
  stock, cash. Wants the day's numbers at a glance and the ability to drill in.
- **Counter staff / cashier** — runs the register (POS), rings up walk-ins,
  takes payment (bank EDC, Xendit QRIS/VA/e-wallet/card, cash).
- **Buyer / merchandiser** — manages inventory, purchase orders, releases,
  channels, vouchers.

Context: a working record shop in Jakarta. Screens are used on a shop counter,
a back-office laptop, and a phone. Indonesian Rupiah (IDR) is the money.
DealPOS is the **legacy source of record**, being migrated onto this platform —
its data (sales, customers, bills, payment methods) is mirrored in read-only
tables; the custom POS is what replaces it going forward.

## Brand & tone

- **Monochrome discipline.** Black canvas (dark, default), white (light). The
  interactive accent is the opposite of the background. **No brand colour.**
- **Colour = status only**, with one exception: the per-channel colour key
  (a coloured dot + text on a neutral pill) on channel indicators only.
- **Covers are the vinyl-groove disc** — album art is never coloured.
- Tone: plain, modern, understated, confident. Sentence case. Numbers that must
  align are set in Geist Mono. No decoration for its own sake.

## Anti-references

- SaaS dashboard-by-numbers: sidebar + identical stat cards + one gradient accent.
- Colourful admin themes, category-reflex palettes, hero-metric templates.
- Anything that reads as "AI made that": uniform card grids, decorative glass,
  gradient text, side-stripe accents.

## Strategic principles

1. **Legibility under density** beats visual flourish. This is an operator's tool.
2. **Every colour is a signal.** If it isn't status or a channel key, it's grey.
3. **Numbers are first-class.** Mono, tabular, right-aligned, never truncated silently.
4. **The catalogue and the artwork are what you look at** — chrome stays quiet.
5. **DealPOS is a data source, not the future.** The custom POS is the destination.
