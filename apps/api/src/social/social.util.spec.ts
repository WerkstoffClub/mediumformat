import { RecordCondition, RecordFormat, Release, SocialSettings, StoreLocation } from '@prisma/client';
import {
  buildWaLink,
  fillTemplate,
  listingWarnings,
  normalizeWaPhone,
  releaseToFeedRow,
} from './social.util';

const release = (overrides: Partial<Release> = {}): Release => ({
  id: 'rel-1',
  artist: 'Duster',
  title: 'Stratosphere',
  label: 'Numero Group',
  catNumber: 'NUM-901',
  year: 2019,
  format: RecordFormat.LP,
  genre: 'Shoegaze',
  condition: RecordCondition.M,
  priceIdr: 550000,
  stock: 3,
  notes: null,
  imageUrl: 'https://img.example/cover.jpg',
  barcode: '0825764607896',
  storeLocation: StoreLocation.MAIN_STORE,
  shelfLocation: null,
  lowStockThreshold: 2,
  discogsId: null,
  dealposProductId: null,
  dealposVariantId: null,
  costIdr: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const settings = (overrides: Partial<SocialSettings> = {}): SocialSettings => ({
  id: 1,
  waPhone: '0812-3456-7890',
  waTemplate: "Hi! I'd like to buy *{title}* ({price})",
  igUsername: null,
  fbPageUrl: null,
  storefrontUrlBase: null,
  feedEnabled: true,
  updatedAt: new Date(),
  ...overrides,
});

describe('normalizeWaPhone', () => {
  test('converts Indonesian leading zero to 62', () => {
    expect(normalizeWaPhone('0812-3456-7890')).toBe('6281234567890');
  });

  test('strips plus and spaces', () => {
    expect(normalizeWaPhone('+62 812 3456 7890')).toBe('6281234567890');
  });
});

describe('fillTemplate / buildWaLink', () => {
  test('replaces all placeholders', () => {
    expect(fillTemplate('{artist} - {title} - {price}', { artist: 'A', title: 'T', price: 'P' })).toBe('A - T - P');
  });

  test('builds an encoded wa.me link', () => {
    const link = buildWaLink('08123', 'Buy {title} & more', { artist: 'A', title: 'T', price: 'P' });
    expect(link).toBe('https://wa.me/628123?text=Buy%20T%20%26%20more');
  });
});

describe('releaseToFeedRow', () => {
  test('maps a mint in-stock release', () => {
    const row = releaseToFeedRow(release(), settings());
    expect(row).toMatchObject({
      id: 'rel-1',
      title: 'Duster – Stratosphere',
      availability: 'in stock',
      condition: 'new',
      price: '550000 IDR',
      image_link: 'https://img.example/cover.jpg',
      brand: 'Numero Group',
    });
    expect(row.link).toContain('https://wa.me/6281234567890?text=');
    expect(row.description).toContain('Shoegaze');
  });

  test('non-mint condition maps to used; zero stock to out of stock', () => {
    const row = releaseToFeedRow(release({ condition: RecordCondition.VG, stock: 0 }), settings());
    expect(row.condition).toBe('used');
    expect(row.availability).toBe('out of stock');
  });

  test('prefers storefront URL when configured', () => {
    const row = releaseToFeedRow(release(), settings({ storefrontUrlBase: 'https://mediumformat.info/shop/' }));
    expect(row.link).toBe('https://mediumformat.info/shop/rel-1');
  });

  test('empty link when neither storefront nor phone set', () => {
    const row = releaseToFeedRow(release(), settings({ waPhone: null }));
    expect(row.link).toBe('');
  });
});

describe('listingWarnings', () => {
  test('flags missing image, zero price, no stock, no link target', () => {
    const warnings = listingWarnings(
      release({ imageUrl: null, priceIdr: 0, stock: 0 }),
      settings({ waPhone: null }),
    );
    expect(warnings).toHaveLength(4);
  });

  test('clean release has no warnings', () => {
    expect(listingWarnings(release(), settings())).toHaveLength(0);
  });
});
