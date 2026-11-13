import { describe, expect, it } from 'vitest';
import { parseEdcSlip } from './Overlays';
import { categoryOf, formatLabel } from '../../api/pos';

describe('parseEdcSlip', () => {
  it('records the slip as entered, upper-casing the approval code', () => {
    expect(parseEdcSlip({ approvalCode: 'a1b2c3', rrn: '123456789012', last4: '4321', scheme: 'Visa' }))
      .toEqual({ ok: true, result: { approvalCode: 'A1B2C3', rrn: '123456789012', scheme: 'Visa', pan: '**** 4321' } });
  });
  it('allows RRN, card and type to be left empty', () => {
    expect(parseEdcSlip({ approvalCode: '004512', rrn: '', last4: '', scheme: '' }))
      .toEqual({ ok: true, result: { approvalCode: '004512', rrn: '', scheme: '', pan: '' } });
  });
  it.each([
    [{ approvalCode: '12345', rrn: '', last4: '', scheme: '' }],
    [{ approvalCode: '123456', rrn: '12ab', last4: '', scheme: '' }],
    [{ approvalCode: '123456', rrn: '', last4: '41111', scheme: '' }],
  ])('rejects malformed slips %#', input => {
    expect(parseEdcSlip(input).ok).toBe(false);
  });
});

describe('POS format mapping', () => {
  it('understands the Prisma enum names the API sends', () => {
    expect(categoryOf('TWO_CD')).toBe('cd');
    expect(formatLabel('TWO_LP')).toBe('2LP');
    expect(formatLabel('SEVEN_INCH')).toBe('7"');
  });
  it('keeps the older shared names working', () => {
    expect(categoryOf('2xCD')).toBe('cd');
    expect(formatLabel('2xLP')).toBe('2LP');
  });
});
