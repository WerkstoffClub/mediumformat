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
FORMAT: every line's "format" MUST be filled. If the invoice states the format only via a code
legend (e.g. a "CF"/"Config" column with a key like "01 VINYL LP, 02 COMPACT DISCS", or a totals
section grouping by format), resolve each line's code to its format text (LP, 2xLP, CD, 2xCD, 7",
12", Cassette, Headphones/Merch). Never leave format blank or guess LP when the legend says CD.
Do not invent lines. Omit shipping/tax/subtotal summary rows from lines.`;

// A currently-available free model. Free tiers are frequently rate-limited upstream,
// hence the retry logic below. Override with OPENROUTER_MODEL.
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const MAX_RETRIES = 3;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_BACKOFF_MS = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
          parsed = JSON.parse(content);
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
