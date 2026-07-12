import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { artistsLabel, conditionLabel } from "@/lib/catalog";

// In-store POS cart, kept in an httpOnly cookie for the logged-in staff session.
export const POS_COOKIE = "mf_pos";

export type PosLine = { variantId: string; qty: number };

export async function readPosLines(): Promise<PosLine[]> {
  const store = await cookies();
  const raw = store.get(POS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.variantId === "string" && Number.isFinite(l.qty))
      .map((l) => ({ variantId: l.variantId, qty: Math.max(1, Math.min(99, Math.floor(l.qty))) }));
  } catch {
    return [];
  }
}

export type PosItem = {
  variantId: string;
  qty: number;
  sku: string;
  title: string;
  artist: string | null;
  condition: string | null;
  unitPrice: number;
  lineTotal: number;
};

export async function getPosView() {
  const lines = await readPosLines();
  if (lines.length === 0) {
    return { items: [] as PosItem[], subtotal: 0, tax: 0, total: 0, count: 0 };
  }
  const variants = await prisma.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: { product: { include: { release: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const items: PosItem[] = [];
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const v = byId.get(line.variantId);
    if (!v) continue;
    const unit = Number(v.priceIdr.toString());
    const lineTotal = unit * line.qty;
    subtotal += lineTotal;
    tax += lineTotal * Number(v.taxRate.toString());
    items.push({
      variantId: v.id,
      qty: line.qty,
      sku: v.sku,
      title: v.product.title,
      artist: v.product.release ? artistsLabel(v.product.release.artistsJson) : null,
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
