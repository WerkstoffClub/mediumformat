import { api } from './client';

export type VoucherKind = 'PERCENT' | 'FIXED_IDR';

export interface Voucher {
  id: string;
  code: string;
  kind: VoucherKind;
  value: number;
  minOrderIdr: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VoucherList {
  items: Voucher[];
  total: number;
  page: number;
  limit: number;
}

export const listVouchers = (
  p: { page?: number; limit?: number; q?: string; status?: 'active' | 'scheduled' | 'expired' | 'disabled' } = {},
) => api.get<VoucherList>('/vouchers', { params: p }).then(r => r.data);

export const getVoucher = (id: string) =>
  api.get<Voucher>(`/vouchers/${id}`).then(r => r.data);

export const createVoucher = (body: Omit<Voucher, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) =>
  api.post<Voucher>('/vouchers', body).then(r => r.data);

export const updateVoucher = (id: string, body: Partial<Voucher>) =>
  api.patch<Voucher>(`/vouchers/${id}`, body).then(r => r.data);

export const deleteVoucher = (id: string) =>
  api.delete(`/vouchers/${id}`).then(r => r.data);

export type ValidateVoucherResp =
  | { valid: true; discountIdr: number }
  | { valid: false; discountIdr: 0; reason: string };

/** Validate a voucher against the current cart subtotal.
 *  Uses the public storefront endpoint so the same logic runs on the
 *  storefront and in the register — no separate rules to keep in sync. */
export const validateVoucher = (code: string, subtotalIdr: number) =>
  api
    .post<ValidateVoucherResp>('/storefront/vouchers/validate', { code, subtotalIdr })
    .then(r => r.data);
