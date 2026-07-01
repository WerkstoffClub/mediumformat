import { toCsv } from './finance.service';

describe('toCsv', () => {
  test('returns empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  test('serialises rows with a header', () => {
    expect(toCsv([{ method: 'Cash', amount: 1000, share: null }])).toBe(
      'method,amount,share\nCash,1000,\n',
    );
  });

  test('escapes commas and quotes', () => {
    expect(toCsv([{ group: 'Nas - Illmatic, "Deluxe"', revenue: 5 }])).toBe(
      'group,revenue\n"Nas - Illmatic, ""Deluxe""",5\n',
    );
  });
});
