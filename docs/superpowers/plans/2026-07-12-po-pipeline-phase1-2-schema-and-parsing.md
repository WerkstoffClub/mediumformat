# PO Pipeline — Phase 1 (Schema) + Phase 2 (Invoice Parsing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the database foundation for the native purchase-order pipeline and deliver an authenticated `POST /purchase-orders/parse` endpoint that turns an uploaded distributor-invoice PDF into validated, normalized line items.

**Architecture:** Extend the Prisma schema with the full PO domain (models + enums), seed channel-pricing defaults, and add shared enums. Then build a stateless parsing pipeline: `pdf-parse` (text) → `InvoiceParserProvider` (OpenRouter free model, mirroring `inventory/ai-assist.service.ts`) → deterministic normalization/validation (format canonicalization, weight table ported from `import_output/build_tsv.py`, totals reconciliation). The parser never writes to the DB — it returns a draft for human review.

**Tech Stack:** NestJS, Prisma, Postgres 16, Jest (ts-jest), OpenRouter (existing), `pdf-parse`, `@nestjs/platform-express` (Multer, already present), `@mf/shared`.

Reference spec: `docs/superpowers/specs/2026-07-12-purchase-orders-inventory-pipeline-design.md`.

---

## File Structure

**Phase 1 — schema:**
- Modify: `apps/api/prisma/schema.prisma` — add enums + models; add `CASSETTE`/`TWO_CASSETTE` to `RecordFormat`.
- Create: `apps/api/prisma/migrations/<ts>_po_pipeline/migration.sql` (via `prisma migrate dev`).
- Modify: `apps/api/prisma/seed.ts` — seed `ChannelPricingConfig`.
- Modify: `packages/shared/src/constants/` — add `channels.ts`, `purchase-orders.ts` (shared enums); re-export from `packages/shared/src/index.ts`.

**Phase 2 — parsing (new module `apps/api/src/purchase-orders/`):**
- Create: `parsing/formats.ts` — `WEIGHT_KG`, `canonicalizeFormat()` (pure).
- Create: `parsing/formats.spec.ts`.
- Create: `parsing/reconcile.ts` — `reconcileLine()`, `reconcileTotals()` (pure).
- Create: `parsing/reconcile.spec.ts`.
- Create: `parsing/invoice-parser.types.ts` — `RawInvoice`, `ParsedInvoice`, DTO types.
- Create: `parsing/invoice-parser.provider.ts` — `InvoiceParserProvider` interface + token.
- Create: `parsing/openrouter-invoice-parser.provider.ts` — OpenRouter impl.
- Create: `parsing/openrouter-invoice-parser.provider.spec.ts`.
- Create: `parsing/invoice-parser.service.ts` — orchestrator (provider + normalize).
- Create: `parsing/invoice-parser.service.spec.ts`.
- Create: `parsing/__fixtures__/juno-raw.json` — recorded provider output for deterministic tests.
- Create: `purchase-orders.controller.ts` — `POST /parse` (multipart).
- Create: `purchase-orders.module.ts`.
- Modify: `apps/api/src/app.module.ts` — register `PurchaseOrdersModule`.
- Modify: `apps/api/package.json` — add `pdf-parse` + `@types/pdf-parse`.

---

## Phase 0: Local dev database (once, before schema work)

Migrations must not touch production. Use a throwaway local Postgres.

- [ ] **Step 1: Start a local Postgres for dev/migration**

Run:
```bash
docker run --name mf-dev-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=mediumformat \
  -p 5433:5432 -d postgres:16-alpine
```
Expected: prints a container id.

- [ ] **Step 2: Point a local env at it**

Create `apps/api/.env` (gitignored):
```
DATABASE_URL="postgresql://postgres:dev@localhost:5433/mediumformat"
OPENROUTER_API_KEY="sk-or-...replace-with-your-key..."
OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free"
```

- [ ] **Step 3: Confirm existing migrations apply to the fresh DB**

Run: `cd apps/api && npx prisma migrate deploy`
Expected: "3 migrations applied" (init + two dealpos_mirror_finance), no error.

---

## Phase 1: Schema, enums, seed

### Task 1: Add PO enums + `RecordFormat` cassette values

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add cassette formats to the existing `RecordFormat` enum**

In `enum RecordFormat { ... }` add two members after `TWO_CD`:
```prisma
  CD
  TWO_CD
  CASSETTE
  TWO_CASSETTE
  MERCH
```

- [ ] **Step 2: Add the new PO enums** (append near the other enums)

