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
  customerName: string;
  email: string;
  phone: string;
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
