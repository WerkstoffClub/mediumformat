import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

export interface AppleSearchResult {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

@Injectable()
export class AppleService {
  private readonly log = new Logger(AppleService.name);

  async search(artist: string, title: string): Promise<AppleSearchResult[]> {
    try {
      const term = `${artist} ${title}`.trim();
      const { data } = await axios.get('https://itunes.apple.com/search', {
        params: { term, media: 'music', entity: 'song', limit: 3 },
        timeout: 8000,
      });
      const results: unknown[] = Array.isArray(data?.results) ? data.results : [];
      return results.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          trackName: typeof row.trackName === 'string' ? row.trackName : undefined,
          artistName: typeof row.artistName === 'string' ? row.artistName : undefined,
          collectionName: typeof row.collectionName === 'string' ? row.collectionName : undefined,
          previewUrl: typeof row.previewUrl === 'string' ? row.previewUrl : undefined,
          artworkUrl100: typeof row.artworkUrl100 === 'string' ? row.artworkUrl100 : undefined,
          trackViewUrl: typeof row.trackViewUrl === 'string' ? row.trackViewUrl : undefined,
        };
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Apple search failed: ${message}`);
      throw new ServiceUnavailableException('Apple search failed');
    }
  }
}
