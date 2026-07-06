import { useEffect, useRef, useState } from 'react';
import { fmtIdr } from '../../api/ops';
import type { EdcBank } from './PaymentPanel';

type EdcStage = 'insert' | 'reading' | 'processing' | 'approved';

const STAGE_ORDER: EdcStage[] = ['insert', 'reading', 'processing', 'approved'];
const STAGE_MS: Record<Exclude<EdcStage, 'approved'>, number> = {
  insert: 1900, reading: 1500, processing: 1700,
};

export interface EdcResult {
  approvalCode: string;
  rrn: string;
  scheme: string;
  entry: string;
  pan: string;
}

/** EDC terminal stepper overlay: insert → reading → processing → approved. */
export function EdcOverlay({
  bank, amount, onApproved, onCancel,
}: {
  bank: EdcBank; amount: number;
  onApproved: (result: EdcResult) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<EdcStage>('insert');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stage === 'approved') return;
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
    timer.current = setTimeout(() => setStage(next), STAGE_MS[stage as Exclude<EdcStage, 'approved'>]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'approved') return;
    onApproved({
      approvalCode: String(Math.floor(Math.random() * 900000) + 100000),
      rrn: String(Math.floor(Math.random() * 9e11) + 1e11),
      scheme: ['Visa', 'Mastercard', 'GPN'][Math.floor(Math.random() * 3)],
      entry: ['Chip', 'Contactless', 'Swipe'][Math.floor(Math.random() * 3)],
      pan: '**** **** **** ' + (1000 + Math.floor(Math.random() * 9000)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const stepIndex = STAGE_ORDER.indexOf(stage);

  return (
    <Overlay onBackdrop={stage === 'insert' ? onCancel : undefined}>
      <Sheet
        title={`${bank} terminal`} tag="EDC · Acquirer"
        onClose={stage === 'insert' ? onCancel : undefined}
      >
        {/* Progress steps */}
        <div className="flex items-center gap-1.5 mb-6">
          {[0, 1, 2].map(i => (
            <span key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--border)]">
              <span
                className={`block h-full ${i < stepIndex ? 'bg-[var(--accent)] w-full' : i === stepIndex && stage !== 'approved' ? 'bg-[var(--accent)] w-2/5 animate-pulse' : ''}`}
              />
            </span>
          ))}
        </div>

        <div className="text-center">
          {stage === 'insert' && (
            <>
              <div className="w-28 h-28 mx-auto mb-5 flex items-center justify-center text-[var(--text-primary)]">
                <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2.4}><rect x="34" y="14" width="52" height="80" rx="7" /><rect x="44" y="24" width="32" height="16" rx="3" /><circle cx="47" cy="52" r="3" /><circle cx="60" cy="52" r="3" /><circle cx="73" cy="52" r="3" /><circle cx="47" cy="65" r="3" /><circle cx="60" cy="65" r="3" /><circle cx="73" cy="65" r="3" /><rect x="44" y="76" width="32" height="10" rx="2" /></svg>
              </div>
              <p className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Insert, tap, or swipe card</p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">Present the card on the {bank} terminal.</p>
            </>
          )}
          {(stage === 'reading' || stage === 'processing') && (
            <>
              <span className="block w-11 h-11 mx-auto mb-3 rounded-full border-[3px] border-[var(--border)] border-t-[var(--accent)] animate-spin" />
              <p className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {stage === 'reading' ? 'Reading card…' : `Processing on ${bank} EDC…`}
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                {stage === 'reading' ? 'Do not remove the card.' : 'Authorising with the acquirer.'}
              </p>
            </>
          )}
          <p className="font-mono text-[28px] font-medium text-[var(--text-primary)] mt-4">{fmtIdr(amount)}</p>
          <p className="font-mono text-[12px] text-[var(--text-muted)] mt-1">{bank} · Acquirer · REG-01</p>
          {stage === 'insert' && (
            <button onClick={onCancel} className="block mx-auto mt-5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2">
              Cancel
            </button>
          )}
        </div>
      </Sheet>
    </Overlay>
  );
}

export interface SaleSummary {
  orderNumber: string;
  method: string;
  amount: number;
  change?: number;
  edc?: EdcResult;
}

/** Payment-approved success modal with a "New sale" reset. */
export function SuccessModal({ sale, onNewSale }: { sale: SaleSummary; onNewSale: () => void }) {
  return (
    <Overlay>
      <Sheet title="Payment approved" tag="Sale complete">
        <div className="text-center">
          <span className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center border-[1.5px] border-[var(--success)] bg-[var(--success-t)]">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--success)]">Payment approved</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">{sale.method}</p>
        </div>

        <div className="mt-5 border border-[var(--border)] rounded-md overflow-hidden">
          <Row k="Amount" v={fmtIdr(sale.amount)} strong />
          {sale.change != null && sale.change > 0 && <Row k="Change due" v={fmtIdr(sale.change)} />}
          <Row k="Order #" v={sale.orderNumber} mono />
          {sale.edc && (
            <>
              <Row k="Approval code" v={sale.edc.approvalCode} mono />
              <Row k="RRN / Ref" v={sale.edc.rrn} mono />
              <Row k="Card" v={sale.edc.pan} mono />
            </>
          )}
        </div>

        <button
          onClick={onNewSale}
          className="w-full h-12 mt-5 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[14px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New sale
        </button>
      </Sheet>
    </Overlay>
  );
}

/* ── Shared overlay chrome ─────────────────────────────────── */
function Overlay({ children, onBackdrop }: { children: React.ReactNode; onBackdrop?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={onBackdrop ? e => { if (e.target === e.currentTarget) onBackdrop(); } : undefined}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

function Sheet({
  title, tag, onClose, children,
}: {
  title: string; tag: string; onClose?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="w-[440px] max-w-full max-h-[92vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.5)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-sub)]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h3>
          <span className="text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{tag}</span>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function Row({ k, v, strong, mono }: { k: string; v: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-[var(--border-sub)] last:border-b-0">
      <span className="text-[11px] uppercase tracking-[0.03em] text-[var(--text-muted)]">{k}</span>
      <span className={`text-right ${mono ? 'font-mono' : ''} ${strong ? 'text-[15px] font-medium' : 'text-[13px]'} text-[var(--text-primary)]`}>{v}</span>
    </div>
  );
}
