import { api } from './client';

export type LocationKind = 'RETAIL' | 'STORAGE' | 'TEMPORARY' | 'CONSIGNMENT';
export type StoreLocationKey = 'MAIN_STORE' | 'WAREHOUSE' | 'CONSIGNMENT';

export interface LocationStats {
  items: number;
  units: number;
  shelves: number;
  lowStock: number;
  /** Units × retail price of the stock held here. */
  valueIdr: number;
}

/** Sales excl. PPN (MF POS + matched DealPOS) in the location's window:
 *  an event's run, else the last 30 days. */
export interface LocationSales {
  revenue: number;
  orders: number;
  avgOrder: number;
  units: number;
  windowDays: number;
}

export interface LocationRecord {
  id: string;
  name: string;
  kind: LocationKind;
  address: string | null;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  shelves: string[];
  matchKey: string | null;
  storeLocation: StoreLocationKey | null;
  sortOrder: number;
  /** Consignment partner's cut of sales, 0–100. */
  commissionPct: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location extends LocationRecord {
  stats: LocationStats;
  sales: LocationSales;
}

export interface LocationInput {
  name: string;
  kind?: LocationKind;
  address?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  shelves?: string[];
  matchKey?: string;
  storeLocation?: StoreLocationKey | null;
  sortOrder?: number;
  commissionPct?: number;
}

export async function getLocations(): Promise<Location[]> {
  const res = await api.get<Location[]>('/locations');
  return res.data;
}

export async function createLocation(data: LocationInput): Promise<LocationRecord> {
  const res = await api.post<LocationRecord>('/locations', data);
  return res.data;
}

export async function updateLocation(id: string, data: Partial<LocationInput>): Promise<LocationRecord> {
  const res = await api.patch<LocationRecord>(`/locations/${id}`, data);
  return res.data;
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/locations/${id}`);
}

/** "4–6 Jul 2026" / "4 Jul 2026" for a temporary location's window. */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (!end || end === start) return s.toLocaleDateString('en-GB', opts);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startLabel = sameMonth ? String(s.getDate()) : s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${startLabel}–${e.toLocaleDateString('en-GB', opts)}`;
}

// ─── Stock by location ─────────────────────────────────────────────────────

export interface LocationStockRow {
  id: string;
  artist: string;
  title: string;
  catNumber: string | null;
  barcode: string | null;
  format: string;
  condition: string;
  priceIdr: number;
  imageUrl: string | null;
  stock: number;
  /** Units of this release at the location. */
  locationQty: number;
}

export async function getLocationStock(id: string, params: { q?: string; limit?: number; inStock?: boolean } = {}): Promise<LocationStockRow[]> {
  const res = await api.get<LocationStockRow[]>(`/locations/${id}/stock`, {
    params: { q: params.q || undefined, limit: params.limit, inStock: params.inStock ? 'true' : undefined },
  });
  return res.data;
}

export interface StockTransfer {
  id: string;
  number: string;
  note: string | null;
  createdAt: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  lines: Array<{ id: string; releaseId: string; artist: string; title: string; qty: number }>;
}

export async function createTransfer(input: {
  fromLocationId: string; toLocationId: string; lines: Array<{ releaseId: string; qty: number }>; note?: string;
}): Promise<StockTransfer> {
  return (await api.post<StockTransfer>('/stock-transfers', input)).data;
}

/** Record what a consignment shop / event sold (no till there): a PAID sale at that location, no PPN on top. */
export async function recordLocationSales(input: {
  locationId: string; lines: Array<{ releaseId: string; qty: number }>; soldAt?: string;
}): Promise<{ id: string; number: string; totalIdr: number }> {
  return (await api.post('/pos/sales/report', input)).data;
}

export interface LocationReport {
  location: LocationRecord;
  range: { from: string; to: string; previousFrom: string; previousTo: string };
  sales: {
    revenue: number; orders: number; units: number; avgOrder: number;
    pos: { revenue: number; orders: number; units: number };
    dealpos: { revenue: number; orders: number };
    previousRevenue: number;
    /** % vs the previous equal period; null when that period had no sales. */
    changePct: number | null;
    commissionPct: number; commissionIdr: number; netIdr: number;
  };
  sellThroughPct: number;
  stock: LocationStats;
  movement: { unitsIn: number; unitsOut: number };
  daily: Array<{ date: string; posRevenue: number; dealposRevenue: number; units: number; orders: number }>;
  topSellers: Array<{ releaseId: string; artist: string; title: string; units: number; revenue: number }>;
  transfers: StockTransfer[];
}

export async function getLocationReport(id: string, range: { from?: string; to?: string } = {}): Promise<LocationReport> {
  return (await api.get<LocationReport>(`/locations/${id}/report`, { params: range })).data;
}

/** The API's message for a failed request. */
export function apiError(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : fallback;
}
