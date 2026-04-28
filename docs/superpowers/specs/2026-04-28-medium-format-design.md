# Medium Format — Platform Design Specification
**Date:** 2026-04-28  
**Version:** 1.0  
**Status:** Draft — pending user approval

---

## 1. Overview

Medium Format is a full-stack record shop management platform built for an Indonesian independent record store of the same name. It serves as the single backoffice for managing inventory, orders, customers, payments, and shipping across all sales channels — online store, offline POS, Indonesian marketplaces (Tokopedia, Shopee), and international platforms (Discogs, Bandcamp, Meta, eBay, Google Merchant).

The platform is inspired by common-ground.io but extended significantly for the Indonesian market, with local payment gateways, local couriers, two-way marketplace sync, wholesale management, and a Juno.co.uk-style audio preview player on the storefront.

---

## 2. Core Modules

### 2.1 Inventory Manager
- Centralized catalog: single source of truth for all channels
- Import from Discogs API (release metadata, tracklist, artwork, label, catalogue number auto-populated)
- Bulk import via CSV
- Fields per release: artist, title, label, cat#, year, format, genre, condition (M/VG+/VG/G+/G/F/P), price (IDR), stock count, notes, images
- IDR pricing displayed throughout; USD equivalent shown as secondary
- **Barcode generator:** generate and print barcode labels per item (EAN-13 or Code128); printable label sheets
- **Barcode scanning via any phone:** mobile-optimised web scanner (camera-based, no dedicated hardware required); also supports dedicated Bluetooth barcode scanners
- **Item location tracking:**
  - Store Location: e.g. "Main Store", "Warehouse", "Consignment"
  - In-store location: rack/shelf reference, e.g. "Rack A3 / Shelf 2" — free text + optional predefined location list
- Low stock threshold alerts (configurable per item)
- Categories: Vinyl, CD, Merch & Accessories
- Filter and search: by artist, title, label, format, genre, condition, channel listing status, preview availability, location

### 2.2 Track Preview System
**Auto-linking (runs on Discogs import):**
- System queries Bandcamp, Spotify Search API, and YouTube Data API using artist name + release title + catalogue number
- Best match is set as the active source automatically
- All found sources are stored and available as fallbacks
- Sources ranked: Bandcamp > Spotify > YouTube > SoundCloud

**Manual override:**
- Staff can paste any Bandcamp, Spotify, YouTube, SoundCloud URL, or upload a direct .mp3
- Override applies at the release level (all tracks use that source) or at the individual track level
- Per-track source selector in the backoffice release editor
- "Test preview" button per track before publishing

**Customer-facing storefront:**
- Hover over album art → play button appears
- Click → tracklist expands below the cover with waveform scrubber
- Per-track play buttons in the expanded tracklist
- Persistent Now Playing bar pinned to the bottom of the page (track title, release, source label, progress bar, prev/next)
- "Has audio preview" filter in the storefront

### 2.3 Orders
- Unified order inbox across all channels
- Statuses: Pending → Processing → Packed → Shipped → Delivered → Completed / Cancelled / Refunded
- Filter by channel (Website, POS, Tokopedia, Shopee, Discogs, etc.)
- Order detail: items, customer, shipping address, payment method, courier + tracking number
- Walk-in POS orders recorded from the iOS/Android app

### 2.4 Customers
- Customer profiles with full purchase history
- Wishlist tracking
- Customer groups (Retail, VIP, Wholesale)
- Wholesale accounts: separate login, wholesale-only catalogue view, tiered pricing

### 2.5 Analytics & Reporting
- Dashboard: today's date & time, current revenue, open orders, stock count
- Sales over time chart (3 / 6 / 12 month toggle)
- Recent orders widget (filter: All / Shop / Tokopedia / Shopee / Discogs / Online)
- Sales origins breakdown
- Eshop visitors (Google Analytics integration) + Eshop views (30 / 60 / 90 day toggle)
- Best sellers (tab: All / Releases / Products)
- Top 10 online country sales
- Bandcamp news feed + Discogs news feed (replaces CG News)
- Sales channel performance widget
- CSV export, filterable by date range and channel

