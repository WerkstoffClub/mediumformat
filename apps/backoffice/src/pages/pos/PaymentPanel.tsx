import { useState } from 'react';
import { fmtIdr } from '../../api/ops';

export const EDC_BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB', 'Permata'] as const;
export type EdcBank = (typeof EDC_BANKS)[number];

export type XenditMethod = 'qris' | 'va' | 'ewallet' | 'card';

const EWALLETS = ['GoPay', 'OVO', 'DANA', 'ShopeePay'] as const;

/** DealPOS-synced method surfaced in the "imported" group. */
export interface ImportedMethod {
  id: number;
  name: string;
}

/** The concrete payment selection the register will charge. */
export type PaymentSelection =
  | { family: 'edc'; bank: EdcBank }
  | { family: 'xendit'; method: XenditMethod; ewallet?: string }
  | { family: 'cash' }
  | { family: 'imported'; methodId: number; methodName: string };

interface PaymentPanelProps {
  total: number;
  disabled: boolean;
  selection: PaymentSelection | null;
  onSelect: (s: PaymentSelection | null) => void;
  imported: ImportedMethod[];
  /** Cash tender, controlled by the parent so change-due can drive the Charge button. */
  cashTender: string;
  onCashTender: (v: string) => void;
  onCharge: () => void;
}

type Family = 'edc' | 'xendit' | 'cash' | 'imported';

