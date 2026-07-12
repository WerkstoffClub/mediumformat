import { api } from './client';

/* Local string-union types matching @mf/shared's Prisma-backed enums, following
 * this app's existing convention (see PoStatus in purchaseOrders.ts, VoucherKind
 * in vouchers.ts): @mf/shared ships these as real TS enums for the NestJS side,
 * but importing enum *values* (not just types) from the workspace package here
 * breaks Rollup's CJS/ESM interop for the production build (`ImportOrigin` is
 * not exported by .../packages/shared/dist/index.js — the compiled CJS uses a
 * dynamic `__exportStar` re-export barrel that Rollup can't statically analyze
 * for named exports). Duplicating the string values locally sidesteps that. */
export type ImportOrigin = 'INTERNATIONAL' | 'DOMESTIC';
export const IMPORT_ORIGINS: readonly ImportOrigin[] = ['INTERNATIONAL', 'DOMESTIC'];

export type ImportStatus =
  | 'DRAFT' | 'SUBMITTED' | 'CONSOLIDATED' | 'PRICED' | 'RECEIVED' | 'INVENTORY_UPDATED' | 'CANCELLED';
export const IMPORT_STATUSES: readonly ImportStatus[] =
  ['DRAFT', 'SUBMITTED', 'CONSOLIDATED', 'PRICED', 'RECEIVED', 'INVENTORY_UPDATED', 'CANCELLED'];

/** Timeline steps shown on the import detail page (CONSOLIDATED is skipped for
 *  domestic orders) — mirrors packages/shared/src/constants/imports.ts. */
export const IMPORT_STATUS_STEPS: readonly ImportStatus[] =
  ['SUBMITTED', 'CONSOLIDATED', 'PRICED', 'RECEIVED', 'INVENTORY_UPDATED'];

export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | 'CASH' | 'OTHER';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'CASH', 'OTHER'];

/** Prisma's RecordFormat enum values, as sent/received by the imports endpoints
 *  (distinct from @mf/shared's display-oriented RecordFormat union). */
export type ImportRecordFormat =
  | 'LP' | 'TWO_LP' | 'THREE_LP' | 'TWELVE_INCH' | 'SEVEN_INCH' | 'CD' | 'TWO_CD' | 'CASSETTE' | 'MERCH';

export type ReimbursementStatus = 'NOT_REQUIRED' | 'PENDING' | 'REIMBURSED';
export type ImportLineMatchStatus = 'MATCHED' | 'NEW' | 'AMBIGUOUS';
export type ImportAttachmentKind = 'VENDOR_INVOICE' | 'FORWARDER_INVOICE' | 'PAYMENT_PROOF' | 'REIMBURSEMENT_PROOF';

/* ── parse endpoint shapes (mirrors apps/api/src/imports/parsing/invoice-parser.types.ts) ── */

export interface ParsedInvoiceLine {
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  barcode?: string;
  formatRaw: string;
  format: ImportRecordFormat;
  edition?: string;
  qty: number;
  qtyBackorder: number;
  unitPrice: number;
  extended: number;
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

/* ── create endpoint shapes (mirrors apps/api/src/imports/dto/create-import.dto.ts) ── */

export interface CreateImportLineInput {
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  barcode?: string;
  formatRaw: string;
  format: ImportRecordFormat;
  edition?: string;
  qty: number;
  qtyBackorder?: number;
  unitPriceNative: number;
  extendedNative: number;
  weightKg?: number;
}

export interface CreateImportInput {
  vendorName: string;
  origin: ImportOrigin;
  currency: string;
  orderDate: string;
  fxRate?: number;
  fxRateSource?: string;
  vendorShippingNative?: number;
  paymentMethod: PaymentMethod;
  paidBy?: string;
  notes?: string;
  lines: CreateImportLineInput[];
}

/* ── read shapes (mirrors ImportsService.findAll / findOne) ── */

interface ImportOrderBase {
  id: string;
  number: string;
  vendorName: string;
  origin: ImportOrigin;
  currency: string;
  orderDate: string;
  status: ImportStatus;
  paymentMethod: PaymentMethod;
  reimbursementStatus: ReimbursementStatus;
  subtotalNative: string | number;
  createdAt: string;
}

export interface ImportOrderRow extends ImportOrderBase {
  _count: { lines: number };
}

export interface ImportOrderLine {
  id: string;
  importOrderId: string;
  lineNo: number;
  artist: string;
  title: string;
  label: string | null;
  catNumber: string | null;
  barcode: string | null;
  formatRaw: string;
  format: ImportRecordFormat;
  edition: string | null;
  qty: number;
  qtyBackorder: number;
  unitPriceNative: string | number;
  extendedNative: string | number;
  weightKg: string | number;
  allocatedVendorShipIdr: string | number;
  allocatedForwarderIdr: string | number;
  landedCostIdr: string | number;
  discogsId: string | null;
  releaseId: string | null;
  matchStatus: ImportLineMatchStatus;
  createdRelease: boolean;
  storeLocation: string | null;
  shelfLocation: string | null;
}

export interface ImportAttachment {
  id: string;
  importOrderId: string;
  kind: ImportAttachmentKind;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedById: string | null;
  uploadedAt: string;
}

export interface ImportConsolidation {
  id: string;
  number: string;
  forwarderName: string;
  forwarderInvoiceIdr: string | number;
  weightKgTotal: string | number | null;
  trackingRaw: string | null;
  status: string;
  createdAt: string;
}

export interface ImportOrderDetail extends ImportOrderBase {
  fxRate: string | number;
  fxRateSource: string | null;
  fxRateManual: boolean;
  vendorShippingNative: string | number;
  paidBy: string | null;
  notes: string | null;
  consolidationId: string | null;
  updatedAt: string;
  lines: ImportOrderLine[];
  attachments: ImportAttachment[];
  consolidation: ImportConsolidation | null;
}

interface ImportOrderList {
  items: ImportOrderRow[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportFilter {
  q?: string;
  status?: ImportStatus;
  origin?: ImportOrigin;
  page?: number;
  limit?: number;
}

/* ── requests ── */

/** Parsing a scanned invoice via the LLM provider can take 30s–2min, and may
 *  be rate-limited — callers should show a patient loading state and surface
 *  request failures rather than assuming a fast round-trip. */
export const parseInvoice = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ParsedInvoice>('/imports/parse', form).then(r => r.data);
};

export const createImport = (body: CreateImportInput) =>
  api.post<ImportOrderDetail>('/imports', body).then(r => r.data);

export const getImports = (p: ImportFilter = {}) =>
  api.get<ImportOrderList>('/imports', { params: p }).then(r => r.data);

export const getImport = (id: string) =>
  api.get<ImportOrderDetail>(`/imports/${id}`).then(r => r.data);

export const uploadAttachment = (id: string, file: File, kind: ImportAttachmentKind) => {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  return api.post<ImportAttachment>(`/imports/${id}/attachments`, form).then(r => r.data);
};
