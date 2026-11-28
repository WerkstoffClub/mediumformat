import { api } from './client';
import type { Paged } from './ops';

export type WebOrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export interface WebOrderLine {
  id: string; releaseId: string; artist: string; title: string; format: string; unitPriceIdr: number; qty: number;
}

export interface WebOrder {
  id: string;
  number: string;
  status: WebOrderStatus;
  channel: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  fulfilment: 'PICKUP' | 'DELIVERY';
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  voucherCode: string | null;
  subtotalIdr: number;
  discountIdr: number;
  totalIdr: number;
  createdAt: string;
  lines: WebOrderLine[];
}

export const WEB_ORDER_STATUS_LABEL: Record<WebOrderStatus, string> = {
  PENDING: 'Awaiting payment', PAID: 'Paid', SHIPPED: 'Shipped', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export async function getWebOrders(f: { status?: WebOrderStatus; q?: string; page?: number; limit?: number }) {
  const res = await api.get<Paged<WebOrder> & { pending: number }>('/web-orders', { params: f });
  return res.data;
}

export async function setWebOrderStatus(id: string, status: WebOrderStatus) {
  const res = await api.patch<WebOrder>(`/web-orders/${id}/status`, { status });
  return res.data;
}

export interface NewOrderInput {
  customerName: string;
  email?: string;
  phone?: string;
  channel: string;
  fulfilment: 'PICKUP' | 'DELIVERY';
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  voucherCode?: string;
  paid?: boolean;
  lines: Array<{ releaseId: string; qty: number }>;
}

/** Back-office "New order": priced and stock-reserved server-side, stored in MF. */
export async function createBackofficeOrder(input: NewOrderInput) {
  const res = await api.post<WebOrder>('/web-orders', input);
  return res.data;
}
