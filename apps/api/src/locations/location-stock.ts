import type { LocationKind, StoreLocation } from '@prisma/client';

/** Pure rules for stock-by-location (kept free of Prisma so they are unit-tested). */

export interface HomeCandidate {
  id: string;
  kind: LocationKind;
  storeLocation: StoreLocation | null;
  sortOrder: number;
  active: boolean;
}

/**
 * The home location of a release: the first location (by sortOrder) linked to the
 * release's storeLocation, else the first retail location, else the first one.
 * Home stock is implicit (Release.stock minus everything held elsewhere).
 */
export function homeLocationId(storeLocation: StoreLocation, locations: HomeCandidate[]): string | null {
  const sorted = [...locations].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    sorted.find(l => l.storeLocation === storeLocation)?.id ??
    sorted.find(l => l.kind === 'RETAIL' && l.active)?.id ??
    sorted[0]?.id ??
    null
  );
}

/** Units of a release available at a location. */
export function availableAt(
  locationId: string,
  homeId: string | null,
  totalStock: number,
  awayRows: Array<{ locationId: string; qty: number }>,
): number {
  if (locationId === homeId) {
    const away = awayRows.reduce((s, r) => s + Math.max(0, r.qty), 0);
    return Math.max(0, totalStock - away);
  }
  return Math.max(0, awayRows.find(r => r.locationId === locationId)?.qty ?? 0);
}

/** Merge duplicate lines for the same release. */
export function mergeLines(lines: Array<{ releaseId: string; qty: number }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) out.set(l.releaseId, (out.get(l.releaseId) ?? 0) + l.qty);
  return out;
}

/** TRF-YYMMDD-XXXXX (WIB date). */
export function transferNumber(now: Date, rand: () => number = Math.random): string {
  const d = new Date(now.getTime() + 7 * 3600_000);
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 5; i++) tail += alphabet[Math.floor(rand() * alphabet.length)];
  return `TRF-${ymd}-${tail}`;
}

/** Commission and net for a location's sales (commissionPct 0–100). */
export function commissionSplit(grossIdr: number, commissionPct: number | null | undefined) {
  const pct = Math.min(100, Math.max(0, commissionPct ?? 0));
  const commissionIdr = Math.round(grossIdr * (pct / 100));
  return { commissionPct: pct, commissionIdr, netIdr: grossIdr - commissionIdr };
}

/** Percentage change, null when there is nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Sell-through: sold ÷ (sold + still on hand), 0–100, one decimal. */
export function sellThrough(unitsSold: number, unitsOnHand: number): number {
  const base = unitsSold + Math.max(0, unitsOnHand);
  return base > 0 ? Math.round((unitsSold / base) * 1000) / 10 : 0;
}

/** Every calendar day (YYYY-MM-DD, WIB) from `from` to `to` inclusive. */
export function dayKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const wib = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const start = new Date(`${wib(from)}T00:00:00Z`);
  const end = new Date(`${wib(to)}T00:00:00Z`);
  for (let t = start.getTime(); t <= end.getTime() && keys.length < 400; t += 86_400_000) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  return keys;
}
