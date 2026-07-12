import { DiscogsService } from './discogs.service';
import { RecordFormat } from '@prisma/client';

const baseQuery = {
  artist: 'Boards of Canada',
  title: 'Music Has the Right to Children',
  format: RecordFormat.TWO_LP,
};

describe('DiscogsService.lookup', () => {
  const CREDS = ['DISCOGS_TOKEN', 'DISCOGS_KEY', 'DISCOGS_SECRET'] as const;
  const orig = Object.fromEntries(CREDS.map(k => [k, process.env[k]])) as Record<string, string | undefined>;
  const originalFetch = global.fetch;

  beforeEach(() => { CREDS.forEach(k => delete process.env[k]); });
  afterEach(() => {
    CREDS.forEach(k => { if (orig[k] === undefined) delete process.env[k]; else process.env[k] = orig[k]; });
    global.fetch = originalFetch;
  });

  test('returns null when no credentials are configured (never calls fetch)', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const svc = new DiscogsService();

    const result = await svc.lookup(baseQuery);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('parses a mocked search hit when a token is set', async () => {
    process.env.DISCOGS_TOKEN = 'test-token';
    const fetchMock = jest.fn((..._args: unknown[]) => Promise.resolve({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 999,
            barcode: ['7 24382 66421 1'],
            cover_image: 'https://img.discogs.com/cover.jpg',
            genre: ['Electronic'],
            year: 1998,
          },
        ],
      }),
    }));
    global.fetch = fetchMock as never;
    const svc = new DiscogsService();

    const result = await svc.lookup({ ...baseQuery, barcode: '724382664211' });

    expect(result).toEqual({
      discogsId: '999',
      barcode: '724382664211',
      imageUrl: 'https://img.discogs.com/cover.jpg',
      genre: 'Electronic',
      year: 1998,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('barcode=724382664211');
  });

  test('returns null (never throws) when the request errors', async () => {
    process.env.DISCOGS_TOKEN = 'test-token';
    global.fetch = jest.fn(async () => { throw new Error('network down'); }) as never;
    const svc = new DiscogsService();

    const result = await svc.lookup(baseQuery);

    expect(result).toBeNull();
  });

  test('returns null when the response has no results', async () => {
    process.env.DISCOGS_TOKEN = 'test-token';
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: [] }) })) as never;
    const svc = new DiscogsService();

    const result = await svc.lookup(baseQuery);

    expect(result).toBeNull();
  });

  test('uses consumer key+secret auth header when configured', async () => {
    process.env.DISCOGS_KEY = 'ckey';
    process.env.DISCOGS_SECRET = 'csecret';
    const fetchMock = jest.fn((..._args: unknown[]) => Promise.resolve({ ok: true, json: async () => ({ results: [{ id: 42 }] }) }));
    global.fetch = fetchMock as never;
    const svc = new DiscogsService();

    const result = await svc.lookup({ ...baseQuery, barcode: '724382664211' });

    expect(result).toEqual({ discogsId: '42' });
    const opts = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(opts.headers.Authorization).toBe('Discogs key=ckey, secret=csecret');
  });
});