export function PaymentPanel({
  total, disabled, selection, onSelect, imported,
  cashTender, onCashTender, onCharge,
}: PaymentPanelProps) {
  const [open, setOpen] = useState<Family>('edc');
  const [xMethod, setXMethod] = useState<XenditMethod>('qris');
  const [ewallet, setEwallet] = useState<string>(EWALLETS[0]);

  const tendered = Number(cashTender || 0);
  const change = tendered - total;
  const cashShort = selection?.family === 'cash' && tendered < total;
  const canCharge = !disabled && selection !== null && !cashShort;

  const toggle = (f: Family) => setOpen(o => (o === f ? o : f));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Payment</h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Card terminal (EDC), Xendit online gateway, cash, or an imported method.</p>
        </div>

        {/* FAMILY A — EDC */}
        <Family
          id="edc" open={open === 'edc'} onToggle={() => toggle('edc')}
          icon={<TerminalIcon />} name="Card terminal" tag="EDC · Acquirer"
          desc="Physical bank terminals — insert, tap, or swipe."
          active={selection?.family === 'edc'}
        >
          <div className="grid grid-cols-3 gap-2">
            {EDC_BANKS.map(bank => {
              const on = selection?.family === 'edc' && selection.bank === bank;
              return (
                <button
                  key={bank}
                  onClick={() => onSelect({ family: 'edc', bank })}
                  className={`flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-md border bg-[var(--bg-base)] transition-colors active:scale-[0.98] ${
                    on ? 'border-[var(--accent)] bg-[var(--bg-overlay)]' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className={`w-6 h-6 ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="5" y="2" width="14" height="20" rx="2" /><rect x="8" y="5" width="8" height="3" rx="1" /><path d="M8 12h8M8 15h8M8 18h4" /></svg>
                  <span className={`text-[12px] font-medium ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{bank}</span>
                </button>
              );
            })}
          </div>
          <SecuredNote>Card data is captured on the physical terminal — never touches this device.</SecuredNote>
        </Family>

        {/* FAMILY B — Xendit */}
        <Family
          id="xendit" open={open === 'xendit'} onToggle={() => toggle('xendit')}
          icon={<XenditIcon />} name="Xendit" tag="Online gateway"
          desc="QRIS, virtual account, e-wallet, or hosted card."
          active={selection?.family === 'xendit'}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {([['qris', 'QRIS'], ['va', 'Virtual Account'], ['ewallet', 'E-wallet'], ['card', 'Card']] as Array<[XenditMethod, string]>).map(([m, label]) => {
              const on = xMethod === m;
              return (
                <button
                  key={m}
                  onClick={() => { setXMethod(m); onSelect({ family: 'xendit', method: m, ewallet: m === 'ewallet' ? ewallet : undefined }); }}
                  className={`h-9 px-3.5 rounded-full border text-[12.5px] font-medium transition-colors ${
                    on && selection?.family === 'xendit' ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {xMethod === 'ewallet' && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {EWALLETS.map(w => {
                  const on = ewallet === w;
                  return (
                    <button
                      key={w}
                      onClick={() => { setEwallet(w); onSelect({ family: 'xendit', method: 'ewallet', ewallet: w }); }}
                      className={`flex flex-col items-center justify-center gap-1.5 min-h-[58px] rounded-md border bg-[var(--bg-base)] transition-colors ${
                        on ? 'border-[var(--accent)] bg-[var(--bg-overlay)]' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="3" /><circle cx="17" cy="12" r="1.6" /></svg>
                      <span className={`text-[11px] ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{w}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p className="mt-3 text-[12px] text-[var(--text-secondary)] leading-relaxed">
            Charge creates a Xendit payment for {fmtIdr(total)}. The customer scans the code on this screen and pays
            {xMethod === 'qris' ? ' with any QRIS app' : xMethod === 'va' ? ' by bank virtual account' : xMethod === 'ewallet' ? ` with ${ewallet}` : ' by card'} on
            Xendit&apos;s page; the sale completes by itself when Xendit confirms.
          </p>
          <SecuredNote>Secured by Xendit · PCI-DSS · 3-D Secure.</SecuredNote>
        </Family>

        {/* FAMILY C — Cash */}
        <Family
          id="cash" open={open === 'cash'} onToggle={() => toggle('cash')}
          icon={<CashIcon />} name="Cash" tag="Drawer"
          desc="Tender cash and compute change due."
          active={selection?.family === 'cash'}
        >
          <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-3 py-2.5">
            <span className="text-[13px] text-[var(--text-muted)] font-mono">Rp</span>
            <input
              className="bg-transparent text-[15px] font-mono outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
              placeholder="0"
              inputMode="numeric"
              value={cashTender}
              onChange={e => { onCashTender(e.target.value.replace(/[^0-9]/g, '')); onSelect({ family: 'cash' }); }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {[50_000, 100_000, 150_000, 200_000, 500_000].map(v => (
              <button
                key={v}
                onClick={() => { onCashTender(String(v)); onSelect({ family: 'cash' }); }}
                className="h-9 px-3.5 rounded-md border border-[var(--border)] bg-[var(--bg-base)] text-[12.5px] font-mono text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {fmtIdr(v)}
              </button>
            ))}
            <button
              onClick={() => { onCashTender(String(total)); onSelect({ family: 'cash' }); }}
              className="h-9 px-3.5 rounded-md border border-[var(--border)] bg-[var(--bg-base)] text-[12.5px] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Exact
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 px-3.5 py-3 border border-[var(--border)] rounded-md bg-[var(--bg-base)]">
            <span className="text-[13px] text-[var(--text-secondary)]">Change due</span>
            <span className={`font-mono text-[18px] font-medium ${change < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
              {change >= 0 ? fmtIdr(change) : `− ${fmtIdr(-change)}`}
            </span>
          </div>
        </Family>

        {/* FAMILY D — Imported from DealPOS */}
        {imported.length > 0 && (
          <Family
            id="imported" open={open === 'imported'} onToggle={() => toggle('imported')}
            icon={<ImportIcon />} name="Other" tag="Imported from DealPOS"
            desc="Legacy methods synced from DealPOS — record the sale against one."
            active={selection?.family === 'imported'}
          >
            <div className="flex flex-col gap-1.5">
              {imported.map(m => {
                const on = selection?.family === 'imported' && selection.methodId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelect({ family: 'imported', methodId: m.id, methodName: m.name })}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-md border bg-[var(--bg-base)] transition-colors text-left ${
                      on ? 'border-[var(--accent)] bg-[var(--bg-overlay)]' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <span className={`text-[12.5px] ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{m.name}</span>
                    {on && <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </button>
                );
              })}
            </div>
          </Family>
        )}
      </div>

      {/* Sticky charge bar */}
      <div className="flex-shrink-0 border-t border-[var(--border-sub)] bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-4">
        <div className="flex-shrink-0">
          <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">Amount due</p>
          <p className="font-mono text-[20px] font-medium text-[var(--text-primary)] leading-tight">{fmtIdr(total)}</p>
        </div>
        <button
          onClick={onCharge}
          disabled={!canCharge}
          className="flex-1 h-[52px] rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[15px] font-semibold tracking-[-0.01em] flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:bg-[var(--bg-overlay)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
          {cashShort ? 'Insufficient cash' : selection ? 'Charge' : 'Select a method'}
        </button>
      </div>
    </div>
  );
}

/* ── Family accordion shell ────────────────────────────────── */
function Family({
  open, onToggle, icon, name, tag, desc, active, children,
}: {
  id: Family; open: boolean; onToggle: () => void;
  icon: React.ReactNode; name: string; tag: string; desc: string;
  active: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden bg-[var(--bg-base)] ${active ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors">
        <span className="w-10 h-10 flex-shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)]">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">{name}</span>
            <span className="text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{tag}</span>
          </span>
          <span className="block text-[11.5px] text-[var(--text-muted)] mt-0.5 truncate">{desc}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--border-sub)]">{children}</div>}
    </div>
  );
}

function SecuredNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 mt-3 text-[11px] text-[var(--text-muted)]">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      {children}
    </p>
  );
}

/* ── Icons ─────────────────────────────────────────────────── */
function TerminalIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="2" width="14" height="20" rx="2" /><rect x="8" y="5" width="8" height="4" rx="1" /><circle cx="8.5" cy="13" r="1" /><circle cx="12" cy="13" r="1" /><circle cx="15.5" cy="13" r="1" /><circle cx="8.5" cy="17" r="1" /><circle cx="12" cy="17" r="1" /><circle cx="15.5" cy="17" r="1" /></svg>;
}
function XenditIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M2 12a10 10 0 0 1 20 0" /><path d="M2 12a10 10 0 0 0 20 0" /><path d="M12 2v20M7 5.5l10 13M17 5.5l-10 13" /></svg>;
}
function CashIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>;
}
function ImportIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
