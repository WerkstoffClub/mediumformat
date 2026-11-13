import { describe, expect, it } from 'vitest';
import { barsLayout, labelFromRelease, mrzField, mrzLine } from './BarcodeLabel';

// The store's template label (mf-labels.pdf): Fontaines DC — Romance, CD, 2025.
const fontaines = {
  artist: 'Fontaines DC',
  title: 'Romance',
  catNumber: 'FONROMC038-P22',
  barcode: null,
  format: 'CD',
  priceIdr: 349000,
  year: 2025,
  genre: 'Indie/Alternative',
  dealposVariantId: 'v-1',
  updatedAt: '2026-11-13T02:00:00Z',
} as const;

describe('labelFromRelease (template label)', () => {
  it('reproduces the template text exactly', () => {
    const l = labelFromRelease(fontaines);
    expect(l.code).toBe('FONROMC038-P22');
    expect(l.price).toBe('Rp349.000');
    expect([l.format, l.year, l.genre]).toEqual(['CD', '2025', 'Indie/Alternative']);
    expect(l.mrz).toEqual([
      'R<MFXFONTAINES<DC<<ROMANCE<<<<<<<<<<',
      'FONROMC038<P22<CD<2025<RP349000<<<<<',
    ]);
    expect(l.fromDealpos).toBe(true);
  });

  it('prefers the EAN the DealPOS sync stored in barcode', () => {
    expect(labelFromRelease({ ...fontaines, barcode: '5054429135658' }).code).toBe('5054429135658');
  });

  it('leaves out a missing year and genre', () => {
    const l = labelFromRelease({ ...fontaines, year: null, genre: null, format: 'TWO_LP' });
    expect([l.year, l.genre, l.format]).toEqual(['', '', '2LP']);
    expect(l.mrz[1]).toBe('FONROMC038<P22<2LP<RP349000<<<<<<<<<');
  });

  it('has no code when the release has neither barcode nor code', () => {
    expect(labelFromRelease({ ...fontaines, catNumber: null }).code).toBeNull();
    expect(labelFromRelease({ ...fontaines, catNumber: '  ' }).code).toBeNull();
  });
});

describe('MRZ helpers', () => {
  it('upper-cases, drops accents and turns everything else into <', () => {
    expect(mrzField('Sigur Rós & Björk')).toBe('SIGUR<ROS<<<BJORK');
  });
  it('pads and cuts to 36 characters', () => {
    expect(mrzLine('ABC')).toHaveLength(36);
    expect(mrzLine('X'.repeat(50))).toBe('X'.repeat(36));
  });
});

describe('barsLayout', () => {
  it('matches the template: 1 printer dot per module for the 14-character code, right-aligned', () => {
    const b = barsLayout('FONROMC038-P22')!;
    expect(b.dots).toBe(1);
    expect(b.width).toBe(189);
    expect(b.x).toBe(191);
    expect(b.squeezed).toBe(false);
  });
  it('uses 2 dots per module when the code is short enough', () => {
    expect(barsLayout('VNL-001')?.dots).toBe(2);
    expect(barsLayout('5054429135658')?.dots).toBe(2);
  });
  it('flags codes too long for the space', () => {
    expect(barsLayout('MF-DISPLAY-B-STOCK-2026-0042')?.squeezed).toBe(true);
  });
});
