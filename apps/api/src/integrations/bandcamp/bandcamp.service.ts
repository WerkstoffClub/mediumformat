import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface BandcampSearchResult {
  searchUrl: string;
  guessedTrackUrl?: string;
}

@Injectable()
export class BandcampService {
  private readonly log = new Logger(BandcampService.name);

  async search(artist: string, title: string): Promise<BandcampSearchResult> {
    const q = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://bandcamp.com/search?q=${q}&item_type=t`;
    let guessedTrackUrl: string | undefined;
    try {
      const { data } = await axios.get(searchUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 MediumFormat/1.0' },
      });
      const $ = cheerio.load(data);
      const first = $('.result-info .heading a').first().attr('href');
      if (first) {
        guessedTrackUrl = first.startsWith('http')
          ? first
          : `https://bandcamp.com${first}`;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.log.warn(`Bandcamp scrape failed: ${message}`);
    }
    return { searchUrl, guessedTrackUrl };
  }
}
