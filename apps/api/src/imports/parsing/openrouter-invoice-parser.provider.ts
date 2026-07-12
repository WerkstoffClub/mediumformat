import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { InvoiceParserProvider } from './invoice-parser.provider';
import type { RawInvoice } from './invoice-parser.types';

const SYSTEM = `You extract structured line-item data from a music distributor's invoice or order receipt. Suppliers use DIFFERENT templates — identify the supplier from the header, then apply its layout:

- Alliance Entertainment / WebAMI (USD): a column grid "Product# | CF | ARTIST / TITLE | Qty Ord | Qty Ship | Unit Price | Extended". Format is given ONLY by the CF code legend (e.g. "01 VINYL LP, 02 COMPACT DISCS") — resolve each line's CF code to its format; it is NOT written on the line. The identifier is the AEC product# → put it in catNumber (barcode stays "" — no UPC is printed). "NON-RETURNABLE" is a note, not a line.
- Juno Records (EUR): "Artist/Title | Label/Cat No | Format | Qty | Price | Total". Artist and title are stacked (ARTIST then title); Label/Cat No stacked (label then catalog no, which may be split across spaces). Format is descriptive free text ("GATEFOLD 2XLP + MP3 DOWNLOAD CODE", "180 GRAM VINYL LP", "HI-FI HEADPHONES"). Shipping appears as "Postage (…)".
- Secretly Distribution (USD): a numeric UPC/barcode is present per line; price is a per-piece "Item Price".
- Any other supplier: infer the columns from the header row.

Return ONLY a JSON object — no markdown code fences, no prose before or after — matching:
{"vendorName":string,"orderDate":string(ISO 8601 or ""),"currency":string(ISO 4217),
"vendorShipping":number,"tax":number,"otherFees":number,"invoiceTotal":number,
"lines":[{"artist":string,"title":string,"label":string,"catNumber":string,"barcode":string,
"format":string,"edition":string,"qty":number,"qtyBackorder":number,"unitPrice":number,"extended":number}]}

Rules:
- currency from the money symbol (US$→USD, €→EUR, £→GBP).
- Split "ARTIST / TITLE" into artist + title. unitPrice = per-piece price; extended = line total; qty = quantity shipped (prefer Qty Ship over Qty Ordered when both exist).
- format is ALWAYS filled — resolve CF/config codes via the legend and map to one of: LP, 2xLP, 3xLP, CD, 2xCD, 7", 12", Cassette, Merch. Never leave it blank or default to LP when the legend says CD.
- barcode = numeric UPC/EAN only; otherwise put the vendor catalog number in catNumber.
- edition = variant/colour/special-edition text only ("" if standard).
- vendorShipping = the shipping/postage/handling charge on THIS invoice (0 if none). tax = sales tax / VAT (0 if none). otherFees = any other charge such as duty, service, or surcharge (0 if none). invoiceTotal = the grand total.
- Omit shipping/tax/subtotal/summary rows from "lines". Never invent lines.`;

const DEFAULT_MODEL = 'deepseek/deepseek-chat';
const MAX_RETRIES = 3;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_BACKOFF_MS = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Models occasionally wrap JSON in ```json fences or add stray prose. Pull the
 *  JSON object out before parsing so non-strict models (e.g. deepseek) work. */
export function extractJson(content: string): string {
  let s = content.trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) s = fenced[1].trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

@Injectable()
export class OpenRouterInvoiceParser implements InvoiceParserProvider {
  async extract(text: string): Promise<RawInvoice> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new ServiceUnavailableException('OPENROUTER_API_KEY is not configured');
    const base = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
    const backoffBaseMs = Number(process.env.OPENROUTER_RETRY_BASE_MS ?? 800);

    const body = JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Invoice text:\n\n${text}` },
      ],
    });

    let lastStatus = 0;
    let lastBody = '';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new ServiceUnavailableException('Invoice parse returned no content');
        let parsed: RawInvoice;
        try {
          parsed = JSON.parse(extractJson(content));
        } catch {
          throw new ServiceUnavailableException('Invoice parse returned non-JSON content');
        }
        parsed.lines ??= [];
        parsed.currency ??= 'USD';
        return parsed;
      }

      lastStatus = res.status;
      lastBody = await res.text();

      if (!RETRYABLE.has(res.status) || attempt === MAX_RETRIES) break;

      const retryAfter = Number(res.headers?.get?.('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, MAX_BACKOFF_MS)
        : Math.min(backoffBaseMs * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(waitMs);
    }

    throw new ServiceUnavailableException(
      `Invoice parse failed (${lastStatus}): ${lastBody.slice(0, 200)}`,
    );
  }
}
