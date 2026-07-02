# CLAUDE.md — Medium Format

Working guide for this repo. Medium Format is an independent record shop in Jakarta and
the platform that runs it: **storefront**, **back-office**, and **POS**. This repo holds a
clickable HTML **prototype** (design-system v2.1) plus the beginnings of the real app.

## Design system (v2.1) — the rules that matter

Canonical spec: **`DESIGN.md`**. Tokens: **`design-system/tokens.json`** (W3C DTCG) and
**`design-system/tokens.css`**. Handoff: **`design-system/opendesign-handoff.html`**.

- **Monochrome.** Black canvas (dark, default), white (light). The interactive **accent is
  the opposite of the background** (`--accent`/`--accent-text`, which invert per theme).
  There is **no brand colour**.
- **Colour = status only**, with one exception: the **channel colour key** (v2.1) —
  a per-channel hue (`color.channel.*`) shown as a coloured dot + text on a neutral pill,
  on channel indicators only. Never use either for decoration.
- **Type:** `Noto Sans` for all UI; `Noto Sans Mono` **only** for figures that align
  (prices, cat#/SKU/barcode, order/txn IDs, durations). No other fonts.
- **Covers:** album/product art is the monochrome **vinyl-groove disc** — never coloured.
- **Depth:** surface steps + hairlines, radius-8 cards; shadow only on floating things
  (now-playing bar, modals, sheets). Buttons radius 6; pills for chips/badges/toggles.
- **Panel/section header bars (v2.1):** the labelled strip atop a content panel is a solid
  accent bar (black bar/white text in light, inverted in dark). Recipe `.mf-panel-hdr`.
  Applies to panel/section headers **only** — NOT page titles, table column rows,
  sidebar/topbar/nav/footer, or dialog headers. Status badges/channel tags inside a
  header keep their own colour.
- **Theme** is stored in `localStorage['mf-theme']`; dark is default. Every page has a toggle.

## File layout

- `index.html` — prototype **hub** (all screens, Desktop/Mobile toggle, wired flows).
- `preview.html` — **single-file preview** of all 22 screens (Stage + Gallery views).
- `mockup-<screen>.html` + `mockup-<screen>-mobile.html` — the **44 screen mockups**.
  Screens: storefront · release · cart · checkout · confirmation · account · journal;
  dashboard · inventory · locations · release-edit · orders · order-detail · customers ·
  vouchers · newsletter · purchase-orders · news · channels · preferences; pos · pos-checkout.
- `design-system/` — tokens, IMPORT.md, handoff, preview.
- `deploy/` — nginx + Caddy configs, `deploy.sh`, runbook (target: **mediumformat.info**).
- `docs/Medium-Format-Complete-Documentation.pdf` — the complete doc (regenerate from
  `docs/complete-documentation.html`).
- `apps/api` (NestJS) + `apps/backoffice` (React) — the real app (early).

## Conventions for editing mockups

- Each mockup is **self-contained HTML5** (inline `<style>`/`<script>`); only external dep
  is the Google Fonts link. Keep it that way.
- **Reuse chrome** — copy the nav/sidebar/topbar/now-playing from the matching existing
  mockup rather than reinventing it. Back-office sidebar = the **11-module** set
  (Dashboard, Inventory, Orders[pending dot], Customers, Vouchers, Newsletter,
  Purchase Orders, News; Config: Channels, Preferences). Locations is reached from Inventory.
- Cross-link with the exact filenames above; every page has a `◹ Prototype` link to `index.html`.
- After edits, sanity-check: **0** occurrences of `6c63ff` / `Playfair` (legacy purple/serif);
  `Noto Sans` + `Noto Sans Mono` loaded; internal links resolve.

## Key features (where they live)

- **Locations & shelves** — `mockup-locations.html`; per-location allocation in
  `mockup-release-edit.html`.
- **Barcode label printing** — row action + modal in `mockup-inventory.html`.
- **POS payments** — bank **EDC** terminals (BCA/Mandiri/BNI/BRI/CIMB/Permata) + **Xendit**
  gateway (QRIS/VA/e-wallet/card) + cash in `mockup-pos-checkout.html`. Storefront checkout
  uses Xendit.

## Regenerate the documentation PDF

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
  --user-data-dir="$(mktemp -d)" \
  --print-to-pdf="docs/Medium-Format-Complete-Documentation.pdf" \
  "file://$(pwd)/docs/complete-documentation.html"
```

## Deploy the prototype

Static site → `mediumformat.info` on the VPS `vps.lacak.live`. See `deploy/README.md`
(DNS, certbot, `deploy.sh`). Web root = `index.html`, `preview.html`, `404.html`,
`favicon.svg`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `mockup-*.html`, `design-system/`.

## Notes

- Prefer many small, self-contained edits; keep the monochrome discipline above.
- `AGENTS.md` holds additional agent/task notes; this file is the design + prototype guide.