### 2.6 Purchase Orders (Procurement)
Full procurement workflow for stocking the store from international suppliers.

**PO Creation:**
- Add items from inventory catalog (or free-text for new items not yet in catalog)
- Specify quantity, expected unit cost (IDR or foreign currency), supplier/seller
- Link to existing Discogs/Bandcamp/label catalog entry where available
- Group POs by country of origin (e.g. Japan batch, UK batch, US batch)

**Payment Tracking:**
- Record payment method per PO: company credit card or personal credit card (employee name)
- Finance notification: automatic alert to finance role when a personal card is used (triggers reimbursement request)
- Payment status: Pending / Paid / Reimbursed / Disputed
- Attach receipt/invoice scan (PDF or image upload)

**Shipment Consolidation:**
- Group multiple POs from the same country into one shipment batch
- Compile all invoices in a batch into a unified packing list
- Estimated weight & dimension calculator per item (using predefined format weights: LP ~180g, CD ~100g, etc., overridable)
- Packing list shows: item list, quantities, declared value, total weight, estimated dimensions
- **AI-assisted (Phase 2):** upload multiple invoice PDFs → AI extracts line items → auto-populates packing list → generates shipper email with packing list + weight summary → sends to shipper contact to request quote and ETA

**Export:**
- Export packing list to PDF
- Export packing list to Google Sheets / CSV
- Export PO summary to PDF (for internal records)

**Shipper Communication:**
- Shipper contact book (name, email, WhatsApp, country coverage)
- Draft email to shipper with packing list attached
- Log of sent emails and shipper responses (ETA, quote)

---

## 3. Sales Channels

### 3.1 Own Website (Eshop)
- Customizable theme (dark default, light mode via toggle)
- Custom domain support
- Genre/format/condition/price filters
- Discogs-enriched release pages (full tracklist, label info, artwork)
- Track preview player (Juno-style, see §2.2)
- "Notify Me" on sold-out items
- SEO-optimised release URLs

### 3.2 POS — Offline Store
- iOS + Android app
- Barcode scanning for checkout
- Walk-in order recording
- Real-time stock sync back to backoffice
- Works offline with sync-on-reconnect

### 3.3 Tokopedia Integration
- OAuth connection via Tokopedia Seller API
- Two-way sync:
  - **Push:** stock levels, prices (with platform fee markup — see §3.5), new listings, delisted items
  - **Pull:** new orders, buyer details, order status updates
- Sync frequency: every 5 minutes (configurable)
- Auto-push stock on every sale across any channel
- Auto-fulfill pulled orders (optional toggle — off by default)
- Conflict resolution UI for price/stock mismatches

### 3.4 Shopee Integration
- OAuth connection via Shopee Open Platform API
- Two-way sync (same as Tokopedia above)
- Separate platform fee configuration (see §3.5)
- Independent sync status and activity log

### 3.5 Marketplace Price Rules (Tokopedia & Shopee)
- Each marketplace has an independent price rule configuration:
  - **Markup %** — e.g. add 5% to cover Tokopedia admin fee + payment fee
  - **Fixed markup (IDR)** — e.g. always add Rp 5,000 for packaging
  - **Combined** — markup % applied first, then fixed amount added
- Price rules are applied automatically when stock is pushed to that channel
- Backoffice always stores and displays the base (own website) price
- Marketplace prices are computed on push; visible in the channel sync panel
- Staff can preview computed prices before pushing
- Per-release manual price override per channel still possible (takes precedence over the rule)
- **Rule change trigger:** when a price rule is saved, a confirmation prompt asks whether to immediately re-push all affected listings to that channel or apply only to future pushes

