import { describe, expect, it } from 'vitest';
import { CODE128_PATTERNS, code128Bars, code128Values, code128Widths } from './code128';

/** Independent decoder: widths → symbol values, so encoding is checked by round trip. */
function decode(widths: number[]): number[] {
  const values: number[] = [];
  for (let i = 0; i < widths.length;) {
    const len = values.length > 0 && widths.length - i === 7 ? 7 : 6;
    const v = CODE128_PATTERNS.indexOf(widths.slice(i, i + len).join(''));
    if (v < 0) throw new Error(`bad pattern at ${i}`);
    values.push(v);
    i += len;
  }
  return values;
}

function text(values: number[]): string {
  const [start, ...rest] = values;
  const data = rest.slice(0, -2);
  let set = start === 105 ? 'C' : 'B';
  let out = '';
  for (const v of data) {
    if (v === 100) { set = 'B'; continue; }
    out += set === 'C' ? String(v).padStart(2, '0') : String.fromCharCode(v + 32);
  }
  return out;
}

function checksumOk(values: number[]): boolean {
  const body = values.slice(0, -2);
  const sum = body.slice(1).reduce((s, v, i) => s + v * (i + 1), body[0]);
  return sum % 103 === values[values.length - 2];
}

describe('Code 128', () => {
  it('has 11-module symbols and a 13-module stop', () => {
    CODE128_PATTERNS.slice(0, 106).forEach(p => expect([...p].reduce((s, d) => s + Number(d), 0)).toBe(11));
    expect([...CODE128_PATTERNS[106]].reduce((s, d) => s + Number(d), 0)).toBe(13);
  });

  it.each(['VNL-001', 'NINJA-CD/LP', 'MF-000123', 'a b', '12'])('round-trips %s in set B', value => {
    const values = decode(code128Widths(value));
    expect(values[0]).toBe(104);
    expect(text(values)).toBe(value);
    expect(checksumOk(values)).toBe(true);
  });

  it.each(['5054429135658', '0602547288234', '1234'])('uses set C for digit codes (%s)', value => {
    const values = decode(code128Widths(value));
    expect(values[0]).toBe(105);
    expect(text(values)).toBe(value);
    expect(checksumOk(values)).toBe(true);
  });

  it('encodes an EAN-13 more compactly in set C than set B would', () => {
    // 13 digits: start + 6 pairs + CODE B + 1 digit + check + stop
    expect(code128Values('5054429135658')).toHaveLength(11);
  });

  it('starts and ends on a bar and adds quiet zones', () => {
    const widths = code128Widths('VNL-001');
    expect(widths.length % 2).toBe(1);
    const { bars, width } = code128Bars('VNL-001', 10);
    expect(bars[0].x).toBe(10);
    expect(width).toBe(widths.reduce((a, b) => a + b, 0) + 20);
  });

  it('rejects characters outside printable ASCII', () => {
    expect(() => code128Values('Café')).toThrow();
    expect(() => code128Values('')).toThrow();
  });
});
