import { useMemo, useRef, useState } from 'react';
import type { Release } from '@mf/shared';
import { code128Bars } from '../../lib/code128';
import { ModalShell } from './release-edit/ModalShell';

/* MF price/barcode label, 50 × 30 mm, the store's existing template (as printed
   by the MF Label Printer): artist / title / price, format · year · genre, the
   MF mark and a Code 128 of the DealPOS variant code, then two machine-readable
   lines. Data comes from the DealPOS sync (variant Code → `barcode` for EANs,
   `catNumber` otherwise; UnitPrice → `priceIdr`).

   The label is one SVG whose units are printer dots: 400 × 240 at 203 dpi, so
   every bar is a whole number of dots and the layout matches the template. */

export const LABEL_MM = { w: 50, h: 30 } as const;
const W = 400; // dots (50 mm @ 203 dpi)
const H = 240; // dots (30 mm)
const LEFT = 21;
const RIGHT = 379;
const BARS_MIN_X = 75; // barcode may grow left until just past the MF mark
const MRZ_LEN = 36;

type LabelRelease = Pick<Release,
  'artist' | 'title' | 'catNumber' | 'barcode' | 'format' | 'priceIdr' | 'year' | 'genre' |
  'dealposVariantId' | 'updatedAt'>;

export interface LabelData {
  /** Value encoded in the barcode; null when the release has nothing to scan. */
  code: string | null;
  artist: string;
  title: string;
  price: string;
  format: string;
  year: string;
  genre: string;
  mrz: [string, string];
  /** True when the release came from (and is kept in sync with) DealPOS. */
  fromDealpos: boolean;
  syncedAt: string;
}

const FORMAT_LABEL: Record<string, string> = {
  LP: 'LP', TWO_LP: '2LP', THREE_LP: '3LP', TWELVE_INCH: '12"', SEVEN_INCH: '7"',
  CD: 'CD', TWO_CD: '2CD', CASSETTE: 'Cassette', MERCH: 'Merch',
  '2xLP': '2LP', '3xLP': '3LP', '12_INCH': '12"', '7_INCH': '7"', '2xCD': '2CD',
};

const nf = new Intl.NumberFormat('id-ID');

/** MRZ field: upper-case A–Z/0–9, accents dropped, everything else becomes "<". */
export function mrzField(v: string | number | null | undefined): string {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '<');
}

/** Pad with "<" (or cut) to the fixed MRZ line length. */
export function mrzLine(text: string, len = MRZ_LEN): string {
  return text.length >= len ? text.slice(0, len) : text + '<'.repeat(len - text.length);
}

export function labelFromRelease(r: LabelRelease): LabelData {
  const code = (r.barcode ?? r.catNumber ?? '').trim() || null;
  const format = FORMAT_LABEL[r.format] ?? r.format;
  const year = r.year ? String(r.year) : '';
  const line2 = [mrzField(code), mrzField(format), year, `RP${Math.round(r.priceIdr)}`].filter(Boolean).join('<');
  return {
    code,
    artist: r.artist,
    title: r.title,
    price: `Rp${nf.format(Math.round(r.priceIdr))}`,
    format,
    year,
    genre: r.genre?.trim() ?? '',
    mrz: [mrzLine(`R<MFX${mrzField(r.artist)}<<${mrzField(r.title)}`), mrzLine(line2)],
    fromDealpos: Boolean(r.dealposVariantId),
    syncedAt: r.updatedAt,
  };
}

/** Bars in whole printer dots, right-aligned: 2 dots per module if it fits, else 1 (as in the template). */
export function barsLayout(code: string | null) {
  if (!code) return null;
  try {
    const b = code128Bars(code, 0);
    const room = RIGHT + 1 - BARS_MIN_X;
    const dots = b.width * 2 <= room ? 2 : 1;
    const width = b.width * dots;
    return { ...b, dots, x: RIGHT + 1 - Math.min(width, room), widthDots: Math.min(width, room), squeezed: width > room, error: null as string | null };
  } catch (e) {
    return { bars: [], width: 1, dots: 0, x: 0, widthDots: 0, squeezed: false, error: (e as Error).message };
  }
}

function useBars(code: string | null) {
  return useMemo(() => barsLayout(code), [code]);
}

const SANS = '"Geist","Helvetica Neue",Arial,sans-serif';
const MONO = '"Geist Mono","OCR B","Courier New",monospace';

let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Width of `text` in dots at `px` size, or an estimate where canvas is unavailable. */
function measure(text: string, weight: number, px: number): number {
  if (measureCtx === undefined) {
    try { measureCtx = document.createElement('canvas').getContext('2d'); } catch { measureCtx = null; }
  }
  if (!measureCtx) return text.length * px * 0.56;
  measureCtx.font = `${weight} ${px}px ${SANS}`;
  return measureCtx.measureText(text).width;
}

