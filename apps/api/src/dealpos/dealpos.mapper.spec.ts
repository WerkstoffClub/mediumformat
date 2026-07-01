import { RecordFormat } from '@prisma/client';
import {
  genreFromCategory,
  inferFormat,
  mapVariantToRelease,
  normalizeBarcode,
  splitArtistTitle,
} from './dealpos.mapper';

describe('splitArtistTitle', () => {
  test('splits on hyphen with spaces', () => {
    expect(splitArtistTitle('Fugazi - Repeater')).toEqual({ artist: 'Fugazi', title: 'Repeater' });
  });

  test('splits on en dash', () => {
    expect(splitArtistTitle('Sade – Diamond Life')).toEqual({ artist: 'Sade', title: 'Diamond Life' });
  });

  test('keeps hyphenated words intact (no spaces)', () => {
    expect(splitArtistTitle('Jay-Z')).toEqual({ artist: 'Various', title: 'Jay-Z' });
  });

  test('falls back to Various when no separator', () => {
    expect(splitArtistTitle('Store Tote Bag')).toEqual({ artist: 'Various', title: 'Store Tote Bag' });
  });

  test('splits on the first separator only', () => {
    expect(splitArtistTitle('Nas - Illmatic - Reissue')).toEqual({ artist: 'Nas', title: 'Illmatic - Reissue' });
  });
});

describe('inferFormat', () => {
  test.each([
    ['Vinyl/LP', RecordFormat.LP],
    ['2LP Gatefold', RecordFormat.TWO_LP],
    ['3xLP box', RecordFormat.THREE_LP],
    ['12 inch single', RecordFormat.TWELVE_INCH],
    ['7" single', RecordFormat.SEVEN_INCH],
    ['CD digipak', RecordFormat.CD],
    ['2CD deluxe', RecordFormat.TWO_CD],
    ['Merch/T-Shirt', RecordFormat.MERCH],
  ])('%s → %s', (text, expected) => {
    expect(inferFormat(text)).toBe(expected);
  });

  test('defaults to LP', () => {
    expect(inferFormat('Something unknown')).toBe(RecordFormat.LP);
    expect(inferFormat(undefined)).toBe(RecordFormat.LP);
  });
});

describe('genreFromCategory', () => {
  test('takes the leaf of a hierarchical category', () => {
    expect(genreFromCategory('Vinyl/Jazz')).toBe('Jazz');
  });

  test('ignores format-only categories', () => {
    expect(genreFromCategory('Vinyl')).toBeNull();
    expect(genreFromCategory('CD')).toBeNull();
  });

  test('handles missing category', () => {
    expect(genreFromCategory(undefined)).toBeNull();
  });
});

describe('normalizeBarcode', () => {
  test('accepts EAN/UPC digit strings', () => {
    expect(normalizeBarcode('0810180991131')).toBe('0810180991131');
  });

  test('rejects SKU-style codes', () => {
    expect(normalizeBarcode('MF-LP-001')).toBeNull();
    expect(normalizeBarcode('1003L')).toBeNull();
  });
});

describe('mapVariantToRelease', () => {
  const product = {
    ID: 'prod-1',
    Name: 'Duster - Stratosphere',
    Category: 'Vinyl/Shoegaze',
    ImageUrl: '//res.cloudinary.com/dealpos/image/upload/x.jpg',
    Variants: [],
  };

  test('maps a full variant', () => {
    const release = mapVariantToRelease(product, {
      ID: 'var-1', Model: 'Clear Vinyl', Code: '617308017083',
      UnitPrice: 550000.4, UnitCost: 320000, Inventory: 3.0,
    });
    expect(release).toEqual({
      artist: 'Duster',
      title: 'Stratosphere (Clear Vinyl)',
      format: RecordFormat.LP,
      genre: 'Shoegaze',
      priceIdr: 550000,
      costIdr: 320000,
      stock: 3,
      barcode: '617308017083',
      imageUrl: 'https://res.cloudinary.com/dealpos/image/upload/x.jpg',
      dealposProductId: 'prod-1',
      dealposVariantId: 'var-1',
    });
  });

  test('skips edition suffix for standard/default models', () => {
    const release = mapVariantToRelease(product, { ID: 'var-2', Model: 'Standard', UnitPrice: 100 });
    expect(release.title).toBe('Stratosphere');
  });

  test('clamps negative stock and missing price', () => {
    const release = mapVariantToRelease(product, { ID: 'var-3', Inventory: -2 });
    expect(release.stock).toBe(0);
    expect(release.priceIdr).toBe(0);
    expect(release.costIdr).toBeNull();
  });
});
