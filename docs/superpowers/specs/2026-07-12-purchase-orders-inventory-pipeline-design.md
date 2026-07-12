# Purchase Orders → Inventory Pipeline — Design Spec

**Date:** 2026-07-12
**Status:** Approved for planning
**Scope:** Native purchase-order workflow for Medium Format back-office: upload distributor
invoices → parse → (international) forwarder consolidation → landed-cost + per-channel
pricing → receive → update native inventory (`Release`).

---

## 1. Context

Medium Format buys records from international distributors (Alliance/WebAMI, Juno, Secretly, …)
and domestic suppliers. Today the buying data is transcribed by hand into
`import_output/build_tsv.py`, enriched via `discogs_lookup.py`, and pushed to a Google Sheet.
The existing back-office `/purchase-orders` page is only a **read-only view of DealPOS supplier
bills** (`ops.service` → `DpBill`); it is not a real procurement workflow.

This feature builds a **native purchase-order pipeline** in the app (NestJS API + React
back-office + Postgres), making the app the **system of record for purchasing and receiving**.
Stock and cost land in the native `Release` table. DealPOS stays as-is (its bills remain visible
to Finance via the Dp* mirror).

Infrastructure (Postgres + API + back-office behind Traefik at `mediumformat.info/backoffice`,
`/api/v1`) is already deployed and live.

## 2. Goals / Non-goals

**Goals**
- Upload distributor invoices (any layout) and parse line items automatically, with human review.
- Model purchase orders 1:1 with vendor invoices.
- Consolidate **international** POs under a forwarder shipment; ingest the forwarder's IDR
  shipping invoice; allocate freight by weight.
- Compute per-unit landed cost in IDR using the FX rate on the PO order date.
- Compute per-channel selling prices (Shopee, Tokopedia, Website, POS, Discogs).
- Match parsed lines to existing `Release`s (or create draft releases, Discogs-enriched).
- Commit: increment `Release.stock`, set `costIdr`, write per-channel prices.
- Track payment method + credit-card reimbursement with proof attachments.
- PO detail page with a lifecycle stepper + timeline (reusing the order-detail pattern).

**Non-goals (this milestone)**
- Writing anything back to DealPOS.
- Automated purchasing/reordering suggestions.
- Multi-currency accounting/ledger beyond landed-cost capture.
- Storefront/POS changes beyond consuming the new per-channel prices.

## 3. Domain model (Prisma)

New enums:
- `PoOrigin { INTERNATIONAL, DOMESTIC }`
- `PoStatus { DRAFT, SUBMITTED, CONSOLIDATED, PRICED, RECEIVED, INVENTORY_UPDATED, CANCELLED }`
- `PaymentMethod { CREDIT_CARD, BANK_TRANSFER, PAYPAL, CASH, OTHER }`
- `ReimbursementStatus { NOT_REQUIRED, PENDING, REIMBURSED }`
- `SalesChannel { SHOPEE, TOKOPEDIA, WEBSITE, POS, DISCOGS }`
- `PoLineMatchStatus { MATCHED, NEW, AMBIGUOUS }`
- `PoAttachmentKind { VENDOR_INVOICE, FORWARDER_INVOICE, PAYMENT_PROOF, REIMBURSEMENT_PROOF }`
- reuse existing `RecordFormat` for canonical format.

**PurchaseOrder**
- `id`, `number` (e.g. `MF-P20`), `source`/`vendorName`, `origin`, `currency` (USD/EUR/IDR/…)
- `orderDate`, `fxRate` (Decimal, native→IDR), `fxRateSource`, `fxRateManual` (bool)
- `vendorShippingNative` (postage on the vendor invoice)
- `paymentMethod`, `paidBy` (String?), `reimbursementStatus` (default derived from method)
- `status`, `consolidationId?`
- `subtotalNative`, `notes`, `createdById`, `createdAt`, `updatedAt`
- relations: `lines PoLineItem[]`, `attachments PoAttachment[]`, `consolidation?`

