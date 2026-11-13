/** Code 128 encoder for printed labels (no dependency).
 *  Digits-only values use code set C (two digits per symbol, shorter bars);
 *  everything else uses code set B (printable ASCII 32–126). */

// Bar/space widths for symbol values 0–106 (106 = stop, 7 elements).
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export const CODE128_PATTERNS = PATTERNS;
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const STOP = 106;

/** Symbol values (start … data … checksum, stop) for `text`. Throws on unsupported characters. */
export function code128Values(text: string): number[] {
  if (!text) throw new Error('Code 128: empty value');
  const data: number[] = [];
  let start: number;

  if (/^\d+$/.test(text) && text.length >= 4) {
    start = START_C;
    const even = text.length - (text.length % 2);
    for (let i = 0; i < even; i += 2) data.push(Number(text.slice(i, i + 2)));
    if (even < text.length) data.push(CODE_B, text.charCodeAt(even) - 32);
  } else {
    start = START_B;
    for (const ch of text) {
      const c = ch.charCodeAt(0);
      if (ch.length !== 1 || c < 32 || c > 126) throw new Error(`Code 128: unsupported character "${ch}"`);
      data.push(c - 32);
    }
  }

  const checksum = data.reduce((sum, v, i) => sum + v * (i + 1), start) % 103;
  return [start, ...data, checksum, STOP];
}

/** Alternating bar/space widths in modules, starting with a bar (no quiet zone). */
export function code128Widths(text: string): number[] {
  return code128Values(text).flatMap(v => PATTERNS[v].split('').map(Number));
}

/** Bars as {x, w} in module units, plus total width including a quiet zone each side. */
export function code128Bars(text: string, quiet = 10): { bars: Array<{ x: number; w: number }>; width: number } {
  const widths = code128Widths(text);
  const bars: Array<{ x: number; w: number }> = [];
  let x = quiet;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, width: x + quiet };
}
