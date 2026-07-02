import { RecordFormat } from '@prisma/client';

export interface DpProductVariant {
  ID: string;
  Model?: string;
  Code?: string;
  UnitPrice?: number;
  UnitCost?: number;
  Inventory?: number;
  ProductID?: string;
  Discontinued?: boolean;
}

export interface DpProduct {
  ID: string;
  Name: string;
  Code?: string;
  Category?: string;
  ImageUrl?: string;
  Discontinued?: boolean;
  Variants?: DpProductVariant[];
}

export interface ReleaseUpsertData {
  artist: string;
  title: string;
  format: RecordFormat;
  genre: string | null;
  priceIdr: number;
  costIdr: number | null;
  stock: number;
  barcode: string | null;
  catNumber: string | null;
  imageUrl: string | null;
  dealposProductId: string;
  dealposVariantId: string;
}

const FORMAT_PATTERNS: Array<[RegExp, RecordFormat]> = [
  [/3\s*x?\s*lp|3lp|triple/i, RecordFormat.THREE_LP],
  [/2\s*x?\s*lp|2lp|double/i, RecordFormat.TWO_LP],
  [/12\s*(inch|")|maxi/i, RecordFormat.TWELVE_INCH],
  [/7\s*(inch|")|single/i, RecordFormat.SEVEN_INCH],
  [/2\s*x?\s*cd|2cd/i, RecordFormat.TWO_CD],
  [/\bcd\b|compact/i, RecordFormat.CD],
  [/kaset|cassette|\btape\b/i, RecordFormat.CASSETTE],
  [/merch|shirt|tote|cap|apparel|accessor/i, RecordFormat.MERCH],
  [/\blp\b|vinyl|album/i, RecordFormat.LP],
];

/** DealPOS product names are prefixed with a format word: "VINYL Bon Iver - …". */
const NAME_PREFIX = /^(VINYL|LP|CD|KASET|CASSETTE|TAPE|MERCH)\s+/i;

export function stripFormatPrefix(name: string): { cleaned: string; prefix: string | null } {
  const match = name.match(NAME_PREFIX);
  if (!match) return { cleaned: name, prefix: null };
  return { cleaned: name.slice(match[0].length).trim(), prefix: match[1] };
}

/** Infer a RecordFormat from DealPOS category/variant text; LP is the shop default. */
export function inferFormat(...texts: Array<string | undefined>): RecordFormat {
  const haystack = texts.filter(Boolean).join(' ');
  for (const [pattern, format] of FORMAT_PATTERNS) {
    if (pattern.test(haystack)) return format;
  }
  return RecordFormat.LP;
}

/**
 * Split a DealPOS product name into artist/title.
 * Record-shop convention is "Artist - Title" (or an en/em dash).
 */
export function splitArtistTitle(name: string): { artist: string; title: string } {
  const match = name.match(/^(.{1,200}?)\s+[-–—]\s+(.+)$/);
  if (match) return { artist: match[1].trim(), title: match[2].trim() };
  return { artist: 'Various', title: name.trim() };
}

/** Genre from a hierarchical DealPOS category ("Vinyl/Jazz" → "Jazz"). */
export function genreFromCategory(category?: string): string | null {
  if (!category) return null;
  const leaf = category.split('/').map(s => s.trim()).filter(Boolean).pop();
  if (!leaf) return null;
  if (/^(vinyl|cd|cassette|merch|records?|music)$/i.test(leaf)) return null;
  return leaf;
}

/** Only treat digit-strings that look like EAN/UPC as barcodes. */
export function normalizeBarcode(code?: string): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  return /^\d{8,14}$/.test(trimmed) ? trimmed : null;
}

export function mapVariantToRelease(
  product: DpProduct,
  variant: DpProductVariant,
): ReleaseUpsertData {
  const { cleaned, prefix } = stripFormatPrefix(product.Name);
  const { artist, title } = splitArtistTitle(cleaned);
  const model = variant.Model?.trim();
  const withEdition =
    model && !/^(standard|default|-)$/i.test(model) ? `${title} (${model})` : title;
  const imageUrl = product.ImageUrl
    ? product.ImageUrl.startsWith('//') ? `https:${product.ImageUrl}` : product.ImageUrl
    : null;
  return {
    artist,
    title: withEdition,
    format: inferFormat(prefix ?? undefined, product.Category, model, product.Name),
    genre: genreFromCategory(product.Category),
    priceIdr: Math.round(variant.UnitPrice ?? 0),
    costIdr: variant.UnitCost != null ? Math.round(variant.UnitCost) : null,
    stock: Math.max(0, Math.floor(variant.Inventory ?? 0)),
    barcode: normalizeBarcode(variant.Code),
    catNumber: variant.Code?.trim() || null,
    imageUrl,
    dealposProductId: product.ID,
    dealposVariantId: variant.ID,
  };
}
