import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { CartLine, PosProduct } from '../../api/pos';
import { TAX_RATE } from '../../api/pos';

/**
 * Shared POS state — cart, discount, voucher, and customer. Persisted to
 * sessionStorage so a browser refresh or a hop between /pos and /pos/checkout
 * does not lose the in-flight sale.
 */

const STORAGE_KEY = 'mf-pos-state-v1';

export type DiscountKind = 'PERCENT' | 'FIXED_IDR';

export interface DiscountSpec {
  kind: DiscountKind;
  value: number;
}

export interface PosCustomer {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface PersistedState {
  cart: CartLine[];
  discount: DiscountSpec | null;
  voucherCode: string | null;
  customer: PosCustomer | null;
}

export interface PosStore {
  cart: CartLine[];
  addToCart: (product: PosProduct, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  discount: DiscountSpec | null;
  setDiscount: (d: DiscountSpec | null) => void;
  voucherCode: string | null;
  setVoucherCode: (code: string | null) => void;
  customer: PosCustomer | null;
  setCustomer: (c: PosCustomer | null) => void;
  subtotalIdr: number;
  discountIdr: number;
  taxIdr: number;
  totalIdr: number;
  itemCount: number;
}

const PosContext = createContext<PosStore | null>(null);

function loadPersisted(): PersistedState {
  const empty: PersistedState = { cart: [], discount: null, voucherCode: null, customer: null };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      discount: parsed.discount ?? null,
      voucherCode: typeof parsed.voucherCode === 'string' ? parsed.voucherCode : null,
      customer: parsed.customer ?? null,
    };
  } catch {
    return empty;
  }
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [initial] = useState<PersistedState>(loadPersisted);
  const [cart, setCart] = useState<CartLine[]>(initial.cart);
  const [discount, setDiscount] = useState<DiscountSpec | null>(initial.discount);
  const [voucherCode, setVoucherCode] = useState<string | null>(initial.voucherCode);
  const [customer, setCustomer] = useState<PosCustomer | null>(initial.customer);

  // Persist on every change — best-effort, don't crash on quota.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cart, discount, voucherCode, customer }),
      );
    } catch {
      /* quota or private mode — ignore */
    }
  }, [cart, discount, voucherCode, customer]);

  const addToCart = useCallback((product: PosProduct, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.qty + qty);
        if (nextQty === existing.qty) return prev;
        return prev.map(l => (l.product.id === product.id ? { ...l, qty: nextQty } : l));
      }
      return [...prev, { product, qty: Math.min(product.stock, qty) }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart(prev =>
      prev.flatMap(l => {
        if (l.product.id !== productId) return [l];
        const bounded = Math.min(l.product.stock, Math.max(0, qty));
        return bounded <= 0 ? [] : [{ ...l, qty: bounded }];
      }),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart(prev => prev.filter(l => l.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(null);
    setVoucherCode(null);
    setCustomer(null);
  }, []);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.product.priceIdr * l.qty, 0);
    let raw = 0;
    if (discount) {
      raw = discount.kind === 'PERCENT'
        ? Math.round(subtotal * (discount.value / 100))
        : discount.value;
    }
    const discountIdr = Math.min(subtotal, Math.max(0, raw));
    const taxable = Math.max(0, subtotal - discountIdr);
    const taxIdr = Math.round(taxable * TAX_RATE);
    return { subtotal, discountIdr, taxIdr, totalIdr: taxable + taxIdr };
  }, [cart, discount]);

  const itemCount = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);

  const value: PosStore = {
    cart,
    addToCart,
    updateQty,
    removeLine,
    clearCart,
    discount,
    setDiscount,
    voucherCode,
    setVoucherCode,
    customer,
    setCustomer,
    subtotalIdr: totals.subtotal,
    discountIdr: totals.discountIdr,
    taxIdr: totals.taxIdr,
    totalIdr: totals.totalIdr,
    itemCount,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePosStore(): PosStore {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePosStore must be used inside <PosProvider>.');
  return ctx;
}
