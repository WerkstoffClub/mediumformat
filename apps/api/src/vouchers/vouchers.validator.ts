import { Voucher } from '@prisma/client';

export type ValidatorResult =
  | { valid: true; discountIdr: number }
  | { valid: false; discountIdr: 0; reason: string };

export function validateVoucher(
  v: Pick<
    Voucher,
    'kind' | 'value' | 'minOrderIdr' | 'startsAt' | 'expiresAt' | 'usageLimit' | 'usageCount' | 'active'
  >,
  subtotalIdr: number,
  now: Date = new Date(),
): ValidatorResult {
  if (!v.active) return { valid: false, discountIdr: 0, reason: 'inactive' };
  if (v.startsAt && v.startsAt > now) return { valid: false, discountIdr: 0, reason: 'not_started' };
  if (v.expiresAt && v.expiresAt < now) return { valid: false, discountIdr: 0, reason: 'expired' };
  if (v.usageLimit != null && v.usageCount >= v.usageLimit) {
    return { valid: false, discountIdr: 0, reason: 'limit_reached' };
  }
  if (subtotalIdr < v.minOrderIdr) return { valid: false, discountIdr: 0, reason: 'below_minimum' };
  const raw =
    v.kind === 'PERCENT'
      ? Math.round(subtotalIdr * (v.value / 100))
      : v.value;
  return { valid: true, discountIdr: Math.min(raw, subtotalIdr) };
}