**PoLineItem**
- `id`, `poId`, `lineNo`
- parsed: `artist`, `title`, `label?`, `catNumber?`, `barcode?`, `formatRaw`, `format` (RecordFormat),
  `edition?` (variant text), `qty`, `qtyBackorder` (default 0), `unitPriceNative`, `extendedNative`
- costing: `weightKg`, `allocatedVendorShipIdr`, `allocatedForwarderIdr`, `landedCostIdr`
- matching: `discogsId?`, `discogsRaw` (Json?), `releaseId?`, `matchStatus`, `createdRelease` (bool)
- receiving: `storeLocation` (StoreLocation?), `shelfLocation?`
- relation: `channelPrices PoLineChannelPrice[]`

**Consolidation** (forwarder shipment; international only)
- `id`, `number`, `forwarderName`, `forwarderInvoiceIdr` (Decimal), `weightKgTotal?`, `trackingRaw?`
- `status`, `createdAt`; relation `pos PurchaseOrder[]` (1→many)

**PoLineChannelPrice**
- `id`, `lineItemId`, `channel` (SalesChannel), `currency` (IDR|USD), `price` (Decimal),
  `feePctApplied` (Decimal), `overridden` (bool, default false)
- unique `(lineItemId, channel)`

**ChannelPricingConfig** (settings, one row per channel)
- `channel` (PK), `feePct` (Decimal), `rounding` (String enum: `NEAREST_1000` | `X900`),
  `currency` (IDR|USD), `active` (bool)

**PoAttachment**
- `id`, `poId`, `kind` (PoAttachmentKind), `fileUrl`, `mimeType`, `sizeBytes`,
  `uploadedById`, `uploadedAt`

**Release** additions
- keep `stock`, `costIdr`, `priceIdr` (priceIdr = Website/default price for back-compat)
- new **ReleaseChannelPrice**: `id`, `releaseId`, `channel`, `currency`, `price`, `updatedAt`;
  unique `(releaseId, channel)`

**Global pricing knobs** (in ChannelPricingConfig or a small `PricingSettings` singleton):
- `targetMarkup` default `1.2` (→ landed ×2.2), optional per-format override map.

## 4. Lifecycle / state machine

```
DRAFT ─(create from reviewed parse)─▶ SUBMITTED
SUBMITTED ─(intl: attach to consolidation + forwarder invoice + allocate)─▶ CONSOLIDATED
        └─(domestic: skip)──────────────────────────────────────────────────┐
CONSOLIDATED / SUBMITTED(domestic) ─(compute pricing)─▶ PRICED
PRICED ─(confirm units + allocation)─▶ RECEIVED
RECEIVED ─(commit)─▶ INVENTORY_UPDATED
any ─▶ CANCELLED
```

PO detail renders these as the **stepper** (reuse `mockup-order-detail.html` `.stepper`/`.timeline`
CSS). The **Consolidation step is auto-skipped for `DOMESTIC`** POs. A timeline/activity log
records each transition (who, when).

## 5. Invoice parsing

**Provider:** Google **Gemini Flash** via AI Studio free tier — native PDF/image input +
structured JSON output. Wrapped behind an `InvoiceParserProvider` interface so it is pluggable
(alternatives: Mistral OCR, Claude). Provider + API key configured via env.

**Flow:**
1. Upload one or more vendor-invoice PDFs on the New PO page (stored as `PoAttachment`
   kind=VENDOR_INVOICE).
2. `POST /purchase-orders/parse` sends the file to the provider with a strict JSON schema:
   `{ vendorName, orderDate, currency, vendorShipping, lines: [{ artist, title, label,
   catNumber, barcode, formatRaw, edition, qty, qtyBackorder, unitPrice, extended }] }`.
