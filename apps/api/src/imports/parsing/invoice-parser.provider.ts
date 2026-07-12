import type { RawInvoice } from './invoice-parser.types';

export const INVOICE_PARSER_PROVIDER = 'INVOICE_PARSER_PROVIDER';

export interface InvoiceParserProvider {
  /** Extract structured invoice data from already-extracted PDF text. */
  extract(text: string): Promise<RawInvoice>;
}