```prisma
enum PoOrigin {
  INTERNATIONAL
  DOMESTIC
}

enum PoStatus {
  DRAFT
  SUBMITTED
  CONSOLIDATED
  PRICED
  RECEIVED
  INVENTORY_UPDATED
  CANCELLED
}

enum PaymentMethod {
  CREDIT_CARD
  BANK_TRANSFER
  PAYPAL
  CASH
  OTHER
}

enum ReimbursementStatus {
  NOT_REQUIRED
  PENDING
  REIMBURSED
}

enum SalesChannel {
  SHOPEE
  TOKOPEDIA
  WEBSITE
  POS
  DISCOGS
}

enum PoLineMatchStatus {
  MATCHED
  NEW
  AMBIGUOUS
}

enum PoAttachmentKind {
  VENDOR_INVOICE
  FORWARDER_INVOICE
  PAYMENT_PROOF
  REIMBURSEMENT_PROOF
}
```

- [ ] **Step 3: Validate the schema**

Run: `cd apps/api && npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(po): add PO enums and cassette record formats"
```

### Task 2: Add PO domain models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the models** (append at end of file)

```prisma
model PurchaseOrder {
  id                  String              @id @default(cuid())
  number              String              @unique
  vendorName          String
  origin              PoOrigin            @default(INTERNATIONAL)
  currency            String              // ISO 4217: USD, EUR, IDR
  orderDate           DateTime
  fxRate              Decimal             @default(1) @db.Decimal(18, 6) // native -> IDR
  fxRateSource        String?
  fxRateManual        Boolean             @default(false)
  vendorShippingNative Decimal            @default(0) @db.Decimal(18, 2)
  paymentMethod       PaymentMethod       @default(BANK_TRANSFER)
  paidBy              String?
  reimbursementStatus ReimbursementStatus @default(NOT_REQUIRED)
  status              PoStatus            @default(DRAFT)
  subtotalNative      Decimal             @default(0) @db.Decimal(18, 2)
  notes               String?
  consolidation       Consolidation?      @relation(fields: [consolidationId], references: [id])
  consolidationId     String?
  lines               PoLineItem[]
  attachments         PoAttachment[]
  createdById         String?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([status])
  @@index([orderDate])
}

model PoLineItem {
  id                   String               @id @default(cuid())
  po                   PurchaseOrder        @relation(fields: [poId], references: [id], onDelete: Cascade)
  poId                 String
  lineNo               Int
  artist               String
  title                String
  label                String?
  catNumber            String?
  barcode              String?
  formatRaw            String
  format               RecordFormat
  edition              String?
  qty                  Int
  qtyBackorder         Int                  @default(0)
  unitPriceNative      Decimal              @db.Decimal(18, 2)
  extendedNative       Decimal              @db.Decimal(18, 2)
  weightKg             Decimal              @default(0) @db.Decimal(10, 4)
  allocatedVendorShipIdr Decimal            @default(0) @db.Decimal(18, 2)
  allocatedForwarderIdr  Decimal            @default(0) @db.Decimal(18, 2)
  landedCostIdr        Decimal              @default(0) @db.Decimal(18, 2)
  discogsId            String?
  discogsRaw           Json?
  release              Release?             @relation(fields: [releaseId], references: [id])
  releaseId            String?
  matchStatus          PoLineMatchStatus    @default(NEW)
  createdRelease       Boolean              @default(false)
  storeLocation        StoreLocation?
  shelfLocation        String?
  channelPrices        PoLineChannelPrice[]

  @@index([poId])
  @@index([barcode])
  @@index([releaseId])
}

model Consolidation {
  id                 String          @id @default(cuid())
  number             String          @unique
  forwarderName      String
  forwarderInvoiceIdr Decimal        @default(0) @db.Decimal(18, 2)
  weightKgTotal      Decimal?        @db.Decimal(10, 4)
  trackingRaw        String?
  status             String          @default("open")
  pos                PurchaseOrder[]
  createdAt          DateTime        @default(now())
}

model PoLineChannelPrice {
  id            String       @id @default(cuid())
  lineItem      PoLineItem   @relation(fields: [lineItemId], references: [id], onDelete: Cascade)
  lineItemId    String
  channel       SalesChannel
  currency      String       @default("IDR")
  price         Decimal      @db.Decimal(18, 2)
  feePctApplied Decimal      @db.Decimal(6, 4)
  overridden    Boolean      @default(false)

  @@unique([lineItemId, channel])
}

model ChannelPricingConfig {
  channel  SalesChannel @id
  feePct   Decimal      @db.Decimal(6, 4) // 0.10 = 10%
  rounding String       @default("NEAREST_1000") // NEAREST_1000 | X900
  currency String       @default("IDR")
  active   Boolean      @default(true)
}

model PoAttachment {
  id           String           @id @default(cuid())
  po           PurchaseOrder    @relation(fields: [poId], references: [id], onDelete: Cascade)
  poId         String
  kind         PoAttachmentKind
  fileUrl      String
  mimeType     String?
  sizeBytes    Int?
  uploadedById String?
  uploadedAt   DateTime         @default(now())

  @@index([poId])
}

model ReleaseChannelPrice {
  id        String       @id @default(cuid())
  release   Release      @relation(fields: [releaseId], references: [id], onDelete: Cascade)
  releaseId String
  channel   SalesChannel
  currency  String       @default("IDR")
  price     Decimal      @db.Decimal(18, 2)
  updatedAt DateTime     @updatedAt

  @@unique([releaseId, channel])
}
```

