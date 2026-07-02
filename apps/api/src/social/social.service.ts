import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SocialSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from '../finance/finance.service';
import { FeedRow, buildWaLink, formatPriceIdr, listingWarnings, releaseToFeedRow } from './social.util';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';

export interface ListingRow {
  releaseId: string;
  title: string;
  priceIdr: number;
  stock: number;
  condition: string;
  imageUrl: string | null;
  waPreviewUrl: string | null;
  warnings: string[];
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(private prisma: PrismaService) {}

  get feedPath(): string | null {
    const token = process.env.SOCIAL_FEED_TOKEN;
    return token ? `/api/v1/public/meta-feed/${token}` : null;
  }

  async getSettings(): Promise<SocialSettings & { feedPath: string | null }> {
    const settings = await this.prisma.socialSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return { ...settings, feedPath: this.feedPath };
  }

  async updateSettings(dto: UpdateSocialSettingsDto): Promise<SocialSettings & { feedPath: string | null }> {
    await this.getSettings(); // ensure row exists
    const settings = await this.prisma.socialSettings.update({ where: { id: 1 }, data: dto });
    return { ...settings, feedPath: this.feedPath };
  }

  /** Rows the feed will export, with per-item warnings for the UI. */
  async listings(): Promise<{ items: ListingRow[]; exportedCount: number }> {
    const settings = await this.getSettings();
    const releases = await this.prisma.release.findMany({ orderBy: [{ artist: 'asc' }, { title: 'asc' }] });
    const items = releases.map(release => ({
      releaseId: release.id,
      title: `${release.artist} – ${release.title}`,
      priceIdr: release.priceIdr,
      stock: release.stock,
      condition: release.condition,
      imageUrl: release.imageUrl,
      waPreviewUrl: settings.waPhone
        ? buildWaLink(settings.waPhone, settings.waTemplate, {
            artist: release.artist,
            title: release.title,
            price: formatPriceIdr(release.priceIdr),
          })
        : null,
      warnings: listingWarnings(release, settings),
    }));
    return { items, exportedCount: releases.filter(r => r.stock > 0).length };
  }

  /** The Meta Commerce Catalog CSV; throws NotFound when token wrong or feed off. */
  async feedCsv(token: string): Promise<string> {
    const expected = process.env.SOCIAL_FEED_TOKEN;
    if (!expected || token !== expected) throw new NotFoundException();
    const settings = await this.getSettings();
    if (!settings.feedEnabled) throw new NotFoundException();

    const releases = await this.prisma.release.findMany({ where: { stock: { gt: 0 } } });
    const rows: FeedRow[] = [];
    for (const release of releases) {
      try {
        rows.push(releaseToFeedRow(release, settings));
      } catch (err) {
        this.logger.warn(`feed row skipped for ${release.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Meta requires the header row even for an empty catalog
    if (rows.length === 0) {
      return 'id,title,description,availability,condition,price,link,image_link,brand\n';
    }
    return toCsv(rows);
  }
}
