import { useEffect, type ReactElement, type ReactNode } from 'react';
import { fmtIdr } from '../../api/ops';

/* A printed artifact, so the paper is intentionally black-on-white in both
   themes — like the barcode label. Neutrals are warmed a touch so it reads as
   paper, not screen. Figures stay in Geist Mono (font-mono) to line up. */

export interface ReceiptLine {
  name: string;
  /** e.g. "LP · NF-13 · ×1" — set in mono under the item name. */
  meta?: string;
  amount: number;
}

export interface ReceiptSummaryRow {
  label: string;
  value: number;
  kind?: 'default' | 'discount';
}

export interface ReceiptField {
  label: string;
  value: string;
  /** Render the value in mono (codes, IDs, card numbers). */
  mono?: boolean;
}

export interface ReceiptData {
  address: string[];
  number: string;
  datetime: string;
  customer?: string;
  lines: ReceiptLine[];
  summary: ReceiptSummaryRow[];
  total: number;
  /** Small line under the total, e.g. "Incl. PPN 11% · Rp 179.300". */
  totalNote?: string;
  payment: ReceiptField[];
  footer: [string, string];
}

/* ── Barcode ─────────────────────────────────────────────────────────
   Deterministic Code128-ish bars seeded from the receipt number — a visual
   stand-in for a real symbology, stable across re-renders. */
function Barcode({ value }: { value: string }) {
  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const mods: number[] = [];
  for (let i = 0; i < 58; i++) mods.push(Math.floor(rand() * 3) + 1);
  if (mods.length % 2 === 0) mods.push(1); // end on a bar

  const total = mods.reduce((a, b) => a + b, 0);
  const rects: ReactElement[] = [];
  let x = 0;
  mods.forEach((w, i) => {
    if (i % 2 === 0) rects.push(<rect key={i} x={x} width={w} height={100} fill="#17120f" />);
    x += w;
  });

  return (
    <svg viewBox={`0 0 ${total} 100`} preserveAspectRatio="none" className="w-full h-full" role="img" aria-label={`Barcode ${value}`}>
      {rects}
    </svg>
  );
}

function Rule() {
  return <div className="my-4 border-t border-dashed border-[#d8d2ca]" />;
}

/* ── The paper ───────────────────────────────────────────────────────── */
export function ReceiptPaper({ data }: { data: ReceiptData }) {
  return (
    <div className="mf-receipt-paper bg-white text-[#17120f] px-8 pt-7 pb-8 selection:bg-[#17120f] selection:text-white">
      {/* wordmark + outlet */}
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={`${import.meta.env.BASE_URL}MF_Lockup_Black.svg`} alt="Medium Format" className="h-[22px] w-auto" />
        <div className="text-[12.5px] leading-[1.45] text-[#8a8178]">
          {data.address.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>

      <Rule />

      {/* meta — receipt no. / date */}
      <div className="flex items-start justify-between gap-4">
        <MetaCol label="Receipt" value={data.number} />
        <MetaCol label="Date" value={data.datetime} align="right" />
      </div>
      {data.customer && (
        <div className="mt-3 flex items-start justify-between gap-4">
          <MetaCol label="Customer" value={data.customer} mono={false} />
        </div>
      )}

      <Rule />

      {/* items */}
      <div className="space-y-3.5">
        {data.lines.map((line, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[14.5px] font-medium leading-snug text-[#17120f]">{line.name}</div>
              {line.meta && <div className="mt-0.5 font-mono text-[11.5px] text-[#9a9188]">{line.meta}</div>}
            </div>
            <div className="font-mono text-[14px] whitespace-nowrap pt-0.5">{fmtIdr(line.amount)}</div>
          </div>
        ))}
      </div>

      <Rule />

      {/* totals */}
      <div className="space-y-1.5">
        {data.summary.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="text-[#6f665d]">{row.label}</span>
            <span className={`font-mono ${row.kind === 'discount' ? 'text-[#9a9188]' : 'text-[#17120f]'}`}>
              {row.kind === 'discount' ? `− ${fmtIdr(row.value)}` : fmtIdr(row.value)}
            </span>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 pt-1.5">
          <span className="text-[16px] font-semibold">Total</span>
          <span className="font-mono text-[19px] font-semibold tracking-[-0.01em]">{fmtIdr(data.total)}</span>
        </div>
        {data.totalNote && <div className="text-right font-mono text-[11px] text-[#9a9188]">{data.totalNote}</div>}
      </div>

      <Rule />

      {/* payment */}
      <div className="space-y-1.5">
        {data.payment.map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="text-[#8a8178]">{f.label}</span>
            <span className={`text-right text-[#17120f] ${f.mono ? 'font-mono' : ''}`}>{f.value}</span>
          </div>
        ))}
      </div>

      <Rule />

      {/* sign-off + barcode */}
      <div className="text-center">
        <p className="text-[14px] font-medium text-[#17120f]">{data.footer[0]}</p>
        <p className="mt-1 text-[12px] text-[#9a9188]">{data.footer[1]}</p>
      </div>
      <div className="mt-5 h-14 w-[74%] mx-auto">
        <Barcode value={data.number} />
      </div>
    </div>
  );
}

function MetaCol({ label, value, align = 'left', mono = true }: {
  label: string; value: string; align?: 'left' | 'right'; mono?: boolean;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[12px] text-[#9a9188]">{label}</div>
      <div className={`mt-0.5 text-[13.5px] text-[#17120f] ${mono ? 'font-mono' : 'font-medium'}`}>{value}</div>
    </div>
  );
}

/* ── Modal shell ─────────────────────────────────────────────────────── */
export function ReceiptModal({ data, primary, onClose, dismissible = false }: {
  data: ReceiptData;
  primary: { label: string; onClick: () => void; icon?: ReactNode };
  onClose?: () => void;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!dismissible || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissible, onClose]);

  const print = () => {
    const cls = 'mf-receipt-printing';
    document.body.classList.add(cls);
    const done = () => {
      document.body.classList.remove(cls);
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={dismissible && onClose ? e => { if (e.target === e.currentTarget) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Receipt"
    >
      <div className="w-full max-w-[384px] max-h-[92vh] flex flex-col bg-white rounded-[18px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,.5)]">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ReceiptPaper data={data} />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2.5 p-4 bg-white border-t border-[#eee7dd] mf-receipt-actions">
          <button
            onClick={print}
            className="flex-1 h-12 rounded-[10px] border border-[#dcd4c8] text-[#17120f] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#f6f2ea] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Print receipt
          </button>
          <button
            onClick={primary.onClick}
            className="flex-1 h-12 rounded-[10px] bg-[#17120f] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
          >
            {primary.icon}
            {primary.label}
          </button>
        </div>
      </div>
    </div>
  );
}