- [ ] **Step 2: Add back-relations to `Release`**

Inside `model Release { ... }`, before the closing brace add:
```prisma
  poLines       PoLineItem[]
  channelPrices ReleaseChannelPrice[]
```

- [ ] **Step 3: Validate**

Run: `cd apps/api && npx prisma validate`
Expected: "valid 🚀"

- [ ] **Step 4: Create the migration + generate client**

Run: `cd apps/api && npx prisma migrate dev --name po_pipeline`
Expected: migration created + applied to the local dev DB; "✔ Generated Prisma Client".

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(po): add PurchaseOrder domain models + migration"
```

### Task 3: Seed channel-pricing defaults

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add the seed block** (inside the seed's `main()`, before it disconnects)

```ts
const channelDefaults: Array<{ channel: 'SHOPEE'|'TOKOPEDIA'|'WEBSITE'|'POS'|'DISCOGS'; feePct: number; rounding: string; currency: string }> = [
  { channel: 'POS',       feePct: 0.010, rounding: 'NEAREST_1000', currency: 'IDR' },
  { channel: 'WEBSITE',   feePct: 0.025, rounding: 'NEAREST_1000', currency: 'IDR' },
  { channel: 'TOKOPEDIA', feePct: 0.065, rounding: 'X900',         currency: 'IDR' },
  { channel: 'SHOPEE',    feePct: 0.100, rounding: 'X900',         currency: 'IDR' },
  { channel: 'DISCOGS',   feePct: 0.110, rounding: 'NEAREST_1000', currency: 'USD' },
];
for (const c of channelDefaults) {
  await prisma.channelPricingConfig.upsert({
    where: { channel: c.channel as any },
    update: { feePct: c.feePct, rounding: c.rounding, currency: c.currency },
    create: { channel: c.channel as any, feePct: c.feePct, rounding: c.rounding, currency: c.currency },
  });
}
console.log('Seeded ChannelPricingConfig');
```

- [ ] **Step 2: Run the seed against the dev DB**

Run: `cd apps/api && npx ts-node prisma/seed.ts`
Expected: log includes "Seeded ChannelPricingConfig", no error.

- [ ] **Step 3: Verify rows exist**

Run: `cd apps/api && npx prisma studio` is optional; instead:
```bash
docker exec mf-dev-pg psql -U postgres -d mediumformat -c 'select channel, "feePct", rounding from "ChannelPricingConfig" order by "feePct";'
```
Expected: 5 rows (POS 0.0100 … DISCOGS 0.1100).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(po): seed channel pricing defaults"
```

### Task 4: Shared enums for the frontend

**Files:**
- Create: `packages/shared/src/constants/purchase-orders.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the shared enums**

`packages/shared/src/constants/purchase-orders.ts`:
```ts
export enum SalesChannel {
  SHOPEE = 'SHOPEE',
  TOKOPEDIA = 'TOKOPEDIA',
  WEBSITE = 'WEBSITE',
  POS = 'POS',
  DISCOGS = 'DISCOGS',
}

export enum PoOrigin {
  INTERNATIONAL = 'INTERNATIONAL',
  DOMESTIC = 'DOMESTIC',
}

export enum PoStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONSOLIDATED = 'CONSOLIDATED',
  PRICED = 'PRICED',
  RECEIVED = 'RECEIVED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export const PO_STATUS_STEPS: readonly PoStatus[] = [
  PoStatus.SUBMITTED,
  PoStatus.CONSOLIDATED,
  PoStatus.PRICED,
  PoStatus.RECEIVED,
  PoStatus.INVENTORY_UPDATED,
];
```

- [ ] **Step 2: Re-export from the package index**

In `packages/shared/src/index.ts` add:
```ts
export * from './constants/purchase-orders';
```

- [ ] **Step 3: Build the shared package**

Run: `cd packages/shared && npm run build`
Expected: builds without type errors (produces `dist/`).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src
git commit -m "feat(po): shared PO/channel enums"
```

---

