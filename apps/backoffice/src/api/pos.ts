import type { Release } from '@mf/shared';

/** A sellable product in the register — sourced from a Release or a demo/merch item. */
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
export function categoryOf(format: Release['format']): PosCategory {
  if (format === 'CD' || format === '2xCD') return 'cd';
  if (format === 'CASSETTE') return 'cassette';
  if (format === 'MERCH') return 'merch';
  return 'vinyl';
}

/** Short, tile-friendly format label (e.g. "2xLP" → "2LP", "12_INCH" → '12"'). */
export function formatLabel(format: Release['format']): string {
  const map: Record<Release['format'], string> = {
    LP: 'LP', '2xLP': '2LP', '3xLP': '3LP',
    '12_INCH': '12"', '7_INCH': '7"',
    CD: 'CD', '2xCD': '2CD', CASSETTE: 'Cassette', MERCH: 'Merch',
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

/** Fallback catalogue so the register always renders, even offline. */
export const DEMO_PRODUCTS: PosProduct[] = [
  { id: 'demo-1', artist: 'Floating Points', title: 'Promises', priceIdr: 450_000, category: 'vinyl', formatLabel: 'LP', condition: 'VGP', imageUrl: null, stock: 3 },
  { id: 'demo-2', artist: 'Khruangbin', title: 'Mordechai', priceIdr: 520_000, category: 'vinyl', formatLabel: 'LP', condition: 'M', imageUrl: null, stock: 5 },
  { id: 'demo-3', artist: 'John Coltrane', title: 'A Love Supreme', priceIdr: 680_000, category: 'vinyl', formatLabel: 'LP', condition: 'VGP', imageUrl: null, stock: 2 },
  { id: 'demo-4', artist: 'Aphex Twin', title: 'Selected Ambient Works', priceIdr: 590_000, category: 'vinyl', formatLabel: '2LP', condition: 'M', imageUrl: null, stock: 4 },
  { id: 'demo-5', artist: 'Erykah Badu', title: "Mama's Gun", priceIdr: 420_000, category: 'vinyl', formatLabel: 'LP', condition: 'VG', imageUrl: null, stock: 1 },
  { id: 'demo-6', artist: 'Radiohead', title: 'Kid A', priceIdr: 750_000, category: 'vinyl', formatLabel: '2LP', condition: 'M', imageUrl: null, stock: 6 },
  { id: 'demo-7', artist: 'Miles Davis', title: 'Kind of Blue', priceIdr: 890_000, category: 'vinyl', formatLabel: 'LP', condition: 'VGP', imageUrl: null, stock: 2 },
  { id: 'demo-8', artist: 'Bonobo', title: 'Black Sands', priceIdr: 480_000, category: 'vinyl', formatLabel: '2LP', condition: 'M', imageUrl: null, stock: 1 },
  { id: 'demo-9', artist: 'Daft Punk', title: 'Random Access Memories', priceIdr: 195_000, category: 'cd', formatLabel: 'CD', condition: 'M', imageUrl: null, stock: 8 },
  { id: 'demo-10', artist: 'Boards of Canada', title: 'Music Has the Right', priceIdr: 220_000, category: 'cassette', formatLabel: 'Cassette', condition: 'VGP', imageUrl: null, stock: 3 },
  { id: 'demo-11', artist: 'Medium Format', title: 'Tote Bag — Logo', priceIdr: 120_000, category: 'merch', formatLabel: 'Merch', condition: null, imageUrl: null, stock: 20 },
  { id: 'demo-12', artist: 'Medium Format', title: 'Slipmat — Groove', priceIdr: 95_000, category: 'merch', formatLabel: 'Merch', condition: null, imageUrl: null, stock: 15 },
];
