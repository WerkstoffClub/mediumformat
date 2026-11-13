/** Pure pricing + stock check for a web order. Prices always come from the DB, never the client. */

export interface PricedRelease {
  id: string; artist: string; title: string; format: string; priceIdr: number; stock: number;
}

export type PricingResult =
  | { ok: true; lines: Array<PricedRelease & { qty: number }>; subtotalIdr: number }
  | { ok: false; error: string };

export function priceLines(
  requested: Array<{ releaseId: string; qty: number }>,
  releases: PricedRelease[],
): PricingResult {
  const byId = new Map(releases.map(r => [r.id, r]));
  // Merge duplicate lines for the same release so the stock check sees the real total.
  const qtyById = new Map<string, number>();
  for (const l of requested) qtyById.set(l.releaseId, (qtyById.get(l.releaseId) ?? 0) + l.qty);

  const lines: Array<PricedRelease & { qty: number }> = [];
  for (const [id, qty] of qtyById) {
    const r = byId.get(id);
    if (!r) return { ok: false, error: 'An item in your cart is no longer available.' };
    if (r.stock < 1) return { ok: false, error: `${r.artist} — ${r.title} just sold out.` };
    if (r.stock < qty) return { ok: false, error: `Only ${r.stock} left of ${r.artist} — ${r.title}.` };
    lines.push({ ...r, qty });
  }
  const subtotalIdr = lines.reduce((sum, l) => sum + l.priceIdr * l.qty, 0);
  return { ok: true, lines, subtotalIdr };
}

/** MF-YYMMDD-XXXX — readable over WhatsApp, unguessable enough for a reference. */
export function orderNumber(now: Date, rand: () => number = Math.random): string {
  const d = new Date(now.getTime() + 7 * 3600_000); // WIB
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 5; i++) tail += alphabet[Math.floor(rand() * alphabet.length)];
  return `MF-${ymd}-${tail}`;
}
