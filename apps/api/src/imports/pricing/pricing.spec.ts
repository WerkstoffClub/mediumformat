import {
  allocateByWeight, channelPrice, landedCostPerUnitIdr, roundPrice,
} from './pricing';

describe('allocateByWeight', () => {
  test('splits proportionally to weight', () => {
    const result = allocateByWeight([1, 3], 400);
    expect(result).toEqual([100, 300]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(400);
  });

  test('assigns rounding remainder to the largest-weight line', () => {
    // 3-way split of 100 by equal weight: 33.33 each -> rounds to 33/33/33 = 99,
    // remainder of 1 must land on a weight-tied line without losing the total.
    const result = allocateByWeight([1, 1, 1], 100);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100);
  });

  test('splits evenly when all weights are zero', () => {
    const result = allocateByWeight([0, 0, 0, 0], 100);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100);
    // even split of 100 across 4 lines -> 25 each
    expect(result).toEqual([25, 25, 25, 25]);
  });

  test('returns an empty array for no lines', () => {
    expect(allocateByWeight([], 500)).toEqual([]);
  });

  test('does not lose pennies on an uneven proportional split', () => {
    // weights 1/1/5 of 100: raw shares round to 14/14/71 (sums to 99),
    // the missing unit must land on the largest-weight (5) line.
    const result = allocateByWeight([1, 1, 5], 100);
    expect(result).toEqual([14, 14, 72]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100);
  });
});

describe('landedCostPerUnitIdr', () => {
  test('converts unit price and spreads shared costs across qty', () => {
    // unit price 20 USD * fx 15000 = 300000, plus (60000+30000)/2 qty = 45000/unit
    const result = landedCostPerUnitIdr(20, 15000, 60000, 30000, 2);
    expect(result).toBe(345000);
  });

  test('handles zero allocated costs', () => {
    const result = landedCostPerUnitIdr(10, 15000, 0, 0, 1);
    expect(result).toBe(150000);
  });

  test('guards against division by zero qty', () => {
    const result = landedCostPerUnitIdr(10, 15000, 1000, 1000, 0);
    expect(result).toBe(150000);
  });
});

describe('roundPrice', () => {
  test('IDR NEAREST_1000 rounds up to the next 1,000', () => {
    expect(roundPrice(244444, 'NEAREST_1000', 'IDR')).toBe(245000);
    expect(roundPrice(245000, 'NEAREST_1000', 'IDR')).toBe(245000);
    expect(roundPrice(244001, 'NEAREST_1000', 'IDR')).toBe(245000);
  });

  test('IDR X900 rounds up to the next ...900 price point', () => {
    expect(roundPrice(244444, 'X900', 'IDR')).toBe(244900);
    expect(roundPrice(244001, 'X900', 'IDR')).toBe(244900);
  });

  test('USD rounds up to the nearest 0.5', () => {
    expect(roundPrice(19.01, 'NEAREST_1000', 'USD')).toBe(19.5);
    expect(roundPrice(19.5, 'NEAREST_1000', 'USD')).toBe(19.5);
    expect(roundPrice(19.51, 'NEAREST_1000', 'USD')).toBe(20);
  });
});

describe('channelPrice', () => {
  test('grosses up landed cost by markup and fee, then rounds (IDR example)', () => {
    // landed 100000, markup 1.2 -> baseNet 220000; fee 0.10 -> gross 244444.44
    // NEAREST_1000 -> 245000
    const result = channelPrice(100000, { feePct: 0.10, rounding: 'NEAREST_1000', currency: 'IDR' }, 1.2, 15000);
    expect(result).toBe(245000);
  });

  test('converts to USD before grossing up for USD channels (e.g. Discogs)', () => {
    // landed 300000 IDR, markup 1.2 -> baseNet 660000 IDR / 15000 usdIdr = 44 USD
    // fee 0.10 -> gross 48.888... -> round up to nearest 0.5 -> 49
    const result = channelPrice(300000, { feePct: 0.10, rounding: 'NEAREST_1000', currency: 'USD' }, 1.2, 15000);
    expect(result).toBe(49);
  });

  test('zero markup and zero fee returns the landed cost, rounded', () => {
    const result = channelPrice(99000, { feePct: 0, rounding: 'NEAREST_1000', currency: 'IDR' }, 0, 15000);
    expect(result).toBe(99000);
  });
});
