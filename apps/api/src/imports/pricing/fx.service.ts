import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface FrankfurterResponse {
  date?: string;
  rates?: Record<string, number>;
}

interface FxRate {
  rate: number;
  source: string;
}

/** Resolves foreign-currency -> IDR rates for import pricing.
 *  Uses frankfurter.app (free, no API key) with a "latest" fallback for
 *  dates the historical endpoint can't answer (e.g. future order dates). */
@Injectable()
export class FxService {
  private readonly baseUrl = 'https://api.frankfurter.app';

  async getRate(from: string, date: string): Promise<FxRate> {
    if (from === 'IDR') return { rate: 1, source: 'identity' };

    try {
      const historical = await this.fetchRate(`${this.baseUrl}/${date}?from=${from}&to=IDR`);
      if (historical) return historical;
    } catch {
      // fall through to the "latest" fallback below
    }

    try {
      const latest = await this.fetchRate(`${this.baseUrl}/latest?from=${from}&to=IDR`, true);
      if (latest) return latest;
    } catch {
      // fall through to the error below
    }

    throw new ServiceUnavailableException(
      `Unable to resolve FX rate for ${from} -> IDR (a manual rate may be required)`,
    );
  }

  async getUsdIdr(date: string): Promise<number> {
    const { rate } = await this.getRate('USD', date);
    return rate;
  }

  private async fetchRate(url: string, isLatest = false): Promise<FxRate | null> {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as FrankfurterResponse;
    const idr = body.rates?.IDR;
    if (idr == null) return null;
    const source = isLatest ? 'frankfurter:latest' : `frankfurter:${body.date ?? 'unknown'}`;
    return { rate: idr, source };
  }
}
