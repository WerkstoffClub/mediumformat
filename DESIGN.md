# DESIGN.md — Medium Format

> An independent record shop in Jakarta, and the platform that runs it.
> The system is black and white: a near-black canvas in the dark theme, white in
> the light theme, and one neutral grey scale in between. Geist sets every
> word; Geist Mono sets the numbers that have to line up — prices, catalogue
> numbers, barcodes. The only mark with any expression is the logomark, a record
> seen side-on. Everything else stays plain so the records and the artwork are
> what you look at.

**Use this file for any Medium Format UI work** — storefront, back-office, or POS.
Best results in: dark-first commerce UIs, catalogue and grid layouts, music
players, and dense operational dashboards.

- **Character:** plain, modern, understated
- **Surfaces:** black by default, white in the light theme
- **Colour discipline:** the brand is monochrome; colour appears only to signal status (stock, orders)
- **Type:** Geist (interface) · Geist Mono (numbers) · the logomark + wordmark for the brand itself
- **Tokens:** every value here is also in `design-system/tokens.json` as standard W3C design tokens — import-ready for OpenDesign, Penpot, Figma (Tokens Studio) and code. See `design-system/IMPORT.md`.

---

## 01 / Color Palette

Black and white carry the whole system. In the dark theme the canvas is true
black and text is white; in the light theme that flips. A single neutral grey
scale handles surfaces, borders and secondary text. There is no brand accent
colour — the interactive accent is simply the opposite of the background. A
small status set exists only to mark stock and order state.

### Brand

| Token | Name | Hex | Use |
|---|---|---|---|
| `brand.black` | Black | `#000000` | Brand black. Logo on light, primary text on light, primary action on the light theme |
| `brand.white` | White | `#FFFFFF` | Brand white. Logo on dark, primary text on dark, primary action on the dark theme |

### Surface — Dark theme (default)

| Token | Name | Hex | Use |
|---|---|---|---|
| `surface.canvas` | Canvas | `#000000` | App and page background |
| `surface.base` | Surface | `#0E0E0E` | Cards, sidebar, panels, modals |
| `surface.raised` | Surface Raised | `#1A1A1A` | Inputs, hovered rows, chips |
| `surface.hairline` | Hairline | `#2A2A2A` | Borders, dividers, inactive outlines |

### Text — Dark theme

| Token | Name | Hex | Use |
|---|---|---|---|
| `text.ink` | Ink | `#FFFFFF` | Headings and primary text |
| `text.body` | Body | `#B4B4B4` | Body copy, secondary text |
| `text.mute` | Mute | `#6E6E6E` | Placeholders, metadata, inactive labels |
| `text.on-accent` | On Accent | `#000000` | Text/icons on a white surface (e.g. primary button) |

### Surface & Text — Light theme

| Token | Name | Hex | Use |
|---|---|---|---|
| `light.canvas` | Canvas | `#FFFFFF` | Light background |
| `light.base` | Surface | `#FFFFFF` | Cards and panels on light |
| `light.raised` | Raised | `#F5F5F5` | Inputs, hovered rows on light |
| `light.hairline` | Hairline | `#E4E4E4` | Borders on light |
| `light.ink` | Ink | `#000000` | Primary text on light |
| `light.body` | Body | `#525252` | Body text on light |
> On the light theme the primary button flips to **Black `#000000` fill + White text**.

### Semantic — status only

The brand has no colour, so colour does one job: it tells you the state of stock
or an order. Each value pairs with a 12% tint for badge backgrounds. Do not use
these for emphasis or decoration.

| Token | Hex | Tint | Maps to |
|---|---|---|---|
| `status.success` | `#22C55E` | `rgba(34,197,94,0.12)` | In stock · Delivered · Completed · Paid |
| `status.info` | `#3B82F6` | `rgba(59,130,246,0.12)` | Processing · Packed · Synced |
| `status.warning` | `#F59E0B` | `rgba(245,158,11,0.12)` | Pending · Low stock · Reimbursement due |
| `status.danger` | `#EF4444` | `rgba(239,68,68,0.12)` | Cancelled · Refunded · Out of stock · Disputed |

---

## 02 / Typography Scale

One family does almost everything: **Geist**, in Regular (400), Medium (500)
and SemiBold (600). **Geist Mono** is used only where figures must align —
IDR prices, catalogue numbers, SKUs, barcodes, order IDs. Headings use SemiBold;
body is Regular. Sentence case throughout; UPPERCASE is reserved for small
labels.

