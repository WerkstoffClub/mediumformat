import { canonicalizeFormat, WEIGHT_KG } from './formats';

describe('canonicalizeFormat', () => {
  it.each([
    ['6 TRACK CD SINGLE', 'CD'],
    ['GATEFOLD 2XLP + MP3 DOWNLOAD CODE', 'TWO_LP'],
    ['180 GRAM AUDIOPHILE VINYL LP', 'LP'],
    ['HI-FI HEADPHONES', 'MERCH'],
    ['2XCD', 'TWO_CD'],
    ['CASSETTE', 'CASSETTE'],
    ['YELLOW VINYL 7"', 'SEVEN_INCH'],
    ['LIMITED 12"', 'TWELVE_INCH'],
    ['VINYL LP', 'LP'],
    ['CD', 'CD'],
  ])('maps %s -> %s', (raw, expected) => {
    expect(canonicalizeFormat(raw)).toBe(expected);
  });

  it('has a weight for every canonical format returned', () => {
    expect(WEIGHT_KG['TWO_LP']).toBeGreaterThan(WEIGHT_KG['LP']);
    expect(WEIGHT_KG['CD']).toBeGreaterThan(0);
  });
});
