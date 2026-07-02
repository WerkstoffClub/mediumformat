import { api } from './client';

export interface FinanceFilters {
  from: string;
  to: string;
  outlet?: string;
  tag?: string;
}

export interface FinanceSummary {
  from: string;
  to: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  avgOrderValue: number;
  cogs: number;
  grossMargin: number;
  grossMarginPct: number | null;
}

export interface TimeseriesRow {
  period: string;
  revenue: number;
  orders: number;
  cogs: number;
  margin: number;
}

export interface PaymentRow {
  method: string;
  amount: number;
  count: number;
  share: number | null;
}

export interface MarginRow {
  group: string;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number | null;
  unitsSold: number;
}

export interface SyncEntityState {
  entity: string;
  status: string;
  message: string | null;
  lastRunAt: string | null;
}

export type Granularity = 'day' | 'week' | 'month';
export type MarginGroup = 'release' | 'category' | 'tag';
export type ExportReport = 'summary' | 'timeseries' | 'payments' | 'margins';

const params = (filters: FinanceFilters, extra: Record<string, string> = {}) => ({
  from: filters.from,
  to: filters.to,
  ...(filters.outlet ? { outlet: filters.outlet } : {}),
  ...(filters.tag ? { tag: filters.tag } : {}),
  ...extra,
});

export async function getSummary(filters: FinanceFilters): Promise<FinanceSummary> {
  const res = await api.get<FinanceSummary>('/finance/summary', { params: params(filters) });
  return res.data;
}

export async function getTimeseries(filters: FinanceFilters, granularity: Granularity): Promise<TimeseriesRow[]> {
  const res = await api.get<TimeseriesRow[]>('/finance/timeseries', { params: params(filters, { granularity }) });
  return res.data;
}

export async function getPayments(filters: FinanceFilters): Promise<PaymentRow[]> {
  const res = await api.get<PaymentRow[]>('/finance/payments', { params: params(filters) });
  return res.data;
}

export async function getMargins(filters: FinanceFilters, groupBy: MarginGroup): Promise<MarginRow[]> {
  const res = await api.get<MarginRow[]>('/finance/margins', { params: params(filters, { groupBy }) });
  return res.data;
}

export async function getFilterOptions(): Promise<{ outlets: string[]; tags: string[] }> {
  const res = await api.get<{ outlets: string[]; tags: string[] }>('/finance/filters');
  return res.data;
}

export async function getSyncStatus(): Promise<{ running: boolean; entities: SyncEntityState[] }> {
  const res = await api.get<{ running: boolean; entities: SyncEntityState[] }>('/dealpos/sync/status');
  return res.data;
}

export async function runSync(): Promise<void> {
  await api.post('/dealpos/sync');
}

/** Download a CSV export through the authenticated client. */
export async function downloadExport(
  report: ExportReport,
  filters: FinanceFilters,
  extra: Record<string, string> = {},
): Promise<void> {
  const res = await api.get<Blob>('/finance/export', {
    params: params(filters, { report, ...extra }),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finance-${report}-${filters.from}-to-${filters.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
