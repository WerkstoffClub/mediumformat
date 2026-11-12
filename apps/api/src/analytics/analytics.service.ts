import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cleanPath, deviceOf, fillDays, isBot, referrerHost } from './analytics.util';
import { TrackDto } from './dto/track.dto';

const JAKARTA_OFFSET_MIN = 7 * 60; // shop runs on WIB; days bucket in Jakarta time
const LIVE_WINDOW_MIN = 5;

const n = (v: unknown): number => (v == null ? 0 : Number(v));

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Record one storefront page view. Bots are dropped silently. */
  async track(dto: TrackDto, userAgent: string | undefined): Promise<void> {
    if (isBot(userAgent)) return;
    await this.prisma.pageView.create({
      data: {
        path: cleanPath(dto.path),
        referrer: referrerHost(dto.referrer),
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        device: deviceOf(userAgent),
      },
    });
  }

  private async totals(from: Date, to: Date) {
    const [t] = await this.prisma.$queryRaw<
      Array<{ pageviews: bigint; visitors: bigint; sessions: bigint; bounced: bigint }>
    >`
      WITH s AS (
        SELECT "sessionId", COUNT(*) AS views FROM "PageView"
        WHERE "at" >= ${from} AND "at" < ${to} GROUP BY 1
      )
      SELECT (SELECT COUNT(*) FROM "PageView" WHERE "at" >= ${from} AND "at" < ${to})                          AS pageviews,
             (SELECT COUNT(DISTINCT "visitorId") FROM "PageView" WHERE "at" >= ${from} AND "at" < ${to})       AS visitors,
             (SELECT COUNT(*) FROM s)                                                                        AS sessions,
             (SELECT COUNT(*) FROM s WHERE views = 1)                                                        AS bounced`;
    const sessions = n(t?.sessions);
    return {
      pageviews: n(t?.pageviews),
      visitors: n(t?.visitors),
      sessions,
      pagesPerSession: sessions > 0 ? Math.round((n(t?.pageviews) / sessions) * 10) / 10 : 0,
      bounceRate: sessions > 0 ? Math.round((n(t?.bounced) / sessions) * 100) : 0,
    };
  }

  /** Visitor analytics for the last `days` days, with the previous period for deltas. */
  async summary(days: number) {
    const now = new Date();
    const from = new Date(now.getTime() - days * 86_400_000);
    const prevFrom = new Date(from.getTime() - days * 86_400_000);

    const [current, previous, daily, pages, referrers, devices, [live]] = await Promise.all([
      this.totals(from, now),
      this.totals(prevFrom, from),
      this.prisma.$queryRaw<Array<{ day: string; visitors: bigint; pageviews: bigint }>>`
        SELECT to_char("at" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
               COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS pageviews
        FROM "PageView" WHERE "at" >= ${from} GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ path: string; views: bigint; visitors: bigint }>>`
        SELECT "path", COUNT(*) AS views, COUNT(DISTINCT "visitorId") AS visitors
        FROM "PageView" WHERE "at" >= ${from} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      this.prisma.$queryRaw<Array<{ source: string; visitors: bigint }>>`
        WITH entry AS (
          SELECT DISTINCT ON ("sessionId") "visitorId", "referrer"
          FROM "PageView" WHERE "at" >= ${from} ORDER BY "sessionId", "at"
        )
        SELECT COALESCE("referrer", 'Direct') AS source, COUNT(DISTINCT "visitorId") AS visitors
        FROM entry GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      this.prisma.$queryRaw<Array<{ device: string; visitors: bigint }>>`
        SELECT "device", COUNT(DISTINCT "visitorId") AS visitors
        FROM "PageView" WHERE "at" >= ${from} GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.$queryRaw<Array<{ live: bigint }>>`
        SELECT COUNT(DISTINCT "visitorId") AS live FROM "PageView"
        WHERE "at" >= ${new Date(now.getTime() - LIVE_WINDOW_MIN * 60_000)}`,
    ]);

    return {
      days,
      liveVisitors: n(live?.live),
      current,
      previous,
      daily: fillDays(
        daily.map(d => ({ day: d.day, visitors: n(d.visitors), pageviews: n(d.pageviews) })),
        days,
        now,
        JAKARTA_OFFSET_MIN,
      ),
      topPages: pages.map(p => ({ path: p.path, views: n(p.views), visitors: n(p.visitors) })),
      referrers: referrers.map(r => ({ source: r.source, visitors: n(r.visitors) })),
      devices: devices.map(d => ({ device: d.device, visitors: n(d.visitors) })),
    };
  }
}
