import type { ImportRecordFormat } from '../../api/imports';

/** The editable-grid row shape on the New Import review step. Starts as a 1:1
 *  copy of a ParsedInvoiceLine (mapping unitPrice→unitPriceNative,
 *  extended→extendedNative) and is what gets sent to POST /imports on submit. */
export interface DraftLine {
  artist: string;
  title: string;
  label: string;
  catNumber: string;
  barcode: string;
  formatRaw: string;
  format: ImportRecordFormat;
  edition: string;
  qty: number;
  qtyBackorder: number;
  unitPriceNative: number;
  extendedNative: number;
  weightKg: number;
  /** Carried through from the parser for display only — not sent to the API. */
  lineValid: boolean;
}
