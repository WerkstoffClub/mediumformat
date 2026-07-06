import { fmtIdr } from '../../api/ops';
import type { CartLine } from '../../api/pos';
import { ProductCover } from './Cover';

export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

interface CartProps {
  lines: CartLine[];
  totals: CartTotals;
  discountInput: string;
  onDiscountInput: (v: string) => void;
  onQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function Cart({
  lines, totals, discountInput, onDiscountInput, onQty, onRemove, onClear,
}: CartProps) {
  const empty = lines.length === 0;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header (mf-panel-hdr: accent bar) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] flex-shrink-0">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">New sale</h2>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] opacity-80">{count} {count === 1 ? 'item' : 'items'}</span>
          {!empty && (
            <button
              onClick={onClear}
              className="text-[11px] inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" /></svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customer line */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[var(--border-sub)] text-[12px] text-[var(--text-secondary)] flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
        Walk-in customer <span className="text-[var(--border)]">·</span> Cashier
      </div>

      {/* Lines */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center gap-2.5 text-center px-6 py-10">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-[var(--text-faint)]" fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            <p className="text-[13px] text-[var(--text-muted)]">Cart is empty</p>
            <p className="text-[11px] text-[var(--text-faint)]">Tap a product to add it to the sale.</p>
          </div>
        ) : (
          lines.map(line => (
            <div key={line.product.id} className="flex gap-2.5 px-3.5 py-2.5 border-b border-[var(--border-sub)] group">
              <span className="w-11 h-11 rounded-md flex-shrink-0 overflow-hidden border border-[var(--border-sub)]">
                <ProductCover product={line.product} size="sm" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">{line.product.artist}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{line.product.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="inline-flex items-center border border-[var(--border)] rounded-md overflow-hidden">
                    <button
                      onClick={() => onQty(line.product.id, -1)}
                      aria-label="Decrease quantity"
                      className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-95"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className="w-7 text-center font-mono text-[12px] text-[var(--text-primary)]">{line.qty}</span>
                    <button
                      onClick={() => onQty(line.product.id, 1)}
                      aria-label="Increase quantity"
                      disabled={line.qty >= line.product.stock}
                      className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(line.product.id)}
                    className="text-[10.5px] text-[var(--text-faint)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-[12.5px] text-[var(--text-primary)]">{fmtIdr(line.product.priceIdr * line.qty)}</p>
                {line.qty > 1 && <p className="font-mono text-[10px] text-[var(--text-faint)] mt-0.5">{fmtIdr(line.product.priceIdr)} ea</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Discount + totals */}
      <div className="flex-shrink-0 border-t border-[var(--border-sub)]">
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-2.5 py-1.5 flex-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.5" /></svg>
            <input
              className="bg-transparent text-[11.5px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
              placeholder="Discount amount (Rp)"
              inputMode="numeric"
              value={discountInput}
              onChange={e => onDiscountInput(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={empty}
            />
          </div>
        </div>

        <div className="px-3.5 pb-3.5 space-y-1">
          <TotalRow label="Subtotal" value={fmtIdr(totals.subtotal)} />
          {totals.discount > 0 && <TotalRow label="Discount" value={`− ${fmtIdr(totals.discount)}`} muted />}
          <TotalRow label="PPN 11%" value={fmtIdr(totals.tax)} muted />
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--border-sub)]">
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">Total</span>
            <span className="font-mono text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">{fmtIdr(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[12px] ${muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
      <span className={`font-mono text-[12px] ${muted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{value}</span>
    </div>
  );
}
