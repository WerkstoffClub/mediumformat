import { Injectable, Logger } from '@nestjs/common';
import { RecordFormat } from '@prisma/client';

export interface DiscogsLookupQuery {
  barcode?: string | null;
  catNumber?: string | null;
  artist: string;
  title: string;
  format: RecordFormat;
}

export interface DiscogsEnrichment {
  discogsId?: string;
  barcode?: string;
  imageUrl?: string;
  genre?: string;
  year?: number;
}

interface DiscogsSearchResult {
  id?: number;
  barcode?: string[];
  cover_image?: string;
  genre?: string[];
  year?: number;
}

interface DiscogsSearchResponse {
  results?: DiscogsSearchResult[];
}

/** Map our canonical RecordFormat -> Discogs `format` search filter value. */
const DISCOGS_FORMAT: Partial<Record<RecordFormat, string>> = {
  [RecordFormat.LP]: 'Vinyl',
  [RecordFormat.TWO_LP]: 'Vinyl',
  [RecordFormat.THREE_LP]: 'Vinyl',
  [RecordFormat.TWELVE_INCH]: 'Vinyl',
  [RecordFormat.SEVEN_INCH]: 'Vinyl',
  [RecordFormat.CD]: 'CD',
  [RecordFormat.TWO_CD]: 'CD',
  [RecordFormat.CASSETTE]: 'Cassette',
};

/** Optional enrichment for newly-discovered (unmatched) import lines: looks
 *  up Discogs' database search to backfill discogsId/barcode/cover/genre/year
 *  on drafted Releases. Entirely optional — with no DISCOGS_TOKEN configured,
 *  or on any request failure, lookup() resolves to null rather than throwing,
 *  so a missing/misbehaving Discogs API never blocks an import commit. */
@Injectable()
export class DiscogsService {
  private readonly logger = new Logger(DiscogsService.name);
  private readonly baseUrl = 'https://api.discogs.com/database/search';

  async lookup(q: DiscogsLookupQuery): Promise<DiscogsEnrichment | null> {
    const token = process.env.DISCOGS_TOKEN;
    if (!token) return null;

    try {
      const digitsOnly = (q.barcode ?? '').replace(/\D/g, '');
      let result: DiscogsSearchResponse | null = null;

      if (digitsOnly.length >= 8) {
        result = await this.search({ barcode: digitsOnly }, token);
      }

      if (!result?.results?.length && q.catNumber?.trim() && /[a-z0-9]/i.test(q.catNumber)) {
        result = await this.search({ catno: q.catNumber.trim(), type: 'release' }, token);
      }

      if (!result?.results?.length) {
        const params: Record<string, string> = { q: `${q.artist} ${q.title}`, type: 'release' };
        const fmt = DISCOGS_FORMAT[q.format];
        if (fmt) params.format = fmt;
        result = await this.search(params, token);
      }

      const top = result?.results?.[0];
      if (!top) return null;

      const enrichment: DiscogsEnrichment = {};
      if (top.id != null) enrichment.discogsId = String(top.id);
      const barcode = (top.barcode ?? [])
        .map(b => b.replace(/\D/g, ''))
        .find(b => b.length >= 8);
      if (barcode) enrichment.barcode = barcode;
      if (top.cover_image) enrichment.imageUrl = top.cover_image;
      if (top.genre?.[0]) enrichment.genre = top.genre[0];
      if (top.year) enrichment.year = top.year;
      return enrichment;
    } catch (err) {
      this.logger.warn(`Discogs lookup failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private async search(params: Record<string, string>, token: string): Promise<DiscogsSearchResponse | null> {
    const query = new URLSearchParams({ ...params, per_page: '5', token });
    const res = await fetch(`${this.baseUrl}?${query.toString()}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'MediumFormat/1.0',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as DiscogsSearchResponse;
  }
}
