import { DiscogsService } from './discogs.service';
import { RecordFormat } from '@prisma/client';

const baseQuery = {
  artist: 'Boards of Canada',
  title: 'Music Has the Right to Children',
  format: RecordFormat.TWO_LP,
};

describe('DiscogsService.lookup', () => {
  const originalToken = process.env.DISCOGS_TOKEN;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.DISCOGS_TOKEN;
    else process.env.DISCOGS_TOKEN = originalToken;
    global.fetch = originalFetch;
  });

  test('returns null when DISCOGS_TOKEN is unset (never calls fetch)', async () => {
    delete process.env.DISCOGS_TOKEN;
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
});