### 3.6 Discogs
- Inventory import (catalog data, not for active listing sync)
- Marketplace listing: list items for sale on Discogs from backoffice
- Pull Discogs orders into unified order inbox
- International payments via Stripe/PayPal for Discogs orders

### 3.7 Bandcamp
- Import digital sales data (for reporting)
- Bandcamp links used as track preview source

### 3.8 Meta (Facebook & Instagram Marketplace)
- Product publishing via Meta Commerce API
- Stock sync (push only)
- Order notifications pulled into backoffice

### 3.9 eBay
- Product listing and stock push
- Order pull into backoffice

### 3.10 Google Merchant
- Product feed sync (title, price, image, availability)
- Google Search, Google Maps, YouTube Shopping listings
- Structured data for SEO

---

## 4. Payments

### 4.1 Xendit (Local — Indonesia)
Used for all domestic (IDR) transactions on the own website and offline POS.

| Method | Details |
|---|---|
| Virtual Account | BCA, BNI, BRI, Mandiri, Permata |
| E-Wallet | GoPay, OVO, DANA, ShopeePay, LinkAja |
| QRIS | Universal QR code |
| Credit/Debit Card | Visa, Mastercard via Xendit |
| Paylater | Kredivo, Akulaku |
| Retail | Indomaret, Alfamart |

- VA numbers generated per order with 24-hour expiry
- Payment status webhook updates order automatically
- PPN (11%) tax calculation configurable per product type

### 4.2 Stripe (International)
- Used for Discogs orders and international website buyers
- Cards: Visa, Mastercard, Amex, JCB, UnionPay
- Digital wallets: Apple Pay, Google Pay

### 4.3 PayPal (International)
- Alternative for international buyers who prefer PayPal
- Available on website checkout alongside Stripe

---

## 5. Shipping

### 5.1 Local Couriers — via Biteship Aggregator
Biteship provides a single API integration for all Indonesian couriers:
- JNE (REG, YES, OKE)
- J&T Express
- SiCepat (REG, BEST, Cargo)
- Anteraja
- Ninja Xpress
- GoSend (Same Day, Instant)
- GrabExpress

Features:
- Real-time rate calculation at checkout (based on origin postcode → destination postcode + weight/dimensions)
- Automatic tracking number registration
- Tracking status updates pulled into order detail
- Packaging presets (sleeve, mailer, box) with preset weights/dimensions

### 5.2 International Shipping
- **DHL Express** — API rate calculation + label generation
- **FedEx International** — API rate calculation
- **EMS POS Indonesia** — for slower/cheaper international parcels
- Dimensional weight calculation
- Customs declaration fields (HS code, declared value) on checkout for international orders

### 5.3 Shipping Zones
- Domestic zones: Java, Sumatra, Kalimantan, Sulawesi, Papua + remote area surcharge
- International zones: ASEAN, Asia-Pacific, Europe, Americas, Rest of World
- Free shipping threshold configurable per zone

---

## 6. Wholesale / B2B

- Separate wholesale catalogue (subset or full catalog, configurable)
- Tiered price lists: e.g. Tier 1 (10% off), Tier 2 (15% off), assigned per wholesale account
- Wholesale customer login (gated — must be approved by staff)
- Minimum order quantity (MOQ) per item
- Invoice generator with PDF export and NET payment terms
- Credit terms per account (e.g. NET 30)
- Wholesale orders tracked separately from retail in analytics

---

## 7. Marketing

### 7.1 Vouchers
- Generate voucher codes with configurable validity dates
- Types: percentage discount or fixed IDR amount
- Single-use or multi-use (with optional redemption limit)
- Assign to specific customer groups (Retail, Wholesale, VIP)
- Restrict to specific product categories or minimum order value
- Voucher usage report

### 7.2 Newsletter (AI-assisted)
- Campaign creation from:
  - New stock arrivals (auto-pull from recent Inventory additions)
  - Featured/highlighted releases (manually curated)
  - Upcoming events