/** SVG text that never overflows `max` dots: first a smaller size (down to 70 %), then squeezed. Never cut. */
function FitText({ x, y, max, size, weight, anchor = 'start', children }: {
  x: number; y: number; max: number; size: number; weight: number; anchor?: 'start' | 'end'; children: string;
}) {
  const w = measure(children, weight, size);
  const px = w > max ? Math.max(size * 0.7, (size * max) / w) : size;
  const squeeze = measure(children, weight, px) > max;
  return (
    <text x={x} y={y} fontSize={px} fontWeight={weight} textAnchor={anchor}
      {...(squeeze ? { textLength: max, lengthAdjust: 'spacingAndGlyphs' } : {})}>
      {children}
    </text>
  );
}

const MF_MARK = 'M858.21,130.64c-53.14-66.98-130.64-83.97-212.83-81.02-25.27.91-46.84,2.92-65.66,5.82-22.46-5.24-46.36-6.78-70.85-5.9-144.29,5.17-131.46,57.34-223.49,99.9-100.65,46.56-92.46,129.42-125.95,175.35-49.06,67.27-68.46,143.78-62.64,226.59,1.02,14.48,3.33,28.3,6.95,41.41-7.49,40.09-9.63,81.66-6.62,124.51,5.51,78.44,39.27,142.57,105.31,186.44,23.67,15.72,46.2,41.64,66.06,62.8,111.62,118.98,233.6,49.34,285.88,40.01,94.53-16.87,175.2-53.51,244.66-121.56,33.1-32.43,55.07-73.46,79.26-114.18,17.31-29.13,40.36-55.02,53.07-87.61,66.75-171.18,96.6-429.31-73.14-552.56ZM247.28,694.57c-2.68-2.86-46.16-25.29-42.52-23.83,56.1,22.5,109.06-5.34,135.22-10.01,61.55-10.98,114.09-34.85,159.32-79.16,21.55-21.12,35.86-47.84,51.62-74.36,11.27-18.97,26.28-35.83,34.56-57.05,40.9-104.89,108.09-250.09,18.17-334.9,10.35,7.07,19.93,15.85,28.53,26.62.18.23.4.44.64.61,110.13,80.36,90.69,248.21,47.27,359.56-8.27,21.22-23.29,38.08-34.56,57.05-15.76,26.52-30.06,53.24-51.62,74.36-45.24,44.31-97.77,68.18-159.32,79.16-34.04,6.07-114.62,59.42-187.3-18.06ZM873.17,650.54c-11.01,28.23-30.98,50.66-45.98,75.9-20.96,35.28-39.99,70.83-68.67,98.93-60.18,58.96-130.08,90.71-211.97,105.32-45.29,8.08-150.98,68.42-247.68-34.67-.06-.06-.12-.13-.18-.19-3.56-3.8-40.36-36.05-35.52-34.11,74.64,29.93,145.1-7.11,179.9-13.32,81.9-14.61,151.79-46.36,211.97-105.32,28.68-28.09,47.71-63.64,68.67-98.93,14.99-25.24,34.97-47.67,45.98-75.9,54.41-139.56,121.41-319.5,1.78-432.33,13.78,9.41,30.33,19.61,41.77,33.94.24.31,1.86,1.51,2.17,1.74,146.52,106.92,115.52,330.78,57.75,478.94Z';

/** The physical label (template layout, printer-dot coordinates). */
function LabelPaper({ data, bars }: { data: LabelData; bars: NonNullable<ReturnType<typeof useBars>> }) {
  const scale = bars.widthDots / (bars.width * bars.dots);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: `${LABEL_MM.w}mm`, height: `${LABEL_MM.h}mm`, display: 'block', background: '#fff' }}
      fontFamily={SANS}
      fill="#000"
    >
      <rect width={W} height={H} fill="#fff" />
      <FitText x={LEFT} y={37} max={RIGHT - LEFT} size={24} weight={500}>{data.artist}</FitText>
      <FitText x={LEFT} y={58} max={RIGHT - LEFT} size={19} weight={400}>{data.title}</FitText>
      {/* Price on its own line under the album title, so long names never run into it. */}
      <FitText x={LEFT} y={86} max={RIGHT - LEFT} size={24} weight={500}>{data.price}</FitText>

      <FitText x={LEFT} y={110} max={86} size={18} weight={400}>{data.format}</FitText>
      {data.year && <text x={113} y={110} fontSize={18}>{data.year}</text>}
      {data.genre && <FitText x={RIGHT} y={110} max={RIGHT - 170} size={18} weight={400} anchor="end">{data.genre}</FitText>}

      <svg x={18} y={130} width={40} height={40} viewBox="0 0 1080 1080" aria-hidden="true"><path d={MF_MARK} /></svg>
      <g role="img" aria-label={`Barcode ${data.code}`} shapeRendering="crispEdges">
        {bars.bars.map(b => (
          <rect key={b.x} x={bars.x + b.x * bars.dots * scale} y={124} width={b.w * bars.dots * scale} height={54} />
        ))}
      </g>

      <g fontFamily={MONO} fontSize={17} fontWeight={500}>
        <text x={LEFT} y={202} textLength={RIGHT - 3 - LEFT} lengthAdjust="spacingAndGlyphs">{data.mrz[0]}</text>
        <text x={LEFT} y={219} textLength={RIGHT - 3 - LEFT} lengthAdjust="spacingAndGlyphs">{data.mrz[1]}</text>
      </g>
    </svg>
  );
}