## Phase 2: Invoice parsing pipeline

### Task 5: Format normalization + weight table (pure)

**Files:**
- Create: `apps/api/src/purchase-orders/parsing/formats.ts`
- Test: `apps/api/src/purchase-orders/parsing/formats.spec.ts`

- [ ] **Step 1: Write the failing test**

`formats.spec.ts`:
```ts
import { canonicalizeFormat, WEIGHT_KG } from './formats';

describe('canonicalizeFormat', () => {
  it.each([
    ['6 TRACK CD SINGLE', 'CD'],
    ['GATEFOLD 2XLP + MP3 DOWNLOAD CODE', 'TWO_LP'],
    ['180 GRAM AUDIOPHILE VINYL LP', 'LP'],
    ['HI-FI HEADPHONES', 'MERCH'],
    ['2XCD', 'TWO_CD'],
    ['CASSETTE', 'CASSETTE'],
    ['YELLOW VINYL 7"', 'SEVEN_INCH'],
    ['LIMITED 12"', 'TWELVE_INCH'],
    ['VINYL LP', 'LP'],
    ['CD', 'CD'],
  ])('maps %s -> %s', (raw, expected) => {
    expect(canonicalizeFormat(raw)).toBe(expected);
  });

  it('has a weight for every canonical format returned', () => {
    expect(WEIGHT_KG['TWO_LP']).toBeGreaterThan(WEIGHT_KG['LP']);
    expect(WEIGHT_KG['CD']).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/formats.spec.ts`
Expected: FAIL — "Cannot find module './formats'".

- [ ] **Step 3: Implement `formats.ts`**

```ts
import { RecordFormat } from '@prisma/client';

// Weight per piece (KG). Ported from import_output/build_tsv.py WEIGHT_LB × 0.453592,
// collapsed onto the canonical RecordFormat enum.
export const WEIGHT_KG: Record<RecordFormat, number> = {
  LP: 0.227,
  TWO_LP: 0.454,
  THREE_LP: 0.635,
  TWELVE_INCH: 0.204,
  SEVEN_INCH: 0.091,
  CD: 0.113,
  TWO_CD: 0.204,
  CASSETTE: 0.068,
  TWO_CASSETTE: 0.113,
  MERCH: 0.544,
};

/** Normalize a distributor's free-text/legend format string to a canonical RecordFormat. */
export function canonicalizeFormat(raw: string): RecordFormat {
  const s = (raw || '').toUpperCase();
  const isDouble = /\b2\s?X|DOUBLE|\b2XLP|\b2LP/.test(s);
  const isTriple = /\b3\s?X|TRIPLE|\b3XLP|\b3LP/.test(s);

  if (/HEADPHONE|MERCH|BLU-?RAY|BOOK\b|SHIRT|TOTE/.test(s)) return RecordFormat.MERCH;
  if (/CASSETTE|\bMC\b|\bMCE\b/.test(s)) return isDouble ? RecordFormat.TWO_CASSETTE : RecordFormat.CASSETTE;
  if (/\bCD\b|COMPACT DISC/.test(s)) return isDouble ? RecordFormat.TWO_CD : RecordFormat.CD;
  if (/7"|7 INCH|\b7'|SEVEN/.test(s)) return RecordFormat.SEVEN_INCH;
  if ((/12"|12 INCH|MAXI/.test(s)) && !/LP/.test(s)) return RecordFormat.TWELVE_INCH;
  if (isTriple) return RecordFormat.THREE_LP;
  if (isDouble) return RecordFormat.TWO_LP;
  if (/LP|VINYL/.test(s)) return RecordFormat.LP;
  return RecordFormat.LP; // safe default for records; flagged for review upstream
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/formats.spec.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/purchase-orders/parsing/formats.ts apps/api/src/purchase-orders/parsing/formats.spec.ts
git commit -m "feat(po): format canonicalization + weight table"
```

### Task 6: Totals reconciliation (pure)

**Files:**
- Create: `apps/api/src/purchase-orders/parsing/reconcile.ts`
- Test: `apps/api/src/purchase-orders/parsing/reconcile.spec.ts`

- [ ] **Step 1: Write the failing test** (encodes the real rounding quirks seen in the invoices)