- **AI campaign draft:** staff selects items → AI generates email copy and subject line
- Drag-and-drop email builder with Medium Format branding
- Schedule send or send immediately
- Subscriber list management (import CSV, opt-in from eshop)
- Open rate / click rate analytics per campaign

### 7.3 Other Marketing Tools
- Discount codes (percentage or fixed IDR, single-use or multi-use)
- New Arrivals automated feed
- WhatsApp Business broadcast integration (for new arrivals, order notifications)
- Instagram feed sync for product posts

### 7.4 Editorial Blog
A staff-written editorial section on the storefront. Serves as content marketing, SEO, and community building.

**Post types:**
- **Staff Picks** — curated selection of records hand-picked by a staff member, with personal notes per release and a linked inventory item (live buy button if in stock, "sold out" if not)
- **Highlights** — editorial spotlight on a release, label, or artist — shorter than a full feature, great for social sharing
- **News** — store news, announcements, restocks, collaborations
- **New Arrivals** — editorial write-up of a fresh batch arrival
- **Reviews** — long-form review of a specific release
- **Features** — artist interviews, label spotlights, genre deep-dives
- **Events** — upcoming in-store events, listening parties, markets

**Backoffice — Post Editor:**
- Rich text editor (block-based: headings, paragraphs, quotes, images, embedded tracks)
- Post type selector (Staff Picks / New Arrivals / Review / Feature / Event)
- Author field (linked to staff profile: name, photo, role e.g. "Vinyl Dept.")
- Featured image upload
- **Staff Picks specific:** inline release picker — search inventory by title/artist → attach release → add personal note per release → shows live stock status and buy button on storefront
- SEO fields: meta title, meta description, slug (auto-generated from post title, editable)
- Status: Draft / Scheduled / Published
- Schedule publish datetime

**Storefront — Blog:**
- `/journal` — blog index page: grid of post cards (featured image, post type badge, title, author, date)
- `/journal/[slug]` — individual post page
- Filter by post type (All / Staff Picks / Reviews / Features / Events)
- **Staff Picks post layout:** intro text → release cards grid (cover art, artist, title, staff note, buy button or "Sold Out")
- Related posts widget at bottom (same post type or same author)
- Social share buttons (WhatsApp, Instagram, X/Twitter)
- SEO-optimised: Open Graph tags, structured data (Article schema)

**Storefront — Homepage integration:**
- "Latest from the Journal" section: 3 most recent posts
- "Staff Picks" widget: latest Staff Picks post with featured releases

---

## 8. UI/UX

### 8.1 Theme System
- Dark theme: default for backoffice and storefront
- Light theme: toggled via a pill switch in the top nav bar
- Preference stored in `localStorage` per user/browser
- Implementation: CSS custom properties (design tokens) — single stylesheet, no duplication
- Both themes cover: backoffice and customer-facing storefront

### 8.2 Backoffice Layout
- Fixed left sidebar navigation (collapsible on small screens)
- 11 top-level modules (see §2 and §3)
- Topbar: store name + location, date, user avatar
- Persistent notification badge on Orders for pending items

### 8.3 Storefront Layout
- Top navigation with category links, search, cart
- Filter sidebar: format, genre, condition, price range, "has preview"
- Release grid: responsive, covers with hover play button
- Track preview: expands inline below card when playing, waveform scrubber shown
- Now Playing bar: fixed bottom, persists while browsing
- Mobile-responsive throughout

---

## 9. Technology Considerations

| Concern | Approach |
|---|---|
| Frontend (backoffice) | React + TypeScript |
| Frontend (storefront) | Next.js (SSR for SEO) |
| Backend API | Node.js / Express or NestJS |
| Database | PostgreSQL |
| Real-time sync | WebSockets or Server-Sent Events for channel sync status |
| Xendit integration | Xendit Node SDK + webhooks |
| Biteship integration | Biteship REST API |
| Discogs integration | Discogs API (OAuth 1.0a) |
| Track preview lookup | Bandcamp oEmbed API + embed player, Spotify Web API, YouTube Data API v3 |
| Auth | JWT + refresh tokens; separate wholesale customer auth |
| Hosting | Cloud (Vercel for storefront, Railway/Render/AWS for API) |

