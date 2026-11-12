import { cleanPath, deviceOf, fillDays, isBot, referrerHost } from './analytics.util';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID_TAB = 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

describe('analytics utils', () => {
  it('classifies devices', () => {
    expect(deviceOf(IPHONE)).toBe('mobile');
    expect(deviceOf(ANDROID_TAB)).toBe('tablet');
    expect(deviceOf(MAC)).toBe('desktop');
  });

  it('flags bots and missing user agents', () => {
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot(MAC)).toBe(false);
  });

  it('reduces referrers to a bare host', () => {
    expect(referrerHost('https://www.instagram.com/p/abc?x=1')).toBe('instagram.com');
    expect(referrerHost('not a url')).toBeNull();
    expect(referrerHost('')).toBeNull();
  });

  it('cleans paths', () => {
    expect(cleanPath('/catalog?q=jazz#top')).toBe('/catalog');
    expect(cleanPath('?x')).toBe('/');
  });

  it('zero-fills days in Jakarta time (UTC+7)', () => {
    const now = new Date('2026-11-13T20:00:00Z'); // already 14 Nov in Jakarta
    const out = fillDays([{ day: '2026-11-13', visitors: 3, pageviews: 5 }], 2, now, 420);
    expect(out).toEqual([
      { day: '2026-11-13', visitors: 3, pageviews: 5 },
      { day: '2026-11-14', visitors: 0, pageviews: 0 },
    ]);
  });
});