| Token | Size / Weight / Line | Face | Use |
|---|---|---|---|
| `display-xl` | 40 / 600 / 48 | Geist | Storefront hero, marketing headlines |
| `display-lg` | 32 / 600 / 40 | Geist | Page hero, campaign titles |
| `h1` | 24 / 600 / 32 | Geist | Page titles |
| `h2` | 20 / 600 / 28 | Geist | Section headings, modal titles |
| `h3` | 16 / 600 / 24 | Geist | Sub-headings, release title on cards |
| `body-lg` | 16 / 400 / 24 | Geist | Lead paragraphs, editorial body |
| `body` | 14 / 400 / 20 | Geist | Default UI text |
| `body-medium` | 14 / 500 / 20 | Geist | Emphasis, button labels |
| `small` | 13 / 400 / 18 | Geist | Captions, secondary metadata |
| `label` | 12 / 500 / 16 · UPPERCASE · +0.04em | Geist | Field labels, table headers, badges |
| `mono-price` | 14 / 500 / 20 | Geist Mono | IDR price (USD secondary, in `small` mute) |
| `mono-meta` | 12 / 400 / 16 | Geist Mono | Catalogue no., SKU, barcode, order ID |

---

## 03 / Button Variants

One filled button per view points to the main action; it is white on the dark
theme and black on the light theme. Everything else is an outline or plain text.
Default radius is 6 px. Pills are kept for filters and status so those read as a
separate family of controls.

| Variant | Spec | Use |
|---|---|---|
| `button-primary` | dark: bg `#FFFFFF` / text `#000000` · light: bg `#000000` / text `#FFFFFF` · radius 6 · pad 10 16 · body-medium | The main action — Add to cart, Save, Create |
| `button-secondary` | transparent · text ink · 1px hairline · radius 6 · pad 10 16 | Secondary actions next to a primary |
| `button-ghost` | transparent · text body · no border · hover bg raised | Tertiary actions, toolbar items |
| `button-destructive` | transparent · text `#EF4444` · 1px `rgba(239,68,68,0.4)` · radius 6 | Cancel, Refund, Delete |
| `button-icon` | 36×36 · radius 6 · ghost chrome · 20px icon | Icon-only toolbar buttons |
| `filter-chip` | radius 999 · pad 4 12 · small. **Active:** 1px ink + ink text. **Inactive:** 1px hairline + mute text, hover border body | Format / genre / condition filters |

**Sizes** — `sm` pad 6 12 (~32px) · `md` pad 10 16 (~40px, default) · `lg` pad 12 20 (~48px).
**Focus** — 2px ring in the accent colour (white on dark, black on light) on every interactive element.

---

## 04 / Cards & Containers

Cards round to 8 px and lean on surface contrast (`#0E0E0E` on `#000000`) plus a
hairline, not shadow. The release card is the one container with any flourish — a
square cover that shows a play button on hover.

| Component | Spec | Notes |
|---|---|---|
| `card` | bg `#0E0E0E` · radius 8 · 1px `#2A2A2A` · pad 16–20 | Default flat container |
| `card-raised` | bg `#1A1A1A` · radius 8 · no border | Hover / selected state |
| `release-card` | square 1:1 cover (bg `#0E0E0E`) · radius 8 · hover reveals play overlay | Artist (body-medium) · title (small mute) · price (mono-price) · stock badge top-left · "has preview" dot |
| `panel` | bg `#0E0E0E` · 1px hairline on the join edge | Sidebar, filter rail, detail drawer |
| `table-row` | 1px `#2A2A2A` bottom · hover bg `#1A1A1A` · py 12 | Inventory and order lists |
| `modal` | bg `#0E0E0E` · radius 12 · Level 3 shadow · max-w 480–640 | Dialogs, confirmations |

---

## 05 / Form Elements

Inputs sit on the raised surface with a 6 px radius and a focus border in the
accent colour. Labels use the `label` style — 12 px uppercase mute — above the
field.

| Element | Spec |
|---|---|
| `text-input` | bg `#1A1A1A` · 1px `#2A2A2A` · radius 6 · pad 10 12 · body · placeholder mute · focus 1px accent |
| `search-input` | text-input chrome + leading 16px search icon · full-width in the topbar and filter rail |
| `select` / `textarea` | text-input chrome; textarea min-height 96 |
| `checkbox` | 16×16 · radius 4 · checked fills with the accent colour and an inverse tick |
| `radio` | 16×16 circle · checked accent dot |
| `theme-toggle` | pill track · sun/moon thumb · stores preference in localStorage |
| `field-label` | label style above the input · required marked with a small dot |

---

## 06 / Spacing Scale

Base unit 4 px. Card padding sits at 16–20; page gutters at 24–32; sidebar nav
items use px 12 / py 8 with a 12 gap between icon and label.

| Token | Value | Typical use |
|---|---|---|
| `xxs` | 4 | Icon-to-text gaps, tight stacks |
| `xs` | 8 | Chip padding, inline gaps |
| `sm` | 12 | Compact control padding, list gaps |
| `md` | 16 | Default card padding, form rows |
| `lg` | 20 | Roomier card padding |
| `xl` | 24 | Page padding, block spacing |
| `2xl` | 32 | Section gutters |
| `3xl` | 40 | Major section breaks |
| `4xl` | 48 | Hero spacing |
| `5xl` | 64 | Landing / marketing rhythm |

