import { useEffect, useMemo, useState } from 'react';
import { getReleases } from '../../api/inventory';
import { getChannels } from '../../api/ops';
import {
  DEMO_PRODUCTS, TAX_RATE, releaseToProduct,
  type CartLine, type PosCategory, type PosProduct,
} from '../../api/pos';
import { ProductGrid } from './ProductGrid';
import { Cart, type CartTotals } from './Cart';
import { PaymentPanel, type EdcBank, type ImportedMethod, type PaymentSelection } from './PaymentPanel';
import { EdcOverlay, SuccessModal, type EdcResult, type SaleSummary } from './Overlays';

function newOrderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `MF-${stamp}-${seq}`;
}

export function Pos() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PosCategory | 'all'>('all');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState('');
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

  const totals: CartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.product.priceIdr * l.qty, 0);
    const discount = Math.min(Number(discountInput || 0), subtotal);
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * TAX_RATE);
    return { subtotal, discount, tax, total: taxable + tax };
  }, [cart, discountInput]);

  const inCart = useMemo(() => new Set(cart.map(l => l.product.id)), [cart]);

  const addToCart = (product: PosProduct) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(l => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(prev => prev.flatMap(l => {
      if (l.product.id !== productId) return [l];
      const qty = Math.min(l.product.stock, l.qty + delta);
      return qty <= 0 ? [] : [{ ...l, qty }];
    }));
  };

  const removeLine = (productId: string) => setCart(prev => prev.filter(l => l.product.id !== productId));

  const resetSale = () => {
    setCart([]);
    setDiscountInput('');
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
              onDiscountInput={setDiscountInput}
              onQty={changeQty}
              onRemove={removeLine}
              onClear={() => { setCart([]); setDiscountInput(''); }}
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
