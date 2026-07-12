import { RecordFormat } from '@prisma/client';

// Weight per piece (KG). Ported from import_output/build_tsv.py WEIGHT_LB × 0.453592,
// collapsed onto the canonical RecordFormat enum.
export const WEIGHT_KG: Record<RecordFormat, number> = {
  LP: 0.227,
  TWO_LP: 0.454,
  THREE_LP: 0.635,
  TWELVE_INCH: 0.204,
  SEVEN_INCH: 0.091,
  CD: 0.113,
  TWO_CD: 0.204,
  CASSETTE: 0.068,
  MERCH: 0.544,
};

/** Normalize a distributor's free-text/legend format string to a canonical RecordFormat. */
export function canonicalizeFormat(raw: string): RecordFormat {
  const s = (raw || '').toUpperCase();
  const isDouble = /\b2\s?X|DOUBLE|\b2XLP|\b2LP/.test(s);
  const isTriple = /\b3\s?X|TRIPLE|\b3XLP|\b3LP/.test(s);

  if (/HEADPHONE|MERCH|BLU-?RAY|BOOK\b|SHIRT|TOTE/.test(s)) return RecordFormat.MERCH;
  if (/CASSETTE|\bMC\b|\bMCE\b/.test(s)) return RecordFormat.CASSETTE; // enum has no double-cassette
  // Note: leading \b dropped vs. the plan's draft — "2XCD" has no word boundary
  // between "X" and "C" (both \w), so \bCD\b never matched it. CD\b still avoids
  // matching CD as a substring of an unrelated longer word (word-boundary after D).
  if (/CD\b|COMPACT DISC/.test(s)) return isDouble ? RecordFormat.TWO_CD : RecordFormat.CD;
  if (/7"|7 INCH|\b7'|SEVEN/.test(s)) return RecordFormat.SEVEN_INCH;
  if ((/12"|12 INCH|MAXI/.test(s)) && !/LP/.test(s)) return RecordFormat.TWELVE_INCH;
  if (isTriple) return RecordFormat.THREE_LP;
  if (isDouble) return RecordFormat.TWO_LP;
  if (/LP|VINYL/.test(s)) return RecordFormat.LP;
  return RecordFormat.LP; // fallback default (vinyl shop); the full parse is human-reviewed before commit
}
