import { api } from './client';

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderRow {
  id: string;
  number: string;
  outlet: string | null;
  customerName: string | null;
  tag: string | null;
  date: string;
  amount: string | number;
  paymentStatus: string | null;
  fulfillment: string | null;
  _count?: { lines: number };
}

export interface OrderLine {
  id: string;
  name: string;
  code: string | null;
  quantity: string | number;
  cost: string | number | null;
  price: string | number;
  discountAmount: string | number | null;
  sales: string | number | null;
}

export interface OrderPayment {
  id: string;
  date: string | null;
  amount: string | number;
  method: string;
  note: string | null;
}

export interface OrderDetail extends OrderRow {
  lines: OrderLine[];
  payments: OrderPayment[];
}

export type CustomerSegment = 'vip' | 'new' | null;

export interface CustomerRow {
  id: string;
  name: string;
  code: string | null;
  mobile: string | null;
  email: string | null;
  joinDate: string | null;
  orders: number;
  lifetime: number;
  lastOrderAt: string | null;
  channel: string | null;
  segment: CustomerSegment;
}

export interface CustomersSummary {
  totalCustomers: number;
  newThisMonth: number;
  vipCount: number;
  avgLifetime: number;
  avgOrders: number;
  repeatRate: number;
  vipRevenueShare: number;
  topCustomers: CustomerRow[];
  acquisition: Array<{ channel: string; count: number }>;
}

export interface PurchaseOrderRow {
  id: string;
  number: string;
  supplierName: string | null;
  type: string | null;
  date: string;
  due: string | null;
  amount: string | number;
  delivery: string | null;
  paymentStatus: string | null;
  _count?: { lines: number };
}

export interface CatalogGroup { name: string; releases: number; units: number; }
export interface CatalogSummary { formats: CatalogGroup[]; genres: CatalogGroup[]; locations: CatalogGroup[]; }

export interface ChannelSummary {
  channels: Array<{ tag: string; orders: number; revenue: number; lastOrderAt: string }>;
  paymentMethods: Array<{ id: number; name: string; type: string | null; suspended: boolean }>;
}

export interface OrdersFilter {
  q?: string;
  tag?: string;
  payment?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getOrders(filter: OrdersFilter = {}): Promise<Paged<OrderRow>> {
  const res = await api.get<Paged<OrderRow>>('/orders', { params: filter });
  return res.data;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const res = await api.get<OrderDetail>(`/orders/${id}`);
  return res.data;
}

export async function getCustomers(
  filter: { q?: string; page?: number; limit?: number; segment?: 'vip' | 'new' | 'repeat' } = {},
): Promise<Paged<CustomerRow>> {
  const res = await api.get<Paged<CustomerRow>>('/customers-list', { params: filter });
  return res.data;
}

export async function getCustomersSummary(): Promise<CustomersSummary> {
  const res = await api.get<CustomersSummary>('/customers-summary');
  return res.data;
}

export async function getPurchaseOrders(filter: { q?: string; page?: number; limit?: number } = {}): Promise<Paged<PurchaseOrderRow> & { suppliers: number }> {
  const res = await api.get<Paged<PurchaseOrderRow> & { suppliers: number }>('/purchase-orders', { params: filter });
  return res.data;
}

export async function getCatalogSummary(): Promise<CatalogSummary> {
  const res = await api.get<CatalogSummary>('/catalog-summary');
  return res.data;
}

export async function getChannels(filter: { from?: string; to?: string } = {}): Promise<ChannelSummary> {
  const res = await api.get<ChannelSummary>('/channels-summary', { params: filter });
  return res.data;
}

/* v2.1 channel colour key — the ONLY non-status colour in the system.
   Dot + text on a neutral pill, channel indicators only. */
const CHANNEL_COLORS: Array<[RegExp, string]> = [
  [/tiktok/i, '#69C9D0'],
  [/shopee/i, '#F97316'],
  [/tokopedia/i, '#22C55E'],
  [/whatsapp/i, '#25D366'],
  [/instagram|ig\b/i, '#E1306C'],
  [/web|online/i, '#6366F1'],
  [/normal|offline|store|pos/i, '#0EA5E9'],
];

export function channelColor(tag: string | null): string {
  if (!tag) return '#9CA3AF';
  for (const [pattern, color] of CHANNEL_COLORS) {
    if (pattern.test(tag)) return color;
  }
  return '#9CA3AF';
}

export const fmtIdr = (v: string | number | null | undefined): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v ?? 0));

/** Compact IDR for dense figures: Rp 18.4M, Rp 970K, Rp 0. */
export const fmtIdrCompact = (v: string | number | null | undefined): string => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}K`;
  return `Rp ${Math.round(n)}`;
};

export const fmtDate = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