3. **Deterministic validation layer** (ported from `build_tsv.py`):
   - normalize `formatRaw` → canonical `RecordFormat` (e.g. "GATEFOLD 2XLP + MP3" → `TWO_LP`,
     "6 TRACK CD SINGLE" → `CD`, "HI-FI HEADPHONES" → `MERCH`).
   - fill `weightKg` from the format→weight table (port `WEIGHT_LB`, ×0.453592).
   - checks: `qty × unitPrice ≈ extended`; `Σ extended + vendorShipping ≈ invoice total`;
     flag mismatches per line.
4. Return a **draft** (not persisted) → the New PO page shows an **editable grid** for review.
5. On confirm, `POST /purchase-orders` persists the PO + lines.

Accuracy is guaranteed by **human review**, not blind trust. Parser never writes inventory.

## 6. FX

- On parse/create, fetch native→IDR for `orderDate` from a historical FX source
  (exchangerate.host; ECB/Frankfurter fallback for EUR). Store `fxRate` + `fxRateSource` on the PO.
- Manual override (`fxRateManual=true`) if a rate looks wrong.
- Freight from the forwarder is already IDR; vendor postage is native (converted with the same rate).

## 7. Landed cost (weight-based allocation)

Per line:
```
landedCostIdr = unitPriceNative × fxRate
              + allocatedVendorShipIdr        (vendor postage, allocated within the PO by weight)
              + allocatedForwarderIdr          (forwarder freight, allocated across the whole
                                                consolidation by weight; 0 for domestic)
```
Allocation weight for a line = `weightKg × qty`. Vendor postage allocated across the PO's lines;
forwarder freight allocated across **all lines of all POs** in the consolidation.

## 8. Per-channel pricing

```
baseNet      = landedCostIdr × (1 + targetMarkup)          (targetMarkup default 1.2)
channelPrice = roundUp( baseNet / (1 − channelFee%) )      per SalesChannel
```
Seeded `ChannelPricingConfig` defaults (editable in Preferences; verify current rates):

| Channel | feePct | currency | rounding |
|---|---:|---|---|
| POS | 1% | IDR | NEAREST_1000 |
| WEBSITE | 2.5% | IDR | NEAREST_1000 |
| TOKOPEDIA | 6.5% | IDR | X900 |
| SHOPEE | 10% | IDR | X900 |
| DISCOGS | 11% | USD | NEAREST_1000 |

Discogs price computed in USD (landed IDR → USD at current FX, then gross-up). Per-line prices are
editable (`overridden=true` freezes a manual value). Prices stored on `PoLineChannelPrice`, copied
to `ReleaseChannelPrice` on commit.

## 9. Matching & new releases (ported from `import_output`)

Match order per line: **barcode → discogsId → catNumber+format → fuzzy(artist+title+format)**.
- **MATCHED** → on commit: `Release.stock += qty`, update `costIdr` (latest landed), upsert channel prices.
- **NEW** → create a **draft `Release`** from parsed fields, optionally enriched via **Discogs
  lookup** (barcode→catno→text strategy from `discogs_lookup.py`; reuse existing token) for
  canonical barcode / discogsId / image / genre / year.
- **AMBIGUOUS** → surfaced in review UI for the user to pick/confirm before commit.

## 10. Payment & reimbursement

- New PO captures `paymentMethod`. If **CREDIT_CARD**: show `paidBy`, `reimbursementStatus`
  (default PENDING), and require a **PAYMENT_PROOF** attachment (receipt / card statement).
  REIMBURSEMENT_PROOF can be added when marked REIMBURSED.
- Non-credit methods default `reimbursementStatus = NOT_REQUIRED`.
- Validation blocks PO submit if method=CREDIT_CARD and no PAYMENT_PROOF attached.

## 11. File storage

- Local `mf_uploads` Docker volume mounted into the API container (`/data/uploads`).
- Files served through an **authenticated** API route (`GET /purchase-orders/attachments/:id`),
  never public. Path kept out of git; included in the stack backup.
