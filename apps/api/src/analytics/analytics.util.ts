/** Pure helpers for first-party visitor tracking (unit-tested without a DB). */

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests/i;

export const isBot = (ua: string | undefined): boolean => !ua || BOT_UA.test(ua);

export function deviceOf(ua: string | undefined): 'mobile' | 'tablet' | 'desktop' {
  if (!ua) return 'desktop';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Reduce a full referrer URL to its bare host ("www." dropped); null when empty/invalid. */
export function referrerHost(ref: string | undefined | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

/** Strip query/hash and cap length so paths group cleanly in "Top pages". */
export const cleanPath = (path: string): string => (path.split(/[?#]/)[0] || '/').slice(0, 300);

export const dayKey = (d: Date, tzOffsetMinutes: number): string =>
  new Date(d.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);

export interface DayPoint { day: string; visitors: number; pageviews: number; }

/** Zero-fill a sparse per-day series to exactly `days` points ending today (in the given tz). */
export function fillDays(
  rows: ReadonlyArray<DayPoint>,
  days: number,
  now: Date,
  tzOffsetMinutes: number,
): DayPoint[] {
  const byDay = new Map(rows.map(r => [r.day, r]));
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (days - 1 - i) * 86_400_000), tzOffsetMinutes);
    return byDay.get(day) ?? { day, visitors: 0, pageviews: 0 };
  });
}