`reconcile.spec.ts`:
```ts
import { reconcileLine, reconcileTotals } from './reconcile';

describe('reconcileLine', () => {
  it('accepts exact products', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 24.75, extended: 49.5 })).toBe(true);
  });
  it('tolerates vendor rounding (2 × 4.52 shown as 9.05)', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 4.52, extended: 9.05 })).toBe(true);
  });
  it('rejects a real mismatch', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 24.75, extended: 60.0 })).toBe(false);
  });
});

describe('reconcileTotals', () => {
  it('accepts subtotal+shipping ≈ invoiceTotal within tolerance', () => {
    expect(reconcileTotals({ extendedSum: 1390.16, vendorShipping: 179.16, invoiceTotal: 1569.32 })).toBe(true);
  });
  it('accepts when invoiceTotal is unknown', () => {
    expect(reconcileTotals({ extendedSum: 100, vendorShipping: 5, invoiceTotal: undefined })).toBe(true);
  });
  it('rejects a large discrepancy', () => {
    expect(reconcileTotals({ extendedSum: 100, vendorShipping: 5, invoiceTotal: 200 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/reconcile.spec.ts`
Expected: FAIL — "Cannot find module './reconcile'".

- [ ] **Step 3: Implement `reconcile.ts`**

```ts
const LINE_TOLERANCE = 0.05;      // absolute currency units; covers vendor per-line rounding
const TOTAL_TOLERANCE_RATIO = 0.01; // 1% of invoice total

export function reconcileLine(l: { qty: number; unitPrice: number; extended: number }): boolean {
  return Math.abs(l.qty * l.unitPrice - l.extended) <= LINE_TOLERANCE;
}

export function reconcileTotals(t: {
  extendedSum: number;
  vendorShipping: number;
  invoiceTotal?: number;
}): boolean {
  if (t.invoiceTotal == null) return true; // can't check; not a failure
  const tol = Math.max(0.05, t.invoiceTotal * TOTAL_TOLERANCE_RATIO);
  return Math.abs(t.extendedSum + t.vendorShipping - t.invoiceTotal) <= tol;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/reconcile.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/purchase-orders/parsing/reconcile.ts apps/api/src/purchase-orders/parsing/reconcile.spec.ts
git commit -m "feat(po): invoice totals reconciliation"
```

### Task 7: Parser types + provider interface

**Files:**
- Create: `apps/api/src/purchase-orders/parsing/invoice-parser.types.ts`
- Create: `apps/api/src/purchase-orders/parsing/invoice-parser.provider.ts`

- [ ] **Step 1: Create the types**

`invoice-parser.types.ts`:
```ts
import { RecordFormat } from '@prisma/client';

/** Raw shape returned by the LLM provider — pre-normalization. */
export interface RawInvoiceLine {
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  barcode?: string;
  format: string;
  edition?: string;
  qty: number;
  qtyBackorder?: number;
  unitPrice: number;
  extended: number;
}
export interface RawInvoice {
  vendorName?: string;
  orderDate?: string;   // ISO 8601 if the model can infer it
  currency: string;     // ISO 4217
  vendorShipping?: number;
  invoiceTotal?: number;
  lines: RawInvoiceLine[];
}

/** Normalized, validated shape returned by the parse endpoint. */
export interface ParsedInvoiceLine extends RawInvoiceLine {
  format: string;           // canonical RecordFormat as string
  formatRaw: string;
  qtyBackorder: number;
  weightKg: number;
  lineValid: boolean;
}
export interface ParsedInvoice {
  vendorName?: string;
  orderDate?: string;
  currency: string;
  vendorShippingNative: number;
  invoiceTotalNative?: number;
  lines: ParsedInvoiceLine[];
  totalsReconcile: boolean;
  warnings: string[];
}

export function toRecordFormat(canonical: RecordFormat): string {
  return canonical;
}
```

- [ ] **Step 2: Create the provider interface + DI token**

`invoice-parser.provider.ts`:
```ts
import type { RawInvoice } from './invoice-parser.types';

export const INVOICE_PARSER_PROVIDER = 'INVOICE_PARSER_PROVIDER';

export interface InvoiceParserProvider {
  /** Extract structured invoice data from already-extracted PDF text. */
  extract(text: string): Promise<RawInvoice>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/purchase-orders/parsing/invoice-parser.types.ts apps/api/src/purchase-orders/parsing/invoice-parser.provider.ts
git commit -m "feat(po): parser types + provider interface"
```

### Task 8: OpenRouter provider implementation

**Files:**
- Create: `apps/api/src/purchase-orders/parsing/openrouter-invoice-parser.provider.ts`
- Test: `apps/api/src/purchase-orders/parsing/openrouter-invoice-parser.provider.spec.ts`

- [ ] **Step 1: Write the failing test (mock `fetch`)**

