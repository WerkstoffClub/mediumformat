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
  tax?: number;
  otherFees?: number;
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
  taxNative: number;
  otherFeesNative: number;
  invoiceTotalNative?: number;
  lines: ParsedInvoiceLine[];
  totalsReconcile: boolean;
  warnings: string[];
}
