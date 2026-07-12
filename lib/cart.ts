import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { artistsLabel, conditionLabel } from "@/lib/catalog";

// Guest cart stored in an httpOnly cookie (customer accounts aren't built yet).
// Shape: [{ variantId, qty }]. Prices/titles are always re-read from the DB so
// the cookie can never drift from real catalog data.

export const CART_COOKIE = "mf_cart";

export type CartLine = { variantId: string; qty: number };

function clampQty(n: number): number {
  return Math.max(1, Math.min(99, Math.floor(n)));
}

export async function readCartLines(): Promise<CartLine[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l) =>
          l &&
          typeof l.variantId === "string" &&
          typeof l.qty === "number" &&
          Number.isFinite(l.qty),
      )
      .map((l) => ({ variantId: l.variantId as string, qty: clampQty(l.qty) }));
  } catch {
    return [];
  }
}

export async function cartCount(): Promise<number> {
  const lines = await readCartLines();
  return lines.reduce((n, l) => n + l.qty, 0);
}

export type CartItem = {
  variantId: string;
  qty: number;
  slug: string;
  title: string;
  artist: string | null;
  cover: string | null;
  condition: string | null;
  unitPrice: number;
  lineTotal: number;
};

export type CartView = {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  count: number;
};

export async function getCartView(): Promise<CartView> {
  const lines = await readCartLines();
  if (lines.length === 0) {
    return { items: [], subtotal: 0, tax: 0, total: 0, count: 0 };
  }

  const variants = await prisma.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: { product: { include: { release: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const items: CartItem[] = [];
  let subtotal = 0;
  let tax = 0;

  for (const line of lines) {
    const v = byId.get(line.variantId);
    if (!v || v.product.status !== "ACTIVE") continue;
    const unit = Number(v.priceIdr.toString());
    const lineTotal = unit * line.qty;
    subtotal += lineTotal;
    tax += lineTotal * Number(v.taxRate.toString());
    items.push({
      variantId: v.id,
      qty: line.qty,
      slug: v.product.slug,
      title: v.product.title,
      artist: v.product.release ? artistsLabel(v.product.release.artistsJson) : null,
      cover: v.product.heroImage ?? v.product.release?.coverUrl ?? null,
      condition: conditionLabel(v.conditionMedia),
      unitPrice: unit,
      lineTotal,
    });
  }

  return {
    items,
    subtotal,
    tax: Math.round(tax),
    total: Math.round(subtotal + tax),
    count: items.reduce((n, i) => n + i.qty, 0),
  };
}