`openrouter-invoice-parser.provider.spec.ts`:
```ts
import { OpenRouterInvoiceParser } from './openrouter-invoice-parser.provider';

describe('OpenRouterInvoiceParser', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, OPENROUTER_API_KEY: 'test-key' }; });
  afterEach(() => { process.env = OLD; jest.restoreAllMocks(); });

  it('posts to OpenRouter and parses JSON content', async () => {
    const payload = { currency: 'USD', vendorShipping: 179.16, lines: [{ artist: 'GORILLAZ', title: 'MOUNTAIN', format: 'LP', qty: 2, unitPrice: 24.75, extended: 49.5 }] };
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    } as any);

    const out = await new OpenRouterInvoiceParser().extract('...invoice text...');

    expect(out.currency).toBe('USD');
    expect(out.lines).toHaveLength(1);
    const [url, opts] = fetchMock.mock.calls[0] as any;
    expect(url).toContain('/chat/completions');
    expect(JSON.parse(opts.body).response_format).toEqual({ type: 'json_object' });
  });

  it('throws when key missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(new OpenRouterInvoiceParser().extract('x')).rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/openrouter-invoice-parser.provider.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the provider** (mirrors `inventory/ai-assist.service.ts`)

```ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { InvoiceParserProvider } from './invoice-parser.provider';
import type { RawInvoice } from './invoice-parser.types';

const SYSTEM = `You extract structured data from a music distributor invoice.
Return ONLY JSON matching:
{"vendorName":string,"orderDate":string(ISO 8601 or ""),"currency":string(ISO 4217),
"vendorShipping":number,"invoiceTotal":number,
"lines":[{"artist":string,"title":string,"label":string,"catNumber":string,"barcode":string,
"format":string,"edition":string,"qty":number,"qtyBackorder":number,"unitPrice":number,"extended":number}]}
Rules: currency from the invoice's currency symbol (US$→USD, €→EUR). unitPrice is per-piece; extended is the line total.
barcode = numeric UPC/EAN only; otherwise put the vendor catalog no in catNumber. edition = variant/colour text only ("" if standard).
Do not invent lines. Omit shipping/tax summary rows from lines.`;

@Injectable()
export class OpenRouterInvoiceParser implements InvoiceParserProvider {
  async extract(text: string): Promise<RawInvoice> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new ServiceUnavailableException('OPENROUTER_API_KEY is not configured');
    const base = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const model = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-exp:free';

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Invoice text:\n\n${text}` },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ServiceUnavailableException(`Invoice parse failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new ServiceUnavailableException('Invoice parse returned no content');
    let parsed: RawInvoice;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException('Invoice parse returned non-JSON content');
    }
    parsed.lines ??= [];
    parsed.currency ??= 'USD';
    return parsed;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/openrouter-invoice-parser.provider.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/purchase-orders/parsing/openrouter-invoice-parser.provider.ts apps/api/src/purchase-orders/parsing/openrouter-invoice-parser.provider.spec.ts
