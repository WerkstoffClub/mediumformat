import { api } from './client';

/** Till sales recorded in the MF database (POST /pos/sales). */

export type PosSaleStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'VOIDED';
export type XenditChannel = 'QRIS' | 'VA' | 'EWALLET' | 'CARD';

export type PosPaymentInput =
  | { method: 'CASH'; tenderedIdr: number }
  | { method: 'EDC'; edcBank: string; approvalCode: string; rrn?: string; cardLast4?: string; cardScheme?: string }
  | { method: 'XENDIT'; channel: XenditChannel; ewallet?: string }
  | { method: 'OTHER'; otherMethodName: string };

export interface CreatePosSaleInput {
  lines: Array<{ releaseId: string; qty: number }>;
  discount?: { kind: 'PERCENT' | 'FIXED_IDR'; value: number };
  voucherCode?: string;
  customer?: { name?: string; phone?: string; email?: string };
  payment: PosPaymentInput;
}

export interface PosSaleLine { id: string; releaseId: string; artist: string; title: string; format: string; unitPriceIdr: number; qty: number }

export interface PosPayment {
  id: string;
  method: 'CASH' | 'EDC' | 'XENDIT' | 'OTHER';
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'VOIDED';
  amountIdr: number;
  tenderedIdr: number | null;
  changeIdr: number | null;
  edcBank: string | null;
  edcApprovalCode: string | null;
  edcRrn: string | null;
  cardScheme: string | null;
  cardLast4: string | null;
  xenditInvoiceUrl: string | null;
  xenditChannel: string | null;
  xenditPaidMethod: string | null;
  expiresAt: string | null;
  otherMethodName: string | null;
  paidAt: string | null;
}

export interface PosSale {
  id: string;
  number: string;
  status: PosSaleStatus;
  subtotalIdr: number;
  discountIdr: number;
  taxIdr: number;
  totalIdr: number;
  voucherCode: string | null;
  customerName: string | null;
  paidAt: string | null;
  createdAt: string;
  lines: PosSaleLine[];
  payments: PosPayment[];
}

export async function createPosSale(input: CreatePosSaleInput): Promise<PosSale> {
  return (await api.post<PosSale>('/pos/sales', input)).data;
}

export async function getPosSale(id: string): Promise<PosSale> {
  return (await api.get<PosSale>(`/pos/sales/${id}`)).data;
}

export async function voidPosSale(id: string): Promise<PosSale> {
  return (await api.post<PosSale>(`/pos/sales/${id}/void`)).data;
}

/** The API's message for a failed request, in words a cashier can act on. */
export function saleErrorMessage(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  const msg = res?.data?.message;
  const text = Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : null;
  if (res?.status === 501) return 'Xendit is not set up yet. Use EDC, cash or another method.';
  if (text) return text;
  if (!res) return 'Could not reach the server. Check the connection and try again.';
  return 'The sale could not be recorded. Try again.';
}
