import { api } from './client';
import type { ImportOrigin, ImportStatus } from './imports';

/** Prisma stores this as a plain string (default "open"), set to "allocated"
 *  by POST /consolidations/:id/allocate — mirrors apps/api's
 *  ConsolidationsService.create/allocate. */
export type ConsolidationStatus = 'open' | 'allocated';

export interface ConsolidationRow {
  id: string;
  number: string;
  forwarderName: string;
  forwarderInvoiceIdr: string | number;
  status: ConsolidationStatus;
  createdAt: string;
  _count: { orders: number };
}

/** Per-line freight split, as returned nested under an attached order —
 *  mirrors ConsolidationsService.findOne's `lines` select. */
export interface ConsolidationOrderLine {
  id: string;
  title: string;
  artist: string;
  weightKg: string | number;
  qty: number;
  allocatedForwarderIdr: string | number;
  landedCostIdr: string | number;
}

export interface AttachedOrder {
  id: string;
  number: string;
  vendorName: string;
  origin: ImportOrigin;
  currency: string;
  status: ImportStatus;
  subtotalNative: string | number;
  lines: ConsolidationOrderLine[];
}

export interface ConsolidationDetail {
  id: string;
  number: string;
  forwarderName: string;
  forwarderInvoiceIdr: string | number;
  weightKgTotal: string | number | null;
  trackingRaw: string | null;
  status: ConsolidationStatus;
  createdAt: string;
  orders: AttachedOrder[];
  totals: { orderCount: number; totalUnits: number; totalWeightKg: number };
}

export interface CreateConsolidationInput {
  forwarderName: string;
  trackingRaw?: string;
}

export interface UpdateConsolidationInput {
  forwarderName?: string;
  forwarderInvoiceIdr?: number;
  weightKgTotal?: number;
  trackingRaw?: string;
  status?: string;
}

export interface AllocateConsolidationResult extends ConsolidationDetail {
  allocation: { totalFreightIdr: number; lineCount: number; orderCount: number; note?: string };
}

export const getConsolidations = () =>
  api.get<ConsolidationRow[]>('/consolidations').then(r => r.data);

export const getConsolidation = (id: string) =>
  api.get<ConsolidationDetail>(`/consolidations/${id}`).then(r => r.data);

export const createConsolidation = (body: CreateConsolidationInput) =>
  api.post<ConsolidationDetail>('/consolidations', body).then(r => r.data);

export const updateConsolidation = (id: string, body: UpdateConsolidationInput) =>
  api.put<ConsolidationDetail>(`/consolidations/${id}`, body).then(r => r.data);

export const attachOrder = (id: string, importOrderId: string) =>
  api.post<ConsolidationDetail>(`/consolidations/${id}/orders`, { importOrderId }).then(r => r.data);

export const detachOrder = (id: string, orderId: string) =>
  api.delete<ConsolidationDetail>(`/consolidations/${id}/orders/${orderId}`).then(r => r.data);

/** Splits the forwarder invoice across every attached line by weight, then
 *  re-prices the attached orders — see ConsolidationsService.allocate. */
export const allocateConsolidation = (id: string) =>
  api.post<AllocateConsolidationResult>(`/consolidations/${id}/allocate`, {}).then(r => r.data);