- Keeps deployment portable (no dependency on lacak Supabase storage).

## 12. API — new `purchase-orders` module

- `POST /purchase-orders/parse` — multipart upload → returns draft (no persistence).
- `POST /purchase-orders` — create from reviewed draft (+ payment fields).
- `GET /purchase-orders` — native PO list (supersedes Dp-bills view; Dp bills stay for Finance).
- `GET /purchase-orders/:id` — detail (lines, attachments, consolidation, timeline).
- `POST /purchase-orders/:id/attachments` — upload (kind).
- `GET /purchase-orders/attachments/:id` — authenticated file fetch.
- `POST /consolidations` · `POST /consolidations/:id/pos` (attach) ·
  `POST /consolidations/:id/forwarder-invoice` (upload + allocate).
- `POST /purchase-orders/:id/price` — compute landed cost + channel prices.
- `POST /purchase-orders/:id/receive` — confirm units + allocation.
- `POST /purchase-orders/:id/commit` — write `Release.stock` + `costIdr` + channel prices.
- `GET/PUT /settings/channel-pricing` — fee/rounding/markup config.

All mutating endpoints are role-guarded (ADMIN/MANAGER).

## 13. Back-office pages

- **New PO** `/purchase-orders/new` — upload invoice(s) → parsed editable grid → set
  origin/vendor/date/FX + **payment method (+ reimbursement proof if credit card)** → Create.
- **PO list** `/purchase-orders` — native POs with status/origin/totals; "Create PO" CTA.
- **PO detail** `/purchase-orders/:id` — lifecycle **stepper** + **timeline**, line items
  (landed cost + per-channel prices), attachments, per-stage action buttons.
- **Consolidation** — attach international POs, upload forwarder invoice, view freight allocation
  (own page or a panel in PO detail).
- **Channel pricing settings** — in Preferences (fees, rounding, markup).

All pages reuse the design-system v2.1 chrome + the 11-module sidebar; mono font for figures.

## 14. Secrets / dependencies

- **Gemini API key** (`GEMINI_API_KEY`) in `api.env` — invoice parsing.
- **Discogs token** (reuse from `import_output`) in `api.env` — enrichment.
- API deps: multipart upload (Multer), a PDF→image step if needed, an FX fetch, provider SDK/HTTP.
- New Docker volume `mf_uploads`.

## 15. Implementation phases (each independently testable)

1. **Schema + migration** — new models/enums, `Release` channel prices, seed `ChannelPricingConfig`.
2. **Parsing service** — provider interface + Gemini impl + validation/normalization + `/parse`.
3. **PO CRUD + attachments + payment/reimbursement** — create/list/detail, file storage.
4. **Consolidation + forwarder invoice + weight allocation** (international).
5. **Pricing engine** — FX, landed cost, per-channel prices, settings.
6. **Matching + Discogs enrichment + commit to inventory.**
7. **Back-office UI** — New PO, list, detail (stepper/timeline), consolidation, settings.

## 16. Testing

- Unit: format normalization, weight table, freight allocation math, landed-cost, channel-price
  gross-up + rounding, FX stamping, match ranking.
- Integration: `/parse` against the three real fixtures in `shipper_invoice/` (assert line counts,
  totals reconcile); commit updates `Release.stock`/`costIdr`/channel prices; reimbursement
  validation.
- E2E (Playwright): New PO upload→review→create; intl consolidation; price; receive; commit.
- Coverage target 80%+ per repo rules.

## 17. Open assumptions (flag if wrong)

- One vendor invoice = one PO; one forwarder invoice = one consolidation (confirmed).
- Weight-based freight allocation (confirmed); weight table ported from `build_tsv.py`.
- `targetMarkup` default ×2.2, configurable (confirmed).
- Channel fee defaults are starting values to be tuned in settings; live-verify before go-live.
- Domestic POs currently rare; still supported (skip consolidation).
- Discogs channel priced in USD; others IDR.
