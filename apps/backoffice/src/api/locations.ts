import { api } from './client';

export type LocationKind = 'RETAIL' | 'STORAGE' | 'TEMPORARY' | 'CONSIGNMENT';
export type StoreLocationKey = 'MAIN_STORE' | 'WAREHOUSE' | 'CONSIGNMENT';

export interface LocationStats {
  items: number;
  units: number;
  shelves: number;
  lowStock: number;
}

export interface EventSales {
  revenue: number;
  orders: number;
  avgOrder: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface Location extends LocationRecord {
  stats: LocationStats;
  /** Present for TEMPORARY (event) locations — sales taken during the run. */
  sales?: EventSales;
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
