import { describe, expect, it } from 'vitest';
import { fmtNum, fmtPct, fmtRp, fmtRpShort } from './idFormat';

describe('Indonesian number format', () => {
  it('uses dot thousands and comma decimals', () => {
    expect(fmtNum(6214)).toBe('6.214');
    expect(fmtPct(0.926)).toBe('92,6%');
    expect(fmtRp(485000)).toBe('Rp 485.000');
  });
  it('abbreviates as rb / jt / M', () => {
    expect(fmtRpShort(236_000)).toBe('Rp 236 rb');
    expect(fmtRpShort(58_400_000)).toBe('Rp 58,4 jt');
    expect(fmtRpShort(7_420_000_000)).toBe('Rp 7,42 M');
  });
});
