import { InvoiceParserService } from './invoice-parser.service';
import type { InvoiceParserProvider } from './invoice-parser.provider';
import raw from './__fixtures__/juno-raw.json';

describe('InvoiceParserService', () => {
  const provider: InvoiceParserProvider = { extract: async () => raw as any };
  const svc = new InvoiceParserService(provider);

  it('normalizes formats, fills weights, flags line validity', async () => {
    const out = await svc.parse('ignored text');
    expect(out.currency).toBe('EUR');
    expect(out.lines).toHaveLength(4);
    const byTitle = Object.fromEntries(out.lines.map(l => [l.title, l]));
    expect(byTitle['Submarine'].format).toBe('CD');
    expect(byTitle['R Plus Seven'].format).toBe('TWO_LP');
    expect(byTitle['AIAIAI Tracks'].format).toBe('MERCH');
    expect(byTitle['Sexistential'].format).toBe('CASSETTE');
    expect(byTitle['Submarine'].weightKg).toBeGreaterThan(0);
    expect(byTitle['Submarine'].lineValid).toBe(true); // 2×4.52≈9.05 within tolerance
  });

  it('flags totals mismatch when line sum + shipping ≠ invoice total', async () => {
    const out = await svc.parse('x');
    // The 4 fixture lines sum to 85.58 + 272.74 shipping = 358.32, far from the
    // full invoice total (1484.22), so reconciliation must fail and warn.
    expect(out.totalsReconcile).toBe(false);
    expect(out.warnings).toContain('Line total + shipping does not match the invoice total');
  });
});