---

## 07 / Border Radius Scale

Mostly soft-square. The pill is reserved for filters and status badges so they
read as a distinct control family; cards sit at 8 px.

| Token | Value | Use |
|---|---|---|
| `none` | 0 | Full-bleed covers, table edges |
| `sm` | 4 | Checkboxes, small tags, inner elements |
| `md` | 6 | Buttons, inputs — the default interactive radius |
| `lg` | 8 | Cards, album covers, panels — the canonical card radius |
| `xl` | 12 | Modals, large surfaces |
| `pill` | 999 | Filter chips, status badges, theme toggle |
| `full` | 9999 | Avatars, circular icon containers |

---

## 08 / Elevation & Depth

A black UI gets depth from surface steps and hairlines, not heavy shadow. Four
levels; shadow appears only on things that genuinely float — menus, modals, and
the Now Playing bar.

| Level | Shadow | Use |
|---|---|---|
| `0 — Flat` | none | Default. Depth via `#0E0E0E` on `#000000` + hairline |
| `1 — Drop` | `0 1 2 rgba(0,0,0,0.5)` | Dropdowns, popovers, tooltips |
| `2 — Float` | `0 4 12 rgba(0,0,0,0.6)` | Now Playing bar, sticky bars |
| `3 — Dialog` | `0 8 24 rgba(0,0,0,0.7)` | Modals, command palette |
| `focus` | `0 0 0 2px` accent at 60% | Keyboard focus on any control |

---

## 09 / Signature Components

The components that make a screen recognisably Medium Format, even with the logo
removed.

### Release Card
The storefront atom. Square album cover on `#0E0E0E`; on hover a play button
fades in and the tracklist can expand below with a waveform scrubber. Beneath the
cover: **artist** (body-medium), **title** (small mute), **price** (`mono-price`,
IDR primary / USD secondary). A **stock badge** sits top-left; a small dot marks
"has audio preview".

### Now Playing Bar
Fixed to the bottom of every storefront page, full width, `surface.base` with a
hairline top and Level 2 float. Holds: cover thumbnail, track title, "release ·
source" label (Bandcamp / Spotify / YouTube), a progress scrubber filled in the
accent colour, and prev / play / next. Stays put while browsing.

### Filter Chip Row
A horizontal row of `filter-chip` controls for format, genre, condition, price
and "has preview". The active chip is outlined in the accent colour; inactive
chips use a hairline outline and mute text. Scrolls horizontally on mobile.

### Back-office Sidebar
Fixed left rail on `surface.base`, collapsible on small screens. Eleven
top-level modules as icon + label items (`px-3 py-2`, radius 6, 12 gap). The
**Orders** item carries a small dot badge for pending items.

### Status Badge
A pill using the semantic palette and a 12% tint. Order lifecycle: Pending →
Processing → Packed → Shipped → Delivered → Completed, plus Cancelled / Refunded.
Stock: In stock / Low / Out.

### Condition Grade & Channel Tags
A `mono-meta` grade tag (M / VG+ / VG / G+ / G / F / P) in a neutral pill, and a
channel tag (Website / POS / Tokopedia / Shopee / Discogs / Bandcamp / eBay) for
the unified order inbox.

---

## 10 / Responsive Behaviour

Mobile-first. The storefront is a public catalogue, the back-office is a dense
operational tool, and the POS is a native touch app — each collapses
differently.

| Name | Width | Key changes |
|---|---|---|
| Mobile | < 640 | Storefront grid 2-up; filter rail → bottom drawer; sidebar → hamburger; tables → stacked cards; Now Playing bar stays pinned |
| Tablet | 640–1024 | Grid 3–4-up; sidebar collapses to icons; tables scroll horizontally |
| Desktop | 1024–1280 | Grid 5-up; full sidebar with labels; full tables |
| Wide | ≥ 1280 | Grid 6-up; content caps ~1280 and centres |

**Touch targets** — every interactive control renders ≥ 44 px tall on touch
viewports (chips inflate via padding). **POS app** (iOS/Android) reuses the same
tokens with larger tap targets and a camera-based barcode scanner. **Theme** —
dark is the default across storefront and back-office; the light theme is toggled
from the topbar and stored per browser.

---

## Using these tokens in a design tool

The values above are mirrored in two ready-to-use files:

- **`design-system/tokens.json`** — standard W3C Design Tokens (DTCG) format.
  Import it into OpenDesign or Penpot directly, or into Figma via the Tokens
  Studio plugin, and every colour, text style, spacing step, radius and shadow
  arrives as named, themeable styles. Step-by-step instructions are in
  **`design-system/IMPORT.md`**.
- **`design-system/tokens.css`** — the same tokens as CSS custom properties for
  engineers, with example component recipes.

---

*Medium Format — Confidential © 2026. Design system derived from the Medium
Format brand assets (2026) and Platform Design Specification v1.0. Format follows
the DESIGN.md convention (getdesign.md).*
