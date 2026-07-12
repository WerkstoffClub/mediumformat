import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { mapDiscogsRelease, DiscogsMapped } from './discogs.mapper';
import { UploadService } from '../upload/upload.service';

export interface DiscogsSearchResult {
  id: string;
  title: string;
  year?: number;
  format?: string[];
  thumb?: string;
  country?: string;
}

@Injectable()
export class DiscogsService {
  private readonly log = new Logger(DiscogsService.name);
  private readonly base = 'https://api.discogs.com';
  private readonly ua = 'MediumFormat/1.0 +https://mediumformat.info';

  constructor(private uploads: UploadService) {}

  private get token(): string | undefined {
    return process.env.DISCOGS_TOKEN;
  }

  private authHeader(): Record<string, string> {
    return this.token ? { Authorization: `Discogs token=${this.token}` } : {};
  }

  async lookupById(id: string): Promise<DiscogsMapped> {
    try {
      const { data } = await axios.get(
        `${this.base}/releases/${encodeURIComponent(id)}`,
        {
          headers: { 'User-Agent': this.ua, ...this.authHeader() },
          timeout: 8000,
        },
      );
      return mapDiscogsRelease(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Discogs lookup by id=${id} failed: ${message}`);
      throw new ServiceUnavailableException('Discogs lookup failed');
    }
  }

  async search(artist: string, title: string): Promise<DiscogsSearchResult[]> {
    try {
      const { data } = await axios.get(`${this.base}/database/search`, {
        params: {
          artist,
          release_title: title,
          type: 'release',
          per_page: 5,
        },
        headers: { 'User-Agent': this.ua, ...this.authHeader() },
        timeout: 8000,
      });
      const results: unknown[] = Array.isArray(data?.results) ? data.results : [];
      return results.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: String(row.id),
          title: String(row.title ?? ''),
          year: typeof row.year === 'number' ? row.year : undefined,
          format: Array.isArray(row.format) ? (row.format as string[]) : undefined,
          thumb: typeof row.thumb === 'string' ? row.thumb : undefined,
          country: typeof row.country === 'string' ? row.country : undefined,
        };
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Discogs search failed: ${message}`);
      throw new ServiceUnavailableException('Discogs search failed');
    }
  }

  async rehostImages(uris: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const uri of uris) {
      try {
        const { data, headers } = await axios.get<ArrayBuffer>(uri, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': this.ua, ...this.authHeader() },
          timeout: 15_000,
        });
        const mime = String(headers['content-type'] ?? 'image/jpeg');
        const buf = Buffer.from(data);
        const { url } = this.uploads.saveRemoteImage(buf, mime, 'discogs');
        out.push(url);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.log.warn(`Rehost failed for ${uri}: ${message}`);
      }
    }
    return out;
  }
}
