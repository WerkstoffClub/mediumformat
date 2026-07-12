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
