import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtIdr, getChannels } from '../../api/ops';
import { validateVoucher } from '../../api/vouchers';
import { PaymentPanel, type EdcBank, type ImportedMethod, type PaymentSelection } from './PaymentPanel';
import { EdcOverlay, SuccessModal, type EdcResult, type SaleSummary } from './Overlays';
import { ProductCover } from './Cover';
import { usePosStore, type DiscountKind } from './PosContext';

function newOrderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `MF-${stamp}-${seq}`;
}

/**
 * POS Checkout — collects payment for the in-flight cart.
 *
 * Structure follows `mockup-pos-checkout.html`:
 * - Left: order summary + customer + discount/voucher editor
 * - Right: payment method families (Cash · EDC · Xendit · Imported)
 * - Sticky footer: Charge → success overlay
 *
 * On mobile the columns stack vertically; the payment panel's sticky charge
 * bar becomes the mobile bottom action bar.
 */
export function PosCheckout() {
  const navigate = useNavigate();
  const {
    cart, itemCount,
    subtotalIdr, discountIdr, taxIdr, totalIdr,
    discount, setDiscount,
    voucherCode, setVoucherCode,
    customer, setCustomer,
    clearCart,
  } = usePosStore();

  const [selection, setSelection] = useState<PaymentSelection | null>(null);
  const [cashTender, setCashTender] = useState('');
  const [imported, setImported] = useState<ImportedMethod[]>([]);
  const [edcOverlay, setEdcOverlay] = useState<{ bank: EdcBank } | null>(null);
  const [sale, setSale] = useState<SaleSummary | null>(null);
  const [voidConfirm, setVoidConfirm] = useState(false);

  // Load DealPOS-synced payment methods for the "Other" family.
  useEffect(() => {
    getChannels()
      .then(c => setImported(c.paymentMethods.filter(m => !m.suspended).map(m => ({ id: m.id, name: m.name }))))
      .catch(() => setImported([]));
  }, []);

  // If the cart is empty and we're not currently showing the receipt, hop back
  // to the browse page — nothing to charge.
  useEffect(() => {
    if (cart.length === 0 && !sale) navigate('/pos', { replace: true });
  }, [cart.length, sale, navigate]);

  const completeSale = (method: string, extra?: { change?: number; edc?: EdcResult }) => {
    // TODO: POST /pos/sales with the cart + payment method + tender amount
    // when the backend endpoint lands. For now we just render the receipt.
    const stamp = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).replace(',', '');
    setSale({
      orderNumber: newOrderNumber(),
      datetime: stamp,
      method,
      lines: cart.map(l => ({
        name: `${l.product.artist} — ${l.product.title}`,
        meta: [l.product.formatLabel, l.product.condition, `×${l.qty}`].filter(Boolean).join(' · '),
        amount: l.product.priceIdr * l.qty,
      })),
      subtotal: subtotalIdr,
      discount: discountIdr,
      tax: taxIdr,
      amount: totalIdr,
      change: extra?.change,
      edc: extra?.edc,
    });
  };

  const handleCharge = () => {
    if (!selection) return;
    switch (selection.family) {
      case 'edc':
        setEdcOverlay({ bank: selection.bank });
        break;
      case 'xendit': {
        const label =
          selection.method === 'qris' ? 'QRIS'
            : selection.method === 'va' ? 'Virtual Account'
              : selection.method === 'ewallet' ? `E-wallet · ${selection.ewallet}`
                : 'Card';
        completeSale(`Xendit · ${label}`);
        break;
      }
      case 'cash': {
        const change = Number(cashTender || 0) - totalIdr;
        completeSale('Cash', { change: change > 0 ? change : 0 });
        break;
      }
      case 'imported':
        completeSale(`${selection.methodName} · imported from DealPOS`);
        break;
    }
  };

  const resetSale = () => {
    // "New sale" from the receipt: clear everything, unwind local checkout
    // state, and head back to the register.
    clearCart();
    setSelection(null);
    setCashTender('');
    setSale(null);
    setEdcOverlay(null);
    navigate('/pos');
  };

  const handleVoid = () => {
    if (!voidConfirm) {
      setVoidConfirm(true);
      window.setTimeout(() => setVoidConfirm(false), 3000);
      return;
    }
    clearCart();
    navigate('/pos');
  };

  return (
    <div className="h-[calc(100vh-108px)] max-md:h-auto flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0 max-md:flex-wrap">
        <Link
          to="/pos"
          aria-label="Back to sale"
          className="w-9 h-9 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--text-muted)] leading-tight">
            <Link to="/pos" className="hover:text-[var(--text-primary)]">Point of sale</Link>
            <span className="mx-1 text-[var(--border)]">/</span>
            Charge
          </p>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-tight">Charge</h1>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] font-mono px-3 h-9 rounded-full border border-[var(--border)] bg-[var(--bg-surface)]">
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span className="text-[var(--border)]">·</span>
          <span className="text-[var(--text-primary)]">{fmtIdr(totalIdr)}</span>
        </div>
        <button
          onClick={handleVoid}
          className={`text-[12.5px] px-3 h-9 rounded-md border transition-colors ${
            voidConfirm
              ? 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]'
          }`}
        >
          {voidConfirm ? 'Confirm void' : 'Void'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 grid grid-cols-[minmax(360px,38%)_1fr] gap-3 max-lg:grid-cols-[minmax(320px,42%)_1fr] max-md:grid-cols-1 max-md:h-auto">
        {/* Left — order summary + customer + discount editor */}
        <div className="min-h-0 flex flex-col gap-3 max-md:min-h-0 max-md:h-auto overflow-y-auto max-md:overflow-visible pr-1 max-md:pr-0">
          <OrderSummaryPanel />
          <CustomerPanel customer={customer} onChange={setCustomer} />
          <DiscountVoucherPanel
            discount={discount}
            onDiscount={setDiscount}
            voucherCode={voucherCode}
            onVoucherCode={setVoucherCode}
            subtotalIdr={subtotalIdr}
            discountIdr={discountIdr}
          />
        </div>

        {/* Right — payment */}
        <div className="min-h-0 flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden max-md:h-auto max-md:min-h-0">
          <PaymentPanel
            total={totalIdr}
            disabled={cart.length === 0}
            selection={selection}
            onSelect={setSelection}
            imported={imported}
            cashTender={cashTender}
            onCashTender={setCashTender}
            onCharge={handleCharge}
          />
        </div>
      </div>

      {edcOverlay && (
        <EdcOverlay
          bank={edcOverlay.bank}
          amount={totalIdr}
          onCancel={() => setEdcOverlay(null)}
          onApproved={(result: EdcResult) => {
            setEdcOverlay(null);
            completeSale(
              `EDC · ${edcOverlay.bank} · ${result.scheme} ${result.entry.toLowerCase()}`,
              { edc: result },
            );
          }}
        />
      )}

      {sale && <SuccessModal sale={sale} onNewSale={resetSale} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Order summary — read-only list of cart lines with subtotals.
 * ────────────────────────────────────────────────────────── */
function OrderSummaryPanel() {
  const { cart, subtotalIdr, discountIdr, taxIdr, totalIdr } = usePosStore();

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <header className="px-3.5 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Order summary</h2>
        <span className="text-[11px] opacity-80 font-mono">
          {cart.reduce((n, l) => n + l.qty, 0)} {cart.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      <ul className="divide-y divide-[var(--border-sub)] max-h-[38vh] overflow-y-auto">
        {cart.map(line => (
          <li key={line.product.id} className="flex gap-2.5 px-3.5 py-2.5">
            <span className="w-11 h-11 rounded-md flex-shrink-0 overflow-hidden border border-[var(--border-sub)]">
              <ProductCover product={line.product} size="sm" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">{line.product.artist}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{line.product.title}</p>
              <p className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                {line.product.formatLabel}
                {line.product.condition ? ` · ${line.product.condition}` : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-[11px] text-[var(--text-muted)]">× {line.qty}</p>
              <p className="font-mono text-[12.5px] text-[var(--text-primary)] mt-0.5">
                {fmtIdr(line.product.priceIdr * line.qty)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <dl className="px-3.5 py-3 border-t border-[var(--border-sub)] space-y-1">
        <Row label="Subtotal" value={fmtIdr(subtotalIdr)} />
        {discountIdr > 0 && <Row label="Discount" value={`− ${fmtIdr(discountIdr)}`} muted />}
        <Row label="PPN 11%" value={fmtIdr(taxIdr)} muted />
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--border-sub)]">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">Total</span>
          <span className="font-mono text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">{fmtIdr(totalIdr)}</span>
        </div>
      </dl>
    </section>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-[12px] ${muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{label}</dt>
      <dd className={`font-mono text-[12px] ${muted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{value}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Customer picker — walk-in by default, quick "new customer" fields.
 *
 * NB: full customer autocomplete over the /customers-list API is deferred;
 * for now the register just captures a name + phone on the sale so the
 * receipt and reporting can attribute it.
 * ────────────────────────────────────────────────────────── */
function CustomerPanel({
  customer,
  onChange,
}: {
  customer: ReturnType<typeof usePosStore>['customer'];
  onChange: (c: ReturnType<typeof usePosStore>['customer']) => void;
}) {
  const [editing, setEditing] = useState<boolean>(!!customer);
  const [draftName, setDraftName] = useState(customer?.name ?? '');
  const [draftPhone, setDraftPhone] = useState(customer?.phone ?? '');
  const [draftEmail, setDraftEmail] = useState(customer?.email ?? '');

  const commit = () => {
    if (!draftName.trim() && !draftPhone.trim() && !draftEmail.trim()) {
      onChange(null);
      setEditing(false);
      return;
    }
    onChange({
      name: draftName.trim() || undefined,
      phone: draftPhone.trim() || undefined,
      email: draftEmail.trim() || undefined,
    });
    setEditing(false);
  };

  const clear = () => {
    setDraftName('');
    setDraftPhone('');
    setDraftEmail('');
    onChange(null);
    setEditing(false);
  };

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <header className="px-3.5 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Customer</h2>
        {!editing && customer && (
          <button
            onClick={clear}
            className="text-[11px] opacity-80 hover:opacity-100 underline underline-offset-2"
          >
            Remove
          </button>
        )}
      </header>

      <div className="p-3.5">
        {!editing && !customer && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              Walk-in customer
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-[12px] px-3 h-8 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add customer
            </button>
          </div>
        )}

        {!editing && customer && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {customer.name || 'Unnamed customer'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact info'}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-[12px] px-3 h-8 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]"
            >
              Edit
            </button>
          </div>
        )}

        {editing && (
          <div className="space-y-2.5">
            <Field label="Name" value={draftName} onChange={setDraftName} placeholder="e.g. Rizky Aditya" />
            <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
              <Field label="Phone" value={draftPhone} onChange={setDraftPhone} placeholder="0812…" inputMode="tel" />
              <Field label="Email" value={draftEmail} onChange={setDraftEmail} placeholder="name@…" inputMode="email" />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={commit}
                className="flex-1 h-9 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); if (!customer) clear(); }}
                className="h-9 px-4 rounded-md border border-[var(--border)] text-[var(--text-secondary)] text-[12.5px] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label, value, onChange, placeholder, inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)] mb-1.5">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)] transition-colors"
      />
    </label>
  );
}

/* ────────────────────────────────────────────────────────────
 * Discount + Voucher editor.
 *
 * Discount is either PERCENT or FIXED_IDR — one or the other, whichever the
 * cashier picks last wins. Voucher validates against the storefront endpoint
 * and, on success, overwrites the discount with a FIXED_IDR amount.
 * ────────────────────────────────────────────────────────── */
type VoucherState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'applied'; discount: number }
  | { status: 'error'; message: string };

function reasonMessage(reason: string): string {
  switch (reason) {
    case 'not_found': return 'Voucher code not found.';
    case 'expired': return 'This voucher has expired.';
    case 'not_started': return 'This voucher is not active yet.';
    case 'inactive': return 'This voucher is disabled.';
    case 'limit_reached': return 'This voucher has reached its usage limit.';
    case 'below_minimum': return 'Cart total is below the voucher minimum.';
    default: return 'Voucher could not be applied.';
  }
}

function DiscountVoucherPanel({
  discount, onDiscount, voucherCode, onVoucherCode, subtotalIdr, discountIdr,
}: {
  discount: { kind: DiscountKind; value: number } | null;
  onDiscount: (d: { kind: DiscountKind; value: number } | null) => void;
  voucherCode: string | null;
  onVoucherCode: (code: string | null) => void;
  subtotalIdr: number;
  discountIdr: number;
}) {
  const [kind, setKind] = useState<DiscountKind>(discount?.kind ?? 'FIXED_IDR');
  const [inputValue, setInputValue] = useState<string>(
    discount ? String(discount.value) : '',
  );
  const [codeInput, setCodeInput] = useState<string>(voucherCode ?? '');
  const [voucherState, setVoucherState] = useState<VoucherState>(
    voucherCode && discount ? { status: 'applied', discount: discount.value } : { status: 'idle' },
  );

  const applyDiscount = (nextKind: DiscountKind, nextValue: string) => {
    const digits = nextValue.replace(/[^0-9]/g, '');
    const num = Number(digits || 0);
    if (num <= 0) {
      onDiscount(null);
      return;
    }
    // Percent capped at 100.
    const capped = nextKind === 'PERCENT' ? Math.min(100, num) : num;
    onDiscount({ kind: nextKind, value: capped });
  };

  const onKindChange = (k: DiscountKind) => {
    setKind(k);
    applyDiscount(k, inputValue);
  };

  const onValueChange = (v: string) => {
    setInputValue(v);
    applyDiscount(kind, v);
  };

  const handleApplyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setVoucherState({ status: 'checking' });
    try {
      const res = await validateVoucher(code, subtotalIdr);
      if (res.valid) {
        onVoucherCode(code);
        onDiscount({ kind: 'FIXED_IDR', value: res.discountIdr });
        setKind('FIXED_IDR');
        setInputValue(String(res.discountIdr));
        setVoucherState({ status: 'applied', discount: res.discountIdr });
      } else {
        setVoucherState({ status: 'error', message: reasonMessage(res.reason) });
      }
    } catch {
      setVoucherState({ status: 'error', message: 'Could not reach the voucher service.' });
    }
  };

  const removeVoucher = () => {
    setCodeInput('');
    onVoucherCode(null);
    onDiscount(null);
    setInputValue('');
    setVoucherState({ status: 'idle' });
  };

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <header className="px-3.5 py-2.5 bg-[var(--accent)] text-[var(--accent-text)]">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Discount & voucher</h2>
      </header>

      <div className="p-3.5 space-y-3.5">
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)] mb-1.5">Discount</span>
          <div className="flex gap-2">
            <div className="inline-flex rounded-md border border-[var(--border)] overflow-hidden flex-shrink-0">
              {(['FIXED_IDR', 'PERCENT'] as const).map(k => {
                const on = kind === k;
                return (
                  <button
                    key={k}
                    onClick={() => onKindChange(k)}
                    className={`h-10 px-3 text-[12px] font-medium transition-colors ${on ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    {k === 'PERCENT' ? '%' : 'Rp'}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 flex items-center bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-3">
              <input
                className="flex-1 bg-transparent font-mono text-[13px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] h-10"
                placeholder={kind === 'PERCENT' ? '0' : '0'}
                inputMode="numeric"
                value={inputValue}
                onChange={e => onValueChange(e.target.value)}
              />
              <span className="text-[11px] text-[var(--text-muted)] font-mono">{kind === 'PERCENT' ? '%' : 'Rp'}</span>
            </div>
          </div>
          {discountIdr > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-mono">
              Applied: − {fmtIdr(discountIdr)}
            </p>
          )}
        </div>

        <div>
          <span className="block text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)] mb-1.5">Voucher code</span>
          {voucherState.status === 'applied' ? (
            <div className="flex items-center justify-between gap-2 px-3 h-10 bg-[var(--bg-base)] border border-[var(--accent)] rounded-md">
              <div className="flex items-center gap-2 min-w-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)] truncate">{voucherCode}</span>
              </div>
              <button
                onClick={removeVoucher}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--danger)] underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleApplyCode(); }}
                placeholder="e.g. MFVIP10"
                className="flex-1 h-10 px-3 rounded-md bg-[var(--bg-base)] border border-[var(--border)] font-mono text-[13px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] uppercase focus:border-[var(--accent)] transition-colors"
              />
              <button
                onClick={handleApplyCode}
                disabled={!codeInput.trim() || voucherState.status === 'checking'}
                className="h-10 px-4 rounded-md border border-[var(--border)] text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {voucherState.status === 'checking' ? 'Checking…' : 'Apply'}
              </button>
            </div>
          )}
          {voucherState.status === 'error' && (
            <p className="text-[11px] text-[var(--danger)] mt-1.5">{voucherState.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}

