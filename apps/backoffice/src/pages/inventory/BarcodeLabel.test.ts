import { describe, expect, it } from 'vitest';
import { barsLayout, labelFromRelease } from './BarcodeLabel';

const base = {
  artist: 'Floating Points',
  title: 'Crush',
  catNumber: 'NINJA-CD/LP',
  barcode: null,
  format: 'LP',
  condition: 'VGP',
  priceIdr: 485000,
  storeLocation: 'MAIN_STORE',
  shelfLocation: 'A3',
  dealposVariantId: null,
  updatedAt: '2026-11-13T02:00:00Z',
} as const;

describe('labelFromRelease', () => {
  it('encodes the DealPOS EAN when the sync stored one', () => {
    const l = labelFromRelease({ ...base, barcode: '5054429135658', dealposVariantId: 'v-1' });
    expect(l.code).toBe('5054429135658');
    expect(l.fromDealpos).toBe(true);
    expect(l.meta).toBe('LP  ·  NINJA-CD/LP  ·  VG+  ·  Rp 485.000');
  });

  it('falls back to the DealPOS variant code kept in catNumber and does not repeat it in meta', () => {
    const l = labelFromRelease({ ...base, catNumber: 'VNL-001', dealposVariantId: 'v-2' });
    expect(l.code).toBe('VNL-001');
    expect(l.meta).toBe('LP  ·  VG+  ·  Rp 485.000');
  });

  it('formats release, location and DealPOS link like the mockup', () => {
    const l = labelFromRelease(base);
    expect(l.release).toBe('Floating Points — Crush');
    expect(l.location).toBe('Main Store · A3');
    expect(l.fromDealpos).toBe(false);
  });

  it('has no code when the release has neither barcode nor code', () => {
    expect(labelFromRelease({ ...base, catNumber: null, shelfLocation: null }).code).toBeNull();
    expect(labelFromRelease({ ...base, catNumber: '  ' }).code).toBeNull();
  });
});

describe('barsLayout', () => {
  it('uses 2 printer dots per module for DealPOS codes and EANs', () => {
    expect(barsLayout('VNL-001')?.dots).toBe(2);
    expect(barsLayout('5054429135658')?.dots).toBe(2);
    expect(barsLayout('5054429135658')!.widthMm).toBeLessThanOrEqual(45.2);
  });
  it('drops to 1 dot (and warns) when the code is too long for 50 mm', () => {
    expect(barsLayout('MF-DISPLAY-B-STOCK-2026-0042')?.dots).toBe(1);
  });
});
