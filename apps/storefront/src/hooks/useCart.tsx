import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Release } from '../api/storefront';

/** One cart line. Price is a display snapshot only — the API re-prices on checkout. */
export interface CartLine {
  releaseId: string;
  slug: string | null;
  artist: string;
  title: string;
  format: string;
  imageUrl: string | null;
  priceIdr: number;
  stock: number;
  qty: number;
}

const STORAGE_KEY = 'mf-cart';
export const MAX_QTY = 10;

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotalIdr: number;
  add: (r: Release, qty?: number) => void;
  setQty: (releaseId: string, qty: number) => void;
  remove: (releaseId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(l => l && typeof l.releaseId === 'string' && l.qty > 0) : [];
  } catch {
    return [];
  }
}

const clampQty = (qty: number, stock: number) => Math.max(1, Math.min(qty, stock, MAX_QTY));

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* private mode */ }
  }, [lines]);

  const add = useCallback((r: Release, qty = 1) => {
    if (r.stock < 1) return;
    setLines(prev => {
      const hit = prev.find(l => l.releaseId === r.id);
      if (hit) return prev.map(l => (l === hit ? { ...l, stock: r.stock, qty: clampQty(l.qty + qty, r.stock) } : l));
      return [...prev, {
        releaseId: r.id, slug: r.slug, artist: r.artist, title: r.title, format: r.format,
        imageUrl: r.imageUrl, priceIdr: r.priceIdr, stock: r.stock, qty: clampQty(qty, r.stock),
      }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines(prev => prev.map(l => (l.releaseId === id ? { ...l, qty: clampQty(qty, l.stock) } : l)));
  }, []);
  const remove = useCallback((id: string) => setLines(prev => prev.filter(l => l.releaseId !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalIdr: lines.reduce((s, l) => s + l.priceIdr * l.qty, 0),
    add, setQty, remove, clear,
  }), [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
