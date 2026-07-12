import { api } from './client';

export type PoStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PoLine {
  id?: string;
  releaseId?: string | null;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCostIdr: number;
  totalIdr: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string | null;
  supplierName: string;
  status: PoStatus;
  subtotalIdr: number;
  taxIdr: number;
  totalIdr: number;
  orderedAt?: string | null;
  etaAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  sourceBillId?: string | null;
  lines: PoLine[];
  createdAt: string;
  updatedAt: string;
}

interface PoList {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
}

export const listPos = (p: { page?: number; limit?: number; status?: PoStatus; q?: string } = {}) =>
  api.get<PoList>('/purchase-orders', { params: p }).then(r => r.data);

export const getPo = (id: string) =>
  api.get<PurchaseOrder>(`/purchase-orders/${id}`).then(r => r.data);

export const createPo = (body: {
  supplierName: string;
  supplierId?: string;
  etaAt?: string;
  orderedAt?: string;
  notes?: string;
  lines: Array<Pick<PoLine, 'description' | 'qtyOrdered' | 'unitCostIdr' | 'releaseId'>>;
}) => api.post<PurchaseOrder>('/purchase-orders', body).then(r => r.data);

export const updatePo = (id: string, body: Partial<PurchaseOrder>) =>
  api.patch<PurchaseOrder>(`/purchase-orders/${id}`, body).then(r => r.data);

export const receivePo = (id: string, lines: Array<{ id: string; qtyReceived: number }>) =>
  api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { lines }).then(r => r.data);

export const cancelPo = (id: string) =>
  api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then(r => r.data);

export const syncPosFromDealpos = () =>
  api.post<{ created: number }>('/purchase-orders/sync-from-dealpos').then(r => r.data);
