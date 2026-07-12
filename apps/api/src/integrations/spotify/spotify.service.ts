import {
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

export interface SpotifySearchResult {
  id: string;
  name?: string;
  artist?: string;
  previewUrl?: string;
  externalUrl?: string;
}

@Injectable()
export class SpotifyService {
  private readonly log = new Logger(SpotifyService.name);
  private token: string | null = null;
  private tokenExp = 0;

  private get id(): string | undefined {
    return process.env.SPOTIFY_CLIENT_ID;
  }
  private get secret(): string | undefined {
    return process.env.SPOTIFY_CLIENT_SECRET;
  }

  private async ensureToken(): Promise<string> {
    if (!this.id || !this.secret) {
      throw new NotImplementedException(
        'Spotify integration not configured — set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET',
      );
    }
    if (this.token && Date.now() < this.tokenExp - 60_000) return this.token;
    const basic = Buffer.from(`${this.id}:${this.secret}`).toString('base64');
    try {
      const { data } = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({ grant_type: 'client_credentials' }),
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000,
        },
      );
      const accessToken = typeof data?.access_token === 'string' ? data.access_token : null;
      const expiresIn = typeof data?.expires_in === 'number' ? data.expires_in : 3600;
      if (!accessToken) throw new Error('Spotify token response missing access_token');
      this.token = accessToken;
      this.tokenExp = Date.now() + expiresIn * 1000;
      return accessToken;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Spotify token request failed: ${message}`);
      throw new ServiceUnavailableException('Spotify auth failed');
    }
  }

  async search(artist: string, title: string): Promise<SpotifySearchResult[]> {
    const token = await this.ensureToken();
    try {
      const q = `track:${title} artist:${artist}`;
      const { data } = await axios.get('https://api.spotify.com/v1/search', {
        params: { q, type: 'track', limit: 3 },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const items: unknown[] = Array.isArray(data?.tracks?.items)
        ? data.tracks.items
        : [];
      return items.map((t) => {
        const row = t as Record<string, unknown>;
        const artists = Array.isArray(row.artists)
          ? (row.artists as Array<Record<string, unknown>>)
              .map((a) => (typeof a.name === 'string' ? a.name : ''))
              .filter(Boolean)
              .join(', ')
          : undefined;
        const externalUrls = row.external_urls as Record<string, unknown> | undefined;
        return {
          id: String(row.id ?? ''),
          name: typeof row.name === 'string' ? row.name : undefined,
          artist: artists,
          previewUrl:
            typeof row.preview_url === 'string' ? row.preview_url : undefined,
          externalUrl:
            typeof externalUrls?.spotify === 'string'
              ? (externalUrls.spotify as string)
              : undefined,
        };
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`Spotify search failed: ${message}`);
      throw new ServiceUnavailableException('Spotify search failed');
    }
  }
}
