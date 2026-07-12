import { useEffect, useState } from 'react';
import { getReleases } from '../../api/inventory';
import { getChannels } from '../../api/ops';
import {
  DEMO_PRODUCTS, releaseToProduct,
  type PosCategory, type PosProduct,
} from '../../api/pos';
import { ProductGrid } from './ProductGrid';
import { Cart, type CartTotals } from './Cart';
import { PaymentPanel, type EdcBank, type ImportedMethod, type PaymentSelection } from './PaymentPanel';
import { EdcOverlay, SuccessModal, type EdcResult, type SaleSummary } from './Overlays';
import { usePosStore } from './PosContext';

function newOrderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `MF-${stamp}-${seq}`;
}

/**
 * POS register. Cart, discount and customer live in the shared PosContext so
 * they survive navigation between /pos and /pos/checkout; UI state (search,
 * catalogue filters, payment method) stays local to this page.
 */
export function Pos() {
  const {
    cart, addToCart, updateQty, removeLine, clearCart,
    discount, setDiscount,
    subtotalIdr, discountIdr, taxIdr, totalIdr,
  } = usePosStore();

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PosCategory | 'all'>('all');

  const [selection, setSelection] = useState<PaymentSelection | null>(null);
  const [cashTender, setCashTender] = useState('');
  const [imported, setImported] = useState<ImportedMethod[]>([]);

  const [edcOverlay, setEdcOverlay] = useState<{ bank: EdcBank } | null>(null);
  const [sale, setSale] = useState<SaleSummary | null>(null);

  // Products — from inventory, falling back to a demo catalogue so the page always renders.
  useEffect(() => {
    let alive = true;
    getReleases({ limit: 60, sort: 'newest' })
      .then(r => { if (alive) setProducts(r.data.map(releaseToProduct)); })
      .catch(() => { if (alive) setProducts(DEMO_PRODUCTS); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // DealPOS-synced payment methods (filter out suspended ones).
  useEffect(() => {
    getChannels()
      .then(c => setImported(c.paymentMethods.filter(m => !m.suspended).map(m => ({ id: m.id, name: m.name }))))
      .catch(() => setImported([]));
  }, []);

  const totals: CartTotals = {
    subtotal: subtotalIdr,
    discount: discountIdr,
    tax: taxIdr,
    total: totalIdr,
  };

  const inCart = new Set(cart.map(l => l.product.id));

  // Cart.tsx uses a delta-based updater; adapt to the store's absolute update.
  const handleQty = (productId: string, delta: number) => {
    const line = cart.find(l => l.product.id === productId);
    if (!line) return;
    updateQty(productId, line.qty + delta);
  };

  // Cart.tsx exposes a fixed-IDR discount input. Persist it as { kind, value }
  // in the shared store so the checkout page can promote it to a percent.
  const discountInput = discount?.kind === 'FIXED_IDR' && discount.value > 0
    ? String(discount.value) : '';
  const handleDiscountInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    const value = Number(digits || 0);
    setDiscount(value > 0 ? { kind: 'FIXED_IDR', value } : null);
  };

  const resetSale = () => {
    clearCart();
    setSelection(null);
    setCashTender('');
    setSale(null);
    setEdcOverlay(null);
  };

  const completeSale = (method: string, extra?: { change?: number; edc?: EdcResult }) => {
    // TODO: POST to /pos/checkout — persist the sale, decrement stock, record the payment.
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
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      amount: totals.total,
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
        const change = Number(cashTender || 0) - totals.total;
        completeSale('Cash', { change: change > 0 ? change : 0 });
        break;
      }
      case 'imported':
        completeSale(`${selection.methodName} · imported from DealPOS`);
        break;
    }
  };

  return (
    <div className="h-[calc(100vh-108px)] max-md:h-auto">
      <div className="grid grid-cols-[1fr_400px] max-lg:grid-cols-[1fr_360px] max-md:grid-cols-1 gap-3 h-full max-md:h-auto">
        {/* Left — product browser */}
        <div className="min-h-0 max-md:h-[70vh]">
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

        {/* Right — cart + payment */}
        <div className="min-h-0 flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden max-md:h-auto">
          <div className="flex-1 min-h-0 flex flex-col border-b border-[var(--border-sub)] max-md:flex-none">
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
          <div className="flex-1 min-h-0 flex flex-col max-md:flex-none">
            <PaymentPanel
              total={totals.total}
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
      </div>

      {edcOverlay && (
        <EdcOverlay
          bank={edcOverlay.bank}
          amount={totals.total}
          onCancel={() => setEdcOverlay(null)}
          onApproved={(result: EdcResult) => {
            setEdcOverlay(null);
            completeSale(`EDC · ${edcOverlay.bank} · ${result.scheme} ${result.entry.toLowerCase()}`, { edc: result });
          }}
        />
      )}

      {sale && <SuccessModal sale={sale} onNewSale={resetSale} />}
    </div>
  );
}
