import {
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

export interface YoutubeSearchResult {
  id?: string;
  title?: string;
  channel?: string;
  thumbnail?: string;
}

@Injectable()
export class YoutubeService {
  private readonly log = new Logger(YoutubeService.name);

  private get key(): string | undefined {
    return process.env.YOUTUBE_API_KEY;
  }

  async search(artist: string, title: string): Promise<YoutubeSearchResult[]> {
    if (!this.key) {
      throw new NotImplementedException(
        'YouTube integration not configured — set YOUTUBE_API_KEY',
      );
    }
    try {
      const { data } = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            key: this.key,
            part: 'snippet',
            maxResults: 3,
            q: `${artist} ${title}`,
            type: 'video',
          },
          timeout: 8000,
        },
      );
      const items: unknown[] = Array.isArray(data?.items) ? data.items : [];
      return items.map((i) => {
        const row = i as Record<string, unknown>;
        const idField = row.id as Record<string, unknown> | undefined;
        const snippet = row.snippet as Record<string, unknown> | undefined;
        const thumbnails = snippet?.thumbnails as
          | Record<string, unknown>
          | undefined;
        const medium = thumbnails?.medium as
          | Record<string, unknown>
          | undefined;
        return {
          id:
            typeof idField?.videoId === 'string'
              ? (idField.videoId as string)
              : undefined,
          title:
            typeof snippet?.title === 'string'
              ? (snippet.title as string)
              : undefined,
          channel:
            typeof snippet?.channelTitle === 'string'
              ? (snippet.channelTitle as string)
              : undefined,
          thumbnail:
            typeof medium?.url === 'string' ? (medium.url as string) : undefined,
        };
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.error(`YouTube search failed: ${message}`);
      throw new ServiceUnavailableException('YouTube search failed');
    }
  }
}