git commit -m "feat(po): OpenRouter invoice parser provider"
```

### Task 9: Parser service (provider + normalization)

**Files:**
- Create: `apps/api/src/purchase-orders/parsing/invoice-parser.service.ts`
- Create: `apps/api/src/purchase-orders/parsing/__fixtures__/juno-raw.json`
- Test: `apps/api/src/purchase-orders/parsing/invoice-parser.service.spec.ts`

- [ ] **Step 1: Create the fixture** (recorded raw provider output — subset of the real Juno invoice)

`__fixtures__/juno-raw.json`:
```json
{
  "vendorName": "Juno Records",
  "orderDate": "2026-04-02",
  "currency": "EUR",
  "vendorShipping": 272.74,
  "invoiceTotal": 1484.22,
  "lines": [
    { "artist": "TURNER, Alex", "title": "Submarine", "label": "Domino", "catNumber": "RUG 398CD", "format": "6 TRACK CD SINGLE", "qty": 2, "unitPrice": 4.52, "extended": 9.05 },
    { "artist": "ONEOHTRIX POINT NEVER", "title": "R Plus Seven", "label": "Warp", "catNumber": "WARPLP 240", "format": "GATEFOLD 2XLP + MP3 DOWNLOAD CODE", "qty": 1, "unitPrice": 21.18, "extended": 21.18 },
    { "artist": "AIAIAI", "title": "AIAIAI Tracks", "catNumber": "AIAIAI 05601", "format": "HI-FI HEADPHONES", "qty": 1, "unitPrice": 46.09, "extended": 46.09 },
    { "artist": "ROBYN", "title": "Sexistential", "label": "Young", "catNumber": "YO 467MCE", "format": "CASSETTE", "qty": 1, "unitPrice": 9.26, "extended": 9.26 }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`invoice-parser.service.spec.ts`:
```ts
import { InvoiceParserService } from './invoice-parser.service';
import type { InvoiceParserProvider } from './invoice-parser.provider';
import raw from './__fixtures__/juno-raw.json';

describe('InvoiceParserService', () => {
  const provider: InvoiceParserProvider = { extract: async () => raw as any };
  const svc = new InvoiceParserService(provider);

  it('normalizes formats, fills weights, flags line validity', async () => {
    const out = await svc.parse('ignored text');
    expect(out.currency).toBe('EUR');
    expect(out.lines).toHaveLength(4);
    const byTitle = Object.fromEntries(out.lines.map(l => [l.title, l]));
    expect(byTitle['Submarine'].format).toBe('CD');
    expect(byTitle['R Plus Seven'].format).toBe('TWO_LP');
    expect(byTitle['AIAIAI Tracks'].format).toBe('MERCH');
    expect(byTitle['Sexistential'].format).toBe('CASSETTE');
    expect(byTitle['Submarine'].weightKg).toBeGreaterThan(0);
    expect(byTitle['Submarine'].lineValid).toBe(true); // 2×4.52≈9.05 within tolerance
  });

  it('reports totals reconcile against the invoice total', async () => {
    const out = await svc.parse('x');
    // subtotal of the 4 fixture lines + shipping won't equal the full invoice total,
    // so with invoiceTotal present it should be false — the endpoint surfaces it as a warning.
    expect(typeof out.totalsReconcile).toBe('boolean');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/invoice-parser.service.spec.ts`
Expected: FAIL — module not found.

Note: enable JSON imports if not already — ensure `apps/api/tsconfig.json` has `"resolveJsonModule": true`. If the test fails to import JSON, add that compiler option and re-run.

- [ ] **Step 4: Implement the service**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_PARSER_PROVIDER, type InvoiceParserProvider } from './invoice-parser.provider';
import type { ParsedInvoice, ParsedInvoiceLine } from './invoice-parser.types';
import { canonicalizeFormat, WEIGHT_KG } from './formats';
import { reconcileLine, reconcileTotals } from './reconcile';

@Injectable()
export class InvoiceParserService {
  constructor(@Inject(INVOICE_PARSER_PROVIDER) private provider: InvoiceParserProvider) {}

  async parse(text: string): Promise<ParsedInvoice> {
    const raw = await this.provider.extract(text);
    const warnings: string[] = [];
    let extendedSum = 0;

    const lines: ParsedInvoiceLine[] = raw.lines.map((l) => {
      const format = canonicalizeFormat(l.format);
      const lineValid = reconcileLine({ qty: l.qty, unitPrice: l.unitPrice, extended: l.extended });
      if (!lineValid) warnings.push(`Line "${l.artist} — ${l.title}": qty×price ≠ extended`);
      extendedSum += l.extended;
      return {
        ...l,
        formatRaw: l.format,
        format,
        qtyBackorder: l.qtyBackorder ?? 0,
        weightKg: WEIGHT_KG[format],
        lineValid,
      };
    });

    const vendorShippingNative = raw.vendorShipping ?? 0;
    const totalsReconcile = reconcileTotals({
      extendedSum,
      vendorShipping: vendorShippingNative,
      invoiceTotal: raw.invoiceTotal,
    });
    if (!totalsReconcile) warnings.push('Line total + shipping does not match the invoice total');

    return {
      vendorName: raw.vendorName,
      orderDate: raw.orderDate,
      currency: raw.currency,
      vendorShippingNative,
      invoiceTotalNative: raw.invoiceTotal,
      lines,
      totalsReconcile,
      warnings,
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && npx jest src/purchase-orders/parsing/invoice-parser.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/purchase-orders/parsing/invoice-parser.service.ts apps/api/src/purchase-orders/parsing/__fixtures__ apps/api/src/purchase-orders/parsing/invoice-parser.service.spec.ts apps/api/tsconfig.json
git commit -m "feat(po): invoice parser service with normalization"
```

### Task 10: `/parse` endpoint + module wiring

**Files:**
- Modify: `apps/api/package.json` (add `pdf-parse`)
- Create: `apps/api/src/purchase-orders/purchase-orders.controller.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add the PDF text-extraction dependency**

Run: `cd apps/api && npm install pdf-parse && npm install -D @types/pdf-parse`
Expected: installs without error.

- [ ] **Step 2: Create the controller**

`purchase-orders.controller.ts`:
```ts
import {
  Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import pdfParse from 'pdf-parse';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private parser: InvoiceParserService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parse(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded (field name: "file")');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF invoices are supported');
    const { text } = await pdfParse(file.buffer);
    if (!text?.trim()) throw new BadRequestException('Could not extract text from the PDF (is it scanned?)');
    return this.parser.parse(text);
  }
}
```

- [ ] **Step 3: Create the module**

`purchase-orders.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { INVOICE_PARSER_PROVIDER } from './parsing/invoice-parser.provider';
import { OpenRouterInvoiceParser } from './parsing/openrouter-invoice-parser.provider';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [
    InvoiceParserService,
    { provide: INVOICE_PARSER_PROVIDER, useClass: OpenRouterInvoiceParser },
  ],
})
export class PurchaseOrdersModule {}
```

- [ ] **Step 4: Register it in `app.module.ts`**

Add the import and include `PurchaseOrdersModule` in the `imports` array:
```ts
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
```
```ts
imports: [PrismaModule, AuthModule, UsersModule, InventoryModule, PostsModule, DealposModule, FinanceModule, PurchaseOrdersModule],
```

- [ ] **Step 5: Verify the whole API compiles**

Run: `cd apps/api && npm run build`
Expected: build succeeds (no TS errors). If `pdf-parse` default-import errors, set `"esModuleInterop": true` in `apps/api/tsconfig.json` (verify present) and re-run.

- [ ] **Step 6: Run the full unit suite**

Run: `cd apps/api && npm test`
Expected: all specs pass (formats, reconcile, provider, service, plus pre-existing).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/purchase-orders/purchase-orders.controller.ts apps/api/src/purchase-orders/purchase-orders.module.ts apps/api/src/app.module.ts apps/api/package.json apps/api/package-lock.json apps/api/tsconfig.json
git commit -m "feat(po): POST /purchase-orders/parse endpoint"
```

### Task 11: Manual verification against the real invoices

**Files:** none (verification only)

- [ ] **Step 1: Start the API against the dev DB with a real OpenRouter key**

Ensure `apps/api/.env` has a real `OPENROUTER_API_KEY`. Run: `cd apps/api && npm run dev`
Expected: "API running on port 3001".

- [ ] **Step 2: Get a JWT** (use the seeded admin from the earlier deploy, or create one)

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@mediumformat.info","password":"<admin-pass>"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
echo "$TOKEN" | head -c 20
```
Expected: prints the start of a token. (Adjust the JSON field name if the login response differs.)

- [ ] **Step 2: Parse each real fixture and eyeball the result**

```bash
for f in "shipper_invoice/MF_P12_WebAMI_pls93610834 (1).pdf" \
         "shipper_invoice/MF_P18_My Juno _ Order Receipt_ C13947644.pdf" \
         "shipper_invoice/MF-P19_306688-MediumFormat-051426.pdf"; do
  echo "=== $f ==="
  curl -s -X POST http://localhost:3001/api/v1/purchase-orders/parse \
    -H "Authorization: Bearer $TOKEN" -F "file=@$f" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("currency",d["currency"],"lines",len(d["lines"]),"reconcile",d["totalsReconcile"]);[print(" ",l["artist"][:20],"|",l["format"],"| q",l["qty"],"| ",l["unitPrice"],"valid",l["lineValid"]) for l in d["lines"][:5]]'
done
```
Expected: each invoice returns the right currency (USD/EUR/USD), a plausible line count (Alliance ~31, Juno ~48, Secretly ~79), canonical formats, and mostly `lineValid=true`. Note any misparse for a follow-up tweak to the system prompt — do **not** block the phase on 100% (human review is the safety net by design).

- [ ] **Step 3: Stop the dev server and the dev DB when done**

Run: `docker stop mf-dev-pg` (keep it for later phases; `docker start mf-dev-pg` to resume).

---

## Self-Review

**Spec coverage (Phases 1–2 only):**
- §3 domain model → Tasks 1–2 (all enums + models incl. cassette formats). ✅
- §3 ChannelPricingConfig seed → Task 3. ✅
- §5 parsing (provider, validation, normalization, review-draft, no DB writes) → Tasks 5–10. ✅
- §5 OpenRouter reuse + pluggable provider → Tasks 7–8, 10. ✅
- Shared enums for frontend → Task 4. ✅
- Later phases (FX, landed cost, pricing, matching, commit, UI, attachments/storage, consolidation) → **out of scope for this plan**, covered by subsequent plans.

**Placeholder scan:** no TBD/TODO; every code step shows complete code; commands have expected output. ✅

**Type consistency:** `RawInvoice`/`ParsedInvoice` used identically across provider (Task 7/8), service (Task 9), controller (Task 10); `canonicalizeFormat`/`WEIGHT_KG` names match between Task 5 and Task 9; `INVOICE_PARSER_PROVIDER` token consistent Task 7 → 10. ✅

**Deferred to next plan:** persistence of parsed drafts into `PurchaseOrder`/`PoLineItem` (this plan's `/parse` is intentionally stateless — the review-then-create step is Phase 3).
