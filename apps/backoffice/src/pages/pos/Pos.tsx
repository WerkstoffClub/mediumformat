import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReleases } from '../../api/inventory';
import { fmtIdr } from '../../api/ops';
import {
  DEMO_PRODUCTS, releaseToProduct,
  type PosCategory, type PosProduct,
} from '../../api/pos';
import { ProductGrid } from './ProductGrid';
import { Cart, type CartTotals } from './Cart';
import { usePosStore } from './PosContext';

/**
 * POS "browse + build cart" page. Charge → /pos/checkout.
 *
 * Layout:
 * - Desktop (≥ md): catalog left, cart + charge button right.
 * - Mobile (< md): catalog full, floating "Cart (N · Rp X)" button,
 *   bottom-sheet cart that opens from the button.
 */
export function Pos() {
  const navigate = useNavigate();
  const {
    cart, addToCart, updateQty, removeLine, clearCart,
    discount, setDiscount, itemCount,
    subtotalIdr, discountIdr, taxIdr, totalIdr,
  } = usePosStore();

  // Catalogue-local UI state (does not need to survive route change).
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PosCategory | 'all'>('all');
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getReleases({ limit: 60, sort: 'newest' })
      .then(r => { if (alive) setProducts(r.data.map(releaseToProduct)); })
      .catch(() => { if (alive) setProducts(DEMO_PRODUCTS); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Cart.tsx expects a delta-based updater; adapt to the store's absolute
  // updateQty(id, qty).
  const handleQty = (productId: string, delta: number) => {
    const line = cart.find(l => l.product.id === productId);
    if (!line) return;
    updateQty(productId, line.qty + delta);
  };

  // Cart.tsx uses a fixed-IDR discount input. Persist it as { kind, value }
  // in the store; the checkout page can promote it to a percent later.
  const discountInput = discount?.kind === 'FIXED_IDR' && discount.value > 0
    ? String(discount.value) : '';
  const handleDiscountInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    const value = Number(digits || 0);
    setDiscount(value > 0 ? { kind: 'FIXED_IDR', value } : null);
  };

  const totals: CartTotals = {
    subtotal: subtotalIdr,
    discount: discountIdr,
    tax: taxIdr,
    total: totalIdr,
  };

  const inCart = new Set(cart.map(l => l.product.id));

  const goCheckout = () => {
    if (cart.length === 0) return;
    setCartSheetOpen(false);
    navigate('/pos/checkout');
  };

  return (
    <div className="h-[calc(100vh-108px)] max-md:h-auto">
      <div className="grid grid-cols-[1fr_400px] max-lg:grid-cols-[1fr_360px] max-md:grid-cols-1 gap-3 h-full max-md:h-auto">
        {/* Left — product browser */}
        <div className="min-h-0 max-md:min-h-[calc(100vh-200px)]">
          <ProductGrid
            products={products}
            loading={loading}
            search={search}
            onSearch={setSearch}
            category={category}
            onCategory={setCategory}
            onAdd={addToCart}
            inCart={inCart}
          />
        </div>

        {/* Right — cart + charge (desktop only; mobile uses bottom sheet) */}
        <div className="min-h-0 flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden max-md:hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            <Cart
              lines={cart}
              totals={totals}
              discountInput={discountInput}
              onDiscountInput={handleDiscountInput}
              onQty={handleQty}
              onRemove={removeLine}
              onClear={clearCart}
            />
          </div>
          <ChargeBar total={totalIdr} disabled={cart.length === 0} onCharge={goCheckout} />
        </div>
      </div>

      {/* Mobile — floating cart button */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartSheetOpen(true)}
          className="hidden max-md:flex fixed left-4 right-4 bottom-4 z-40 h-14 items-center gap-3 px-4 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_8px_24px_rgba(0,0,0,.45)] active:scale-[0.99] transition-transform"
        >
          <span className="w-8 h-8 rounded-md bg-[var(--accent-text)] text-[var(--accent)] font-mono text-[13px] font-semibold flex items-center justify-center flex-shrink-0">
            {itemCount}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12px] opacity-70 leading-tight">Cart</span>
            <span className="block font-mono text-[15px] font-semibold leading-tight truncate">{fmtIdr(totalIdr)}</span>
          </span>
          <span className="text-[13px] font-semibold flex items-center gap-1">
            View
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
        </button>
      )}

      {/* Mobile — bottom-sheet cart */}
      <MobileCartSheet
        open={cartSheetOpen}
        onClose={() => setCartSheetOpen(false)}
        lines={cart}
        totals={totals}
        discountInput={discountInput}
        onDiscountInput={handleDiscountInput}
        onQty={handleQty}
        onRemove={removeLine}
        onClear={clearCart}
        onCharge={goCheckout}
      />
    </div>
  );
}

/* ── Desktop charge bar ────────────────────────────────────── */
function ChargeBar({ total, disabled, onCharge }: { total: number; disabled: boolean; onCharge: () => void }) {
  return (
    <div className="flex-shrink-0 border-t border-[var(--border-sub)] bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-4">
      <div className="flex-shrink-0">
        <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">Amount due</p>
        <p className="font-mono text-[20px] font-medium text-[var(--text-primary)] leading-tight">{fmtIdr(total)}</p>
      </div>
      <button
        onClick={onCharge}
        disabled={disabled}
        className="flex-1 h-[52px] rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[15px] font-semibold tracking-[-0.01em] flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:bg-[var(--bg-overlay)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-100"
      >
        Charge
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

/* ── Mobile bottom-sheet cart ─────────────────────────────── */
interface MobileCartSheetProps {
  open: boolean;
  onClose: () => void;
  lines: ReturnType<typeof usePosStore>['cart'];
  totals: CartTotals;
  discountInput: string;
  onDiscountInput: (v: string) => void;
  onQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCharge: () => void;
}

function MobileCartSheet({
  open, onClose, lines, totals, discountInput, onDiscountInput,
  onQty, onRemove, onClear, onCharge,
}: MobileCartSheetProps) {
  return (
    <div className="max-md:block hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 h-[92%] bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-xl shadow-[0_-8px_24px_rgba(0,0,0,.5)] flex flex-col transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
      >
        <div className="flex-shrink-0 flex justify-center pt-2 pb-1">
          <span className="w-11 h-1 rounded-full bg-[var(--border)]" />
        </div>
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2 border-b border-[var(--border-sub)]">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Cart</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <Cart
            lines={lines}
            totals={totals}
            discountInput={discountInput}
            onDiscountInput={onDiscountInput}
            onQty={onQty}
            onRemove={onRemove}
            onClear={onClear}
          />
        </div>

        <div className="flex-shrink-0 border-t border-[var(--border-sub)] bg-[var(--bg-surface)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <button
            onClick={onCharge}
            disabled={lines.length === 0}
            className="w-full h-14 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[15px] font-semibold tracking-[-0.01em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:bg-[var(--bg-overlay)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            Charge {fmtIdr(totals.total)}
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