---

## 10. User Roles & Permissions

| Module / Action | Admin | Store Manager / Purchasing | Shopkeeper | Wholesaler | Customer |
|---|---|---|---|---|---|
| Dashboard (full) | Yes | Yes | Read only | No | No |
| Inventory — view | Yes | Yes | Yes | Wholesale cat. only | No |
| Inventory — edit/add | Yes | Yes | No | No | No |
| Inventory — barcode/location | Yes | Yes | Yes | No | No |
| Purchase Orders — create/edit | Yes | Yes | No | No | No |
| Purchase Orders — finance view | Yes | Read only | No | No | No |
| Orders — all channels | Yes | Yes | Yes | Own orders only | Own orders only |
| Orders — POS walk-in | Yes | Yes | Yes | No | No |
| Customers — all | Yes | Yes | No | No | No |
| Vouchers — create/edit | Yes | Yes | No | No | No |
| Vouchers — use at checkout | Yes | Yes | Yes | Yes | Yes |
| Newsletter — create/send | Yes | Yes | No | No | No |
| Channels — connect/configure | Yes | No | No | No | No |
| Payments — configure | Yes | No | No | No | No |
| Shipping — configure | Yes | Yes | No | No | No |
| Wholesale catalogue | Yes | Yes | No | Yes (view+order) | No |
| Wholesale pricing & tiers | Yes | Yes | No | No | No |
| Analytics — full | Yes | Yes | No | No | No |
| Eshop editor | Yes | No | No | No | No |
| Staff accounts — manage | Yes | No | No | No | No |
| Preferences / Settings | Yes | No | No | No | No |

**Role descriptions:**
- **Admin:** Full access to everything. Typically the owner.
- **Store Manager / Purchasing:** Full operational access including purchase orders, inventory, orders, and shipping. Cannot change integrations or staff accounts.
- **Shopkeeper:** Can process walk-in POS sales and view inventory/orders. Cannot edit inventory or access finance.
- **Wholesaler:** Separate login portal. Sees wholesale catalogue with their assigned tier pricing. Can place and track their own orders.
- **Customer:** Standard retail customer. Sees the public storefront. Can track their own orders and manage their wishlist.

## 11. Out of Scope (v1)

- Native mobile app for customers (web-only storefront in v1)
- Accounting/bookkeeping integration (Jurnal, Accurate)
- Multi-location warehouse management
- Consignment tracking
- Automated repricing engine

---

## 11. Out of Scope (v1)

- Native mobile app for customers (web-only storefront in v1)
- Accounting/bookkeeping integration (Jurnal, Accurate)
- Multi-location warehouse management
- Consignment tracking
- Automated repricing engine
- AI-assisted shipment consolidation (Phase 2 — spec in §2.6)

---

## 12. Open Questions

_(resolved during brainstorming — documented for reference)_

1. **Dark/light theme?** → Both, with toggle. Dark is default.
2. **Track preview source?** → Auto-linked on import, manual override available per release and per track.
3. **Tokopedia/Shopee sync direction?** → Two-way. Conflicts surfaced for manual resolution.
4. **Marketplace pricing?** → Independent price rules per marketplace (% markup + fixed IDR amount) to cover platform fees. Base price stored in backoffice; computed price pushed to channel.

---

**Design reference:** Common Ground admin UI (Werkstoff Club screenshot). No emoji icons in the UI — use thin line SVG icons throughout. Dark theme default.

*Mockups saved in `.superpowers/brainstorm/` (9 screens + additional: architecture, nav structure, dashboard, inventory, storefront, theme comparison, channel sync, checkout, track preview manager, updated dashboard, purchase orders, inventory-location, user roles).*
