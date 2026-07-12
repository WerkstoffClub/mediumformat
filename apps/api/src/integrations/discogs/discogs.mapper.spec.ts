import { RecordFormat } from '@prisma/client';
import { mapDiscogsRelease, DiscogsRelease } from './discogs.mapper';

// CJS require keeps the TS interop-agnostic (project has no esModuleInterop).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const realFixture: DiscogsRelease = require('../../../test/fixtures/discogs/release-249504.json');

/** Build a minimal-but-complete Discogs release around the given overrides. */
function makeRelease(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 111,
    title: 'Some Title',
    year: 2001,
    country: 'US',
    artists: [{ name: 'Some Artist' }],
    labels: [{ name: 'Some Label', catno: 'SL-001' }],
    formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album'] }],
    tracklist: [{ position: 'A1', title: 'Intro', duration: '1:23' }],
    images: [{ type: 'primary', uri: 'https://x/p.jpg', uri150: 'https://x/p-150.jpg' }],
    ...overrides,
  };
}

describe('mapDiscogsRelease — core fields (real fixture)', () => {
  const mapped = mapDiscogsRelease(realFixture);

  test('extracts discogsId as string', () => {
    expect(mapped.discogsId).toBe('249504');
  });

  test('extracts artist', () => {
    expect(mapped.artist).toBe('Rick Astley');
  });

  test('extracts title', () => {
    expect(mapped.title).toBe('Never Gonna Give You Up');
  });

  test('extracts label and catNumber from first label', () => {
    expect(mapped.label).toBe('RCA');
    expect(mapped.catNumber).toBe('PB 41447');
  });

  test('extracts year > 1900', () => {
    expect(mapped.year).toBe(1987);
    expect(mapped.year!).toBeGreaterThan(1900);
  });

  test('extracts country', () => {
    expect(mapped.country).toBe('UK');
  });
});

describe('mapDiscogsRelease — artist disambiguation', () => {
  test('strips trailing "(2)" disambiguation from artist name', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ artists: [{ name: 'John (2)' }] }),
    );
    expect(mapped.artist).toBe('John');
  });

  test('joins multiple artists with ", "', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ artists: [{ name: 'Alice' }, { name: 'Bob' }] }),
    );
    expect(mapped.artist).toBe('Alice, Bob');
  });
});

describe('mapDiscogsRelease — format mapping', () => {
  test('1x Vinyl LP → LP', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.LP);
  });

  test('2x Vinyl LP → TWO_LP', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'Vinyl', qty: '2', descriptions: ['LP', 'Album'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.TWO_LP);
  });

  test('3x Vinyl LP → THREE_LP', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'Vinyl', qty: '3', descriptions: ['LP'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.THREE_LP);
  });

  test('Vinyl + 12" → TWELVE_INCH', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'Vinyl', qty: '1', descriptions: ['12"', '45 RPM'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.TWELVE_INCH);
  });

  test('Vinyl + 7" → SEVEN_INCH (real fixture)', () => {
    const mapped = mapDiscogsRelease(realFixture);
    expect(mapped.format).toBe(RecordFormat.SEVEN_INCH);
  });

  test('1x CD → CD', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'CD', qty: '1', descriptions: ['Album'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.CD);
  });

  test('2x CD → TWO_CD', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'CD', qty: '2', descriptions: ['Album'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.TWO_CD);
  });

  test('Cassette → CASSETTE', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'Cassette', qty: '1', descriptions: ['Album'] }] }),
    );
    expect(mapped.format).toBe(RecordFormat.CASSETTE);
  });

  test('unknown format → undefined', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ formats: [{ name: 'File', qty: '1', descriptions: ['FLAC'] }] }),
    );
    expect(mapped.format).toBeUndefined();
  });
});

describe('mapDiscogsRelease — weight extraction', () => {
  test('"180 Gram" on 1x LP → 180', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({
        formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album', '180 Gram'] }],
      }),
    );
    expect(mapped.weightGrams).toBe(180);
  });

  test('"180 Gram" on 2x LP → 360', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({
        formats: [{ name: 'Vinyl', qty: '2', descriptions: ['LP', 'Album', '180 Gram'] }],
      }),
    );
    expect(mapped.weightGrams).toBe(360);
  });

  test('no gram indicator → null', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({
        formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP', 'Album'] }],
      }),
    );
    expect(mapped.weightGrams).toBeNull();
  });

  test('real fixture (no gram indicator) → null', () => {
    const mapped = mapDiscogsRelease(realFixture);
    expect(mapped.weightGrams).toBeNull();
  });
});

describe('mapDiscogsRelease — dimensions', () => {
  test('dimensionsMm is always null', () => {
    const mapped = mapDiscogsRelease(realFixture);
    expect(mapped.dimensionsMm).toBeNull();
  });
});

describe('mapDiscogsRelease — tracklist', () => {
  test('extracts tracks with position, title, and duration (real fixture)', () => {
    const mapped = mapDiscogsRelease(realFixture);
    expect(mapped.tracks).toEqual([
      { position: 'A', title: 'Never Gonna Give You Up', duration: '3:32' },
      { position: 'B', title: 'Never Gonna Give You Up (Instrumental)', duration: '3:30' },
    ]);
  });

  test('missing duration becomes undefined', () => {
    const mapped = mapDiscogsRelease(
      makeRelease({ tracklist: [{ position: 'A1', title: 'Song', duration: '' }] }),
    );
    expect(mapped.tracks).toEqual([{ position: 'A1', title: 'Song', duration: undefined }]);
  });
});

describe('mapDiscogsRelease — images', () => {
  test('extracts primary + secondary images (real fixture)', () => {
    const mapped = mapDiscogsRelease(realFixture);
    expect(mapped.images.length).toBeGreaterThan(1);
    expect(mapped.images[0].type).toBe('primary');
    expect(mapped.images[0].uri).toContain('https://');
    expect(mapped.images[0].uri150).toContain('https://');
    expect(mapped.images.slice(1).every((img) => img.type === 'secondary')).toBe(true);
  });

  test('handles missing images gracefully', () => {
    const mapped = mapDiscogsRelease(makeRelease({ images: [] }));
    expect(mapped.images).toEqual([]);
  });
});
