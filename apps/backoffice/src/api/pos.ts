import type { Release } from '@mf/shared';

/** A sellable product in the register — a Release from the DealPOS-synced catalogue. */
export interface PosProduct {
  id: string;
  artist: string;
  title: string;
  priceIdr: number;
  /** Coarse category used by the register's category chips. */
  category: PosCategory;
  /** Short format tag shown on the tile, e.g. "LP", "CD", "MERCH". */
  formatLabel: string;
  condition: string | null;
  imageUrl: string | null;
  stock: number;
}

export type PosCategory = 'vinyl' | 'cd' | 'cassette' | 'merch';

/** A line in the cart — a product plus a quantity. */
export interface CartLine {
  product: PosProduct;
  qty: number;
}

/** PPN — Indonesian VAT, matches the register mockup ("PPN 11%"). */
export const TAX_RATE = 0.11;

/** Map a Release format code to the register's coarse category. */
// The API sends Prisma enum names (TWO_LP, TWELVE_INCH…); older shared types use 2xLP/12_INCH.
export function categoryOf(format: Release['format'] | string): PosCategory {
  if (format === 'CD' || format === '2xCD' || format === 'TWO_CD') return 'cd';
  if (format === 'CASSETTE') return 'cassette';
  if (format === 'MERCH') return 'merch';
  return 'vinyl';
}

/** Short, tile-friendly format label (e.g. "2xLP" → "2LP", "12_INCH" → '12"'). */
export function formatLabel(format: Release['format'] | string): string {
  const map: Record<string, string> = {
    LP: 'LP', '2xLP': '2LP', '3xLP': '3LP', TWO_LP: '2LP', THREE_LP: '3LP',
    '12_INCH': '12"', '7_INCH': '7"', TWELVE_INCH: '12"', SEVEN_INCH: '7"',
    CD: 'CD', '2xCD': '2CD', TWO_CD: '2CD', CASSETTE: 'Cassette', MERCH: 'Merch',
  };
  return map[format] ?? format;
}

export function releaseToProduct(r: Release): PosProduct {
  return {
    id: r.id,
    artist: r.artist,
    title: r.title,
    priceIdr: r.priceIdr,
    category: categoryOf(r.format),
    formatLabel: formatLabel(r.format),
    condition: r.condition,
    imageUrl: r.imageUrl,
    stock: r.stock,
  };
}