/** Print `copies` labels, one 50 × 30 mm page each, through a hidden iframe. */
function printLabels(labelHtml: string, copies: number, title: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); return; }
  const pages = Array.from({ length: copies }, () => `<div class="pg">${labelHtml}</div>`).join('');
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
<style>@page{size:${LABEL_MM.w}mm ${LABEL_MM.h}mm;margin:0}html,body{margin:0;padding:0;background:#fff}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:${LABEL_MM.w}mm;height:${LABEL_MM.h}mm;overflow:hidden;break-after:page;page-break-after:always}
.pg:last-child{break-after:auto;page-break-after:auto}</style></head><body>${pages}</body></html>`);
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  const go = () => { win.focus(); win.print(); };
  // Wait for Geist so the printed text matches the preview; don't hang if the font is offline.
  Promise.race([doc.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(go);
  setTimeout(() => frame.isConnected && frame.remove(), 60_000);
}

export function BarcodeLabelModal({ release, onClose }: { release: LabelRelease; onClose: () => void }) {
  const data = useMemo(() => labelFromRelease(release), [release]);
  const bars = useBars(data.code);
  const [copies, setCopies] = useState(1);
  const paperRef = useRef<HTMLDivElement>(null);

  const problem = !data.code
    ? 'No barcode or DealPOS code on this release. Add one in the release editor, then print.'
    : bars?.error
      ? `This code can't be printed as Code 128 (${bars.error}).`
      : null;
  const tooDense = !problem && Boolean(bars?.squeezed);

  const synced = new Date(data.syncedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const source = !data.fromDealpos
    ? 'Not linked to DealPOS · code from the catalogue'
    : data.code
      ? `From DealPOS · variant code ${data.code} · synced ${synced}`
      : `From DealPOS · this variant has no code in DealPOS · synced ${synced}`;

  const onPrint = () => {
    const html = paperRef.current?.innerHTML;
    if (html && !problem) printLabels(html, copies, `Label — ${data.code}`);
  };

  const btn = 'px-[14px] py-[9px] rounded-[6px] text-[13px] font-medium';
  return (
    <ModalShell
      title="Item label"
      subtitle={`${LABEL_MM.w} × ${LABEL_MM.h} mm · Code 128`}
      onClose={onClose}
      widthClass="max-w-[380px]"
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            Copies
            <input
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={e => setCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-[56px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-2 py-[6px] text-[13px] text-[var(--text-primary)] font-mono"
            />
          </label>
          <button type="button" onClick={onClose} className={`${btn} border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]`}>Close</button>
          <button type="button" onClick={onPrint} disabled={Boolean(problem)} className={`${btn} bg-[var(--accent)] text-[var(--accent-text)] disabled:opacity-40 disabled:cursor-not-allowed`}>
            Print label
          </button>
        </>
      }
    >
      {problem ? (
        <p className="text-[13px] text-[var(--text-secondary)] py-6 text-center">{problem}</p>
      ) : (
        bars && (
          <div className="flex justify-center">
            {/* Preview at 1.6× the physical size; the border is screen-only. */}
            <div className="rounded-[6px] border border-[#e4e4e4] overflow-hidden" style={{ width: `calc(${LABEL_MM.w}mm * 1.6)`, height: `calc(${LABEL_MM.h}mm * 1.6)` }}>
              <div ref={paperRef} style={{ transform: 'scale(1.6)', transformOrigin: 'top left', width: `${LABEL_MM.w}mm` }}>
                <LabelPaper data={data} bars={bars} />
              </div>
            </div>
          </div>
        )
      )}
      <p className="mt-3 text-[11px] text-[var(--text-muted)] text-center">{source}</p>
      {tooDense && (
        <p className="mt-1.5 text-[11px] text-[var(--warning)] text-center">Long code: the barcode had to be narrowed below one printer dot per bar and may not scan. Use a shorter DealPOS code.</p>
      )}
    </ModalShell>
  );
}
