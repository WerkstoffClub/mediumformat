import { api } from './client';

export type DealerStatus = 'PROSPECT' | 'ONBOARDING' | 'LIVE' | 'PAUSED';

export interface Dealer {
  id: string; slug: string; name: string; kind: string | null; area: string | null; city: string;
  status: DealerStatus; feePct: string; contact: string | null; notes: string | null; lastSyncAt: string | null;
}
export interface DealerRow extends Dealer { sales30d: number; txns30d: number; }
export interface DealerDetail extends DealerRow {
  items30d: number; avgBasket: number; salesToday: number; txnsToday: number;
  paymentMix: { payment: string; txns: number; amount: number }[];
}
export type DealerInput = Partial<Omit<Dealer, 'id' | 'slug' | 'lastSyncAt' | 'feePct'>> & { feePct?: number };

export interface DealerTxn {
  id: string; txnNo: string; occurredAt: string; items: { title: string; qty: number; priceIdr: number }[];
  itemCount: number; payment: string; cashier: string | null; amountIdr: number; status: 'PAID' | 'REFUNDED';
}
export interface DealersSummary {
  days: number; live: number; txns: number; amount: number; avgBasket: number;
  series: { date: string; txns: number; amount: number }[];
  byDealer: { name: string; txns: number; amount: number }[];
}

const d = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data);

export const listDealers = () => d(api.get<DealerRow[]>('/dealers'));
export const getDealer = (id: string) => d(api.get<DealerDetail>(`/dealers/${id}`));
export const createDealer = (b: DealerInput) => d(api.post<Dealer>('/dealers', b));
export const updateDealer = (id: string, b: DealerInput) => d(api.patch<Dealer>(`/dealers/${id}`, b));
export const deleteDealer = (id: string) => d(api.delete(`/dealers/${id}`));
export const listDealerTxns = (id: string, p: { q?: string; page?: number; limit?: number } = {}) =>
  d(api.get<{ items: DealerTxn[]; total: number; page: number; limit: number }>(`/dealers/${id}/transactions`, { params: p }));
export const dealersSummary = (days = 30) => d(api.get<DealersSummary>('/dealers/summary', { params: { days } }));

export const DEALER_STATUS_LABEL: Record<DealerStatus, string> = {
  PROSPECT: 'Prospect', ONBOARDING: 'Onboarding', LIVE: 'Live', PAUSED: 'Paused',
};
