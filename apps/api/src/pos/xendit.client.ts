import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { timingSafeEqual } from 'node:crypto';

/**
 * Xendit Invoice API (https://developers.xendit.co/api-reference/#create-invoice).
 * One invoice covers every channel (QRIS, VA, e-wallet, card); the customer pays
 * on the hosted page and Xendit calls the invoice webhook. Not configured until
 * XENDIT_SECRET_KEY and XENDIT_CALLBACK_TOKEN are set.
 */

export type XenditChannel = 'QRIS' | 'VA' | 'EWALLET' | 'CARD';

const VA_BANKS = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'BSI', 'CIMB'];
const EWALLETS = ['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'];

/** Invoice `payment_methods` for the family the cashier picked. */
export function invoicePaymentMethods(channel: XenditChannel, ewallet?: string): string[] {
  switch (channel) {
    case 'QRIS': return ['QRIS'];
    case 'VA': return VA_BANKS;
    case 'CARD': return ['CREDIT_CARD'];
    case 'EWALLET': {
      const code = ewallet?.trim().toUpperCase().replace(/\s+/g, '');
      // GoPay is not an Xendit e-wallet; it (and any other app) can pay the QRIS.
      return code && EWALLETS.includes(code) ? [code] : [...EWALLETS, 'QRIS'];
    }
  }
}

export interface XenditInvoice {
  id: string;
  externalId: string;
  status: string;
  invoiceUrl: string;
  expiresAt: Date | null;
}

export interface XenditInvoiceEvent {
  invoiceId: string;
  externalId: string;
  status: 'PAID' | 'EXPIRED' | 'OTHER';
  paidMethod: string | null;
  paidAt: Date | null;
  paidAmount: number | null;
}

/** Normalise the invoice webhook body; null when it isn't an invoice event. */
export function parseInvoiceEvent(body: unknown): XenditInvoiceEvent | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.id !== 'string' || typeof b.external_id !== 'string' || typeof b.status !== 'string') return null;
  const s = b.status.toUpperCase();
  const status = s === 'PAID' || s === 'SETTLED' ? 'PAID' : s === 'EXPIRED' ? 'EXPIRED' : 'OTHER';
  const method = [b.payment_method, b.payment_channel].filter(v => typeof v === 'string' && v).join(' · ');
  const paidAt = typeof b.paid_at === 'string' ? new Date(b.paid_at) : null;
  return {
    invoiceId: b.id,
    externalId: b.external_id,
    status,
    paidMethod: method || null,
    paidAt: paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null,
    paidAmount: typeof b.paid_amount === 'number' ? b.paid_amount : null,
  };
}

/** Constant-time check of the `x-callback-token` header. */
export function callbackTokenValid(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class XenditClient {
  private readonly logger = new Logger(XenditClient.name);
  private readonly base = process.env.XENDIT_API_URL ?? 'https://api.xendit.co';

  get configured(): boolean {
    return Boolean(process.env.XENDIT_SECRET_KEY && process.env.XENDIT_CALLBACK_TOKEN);
  }

  get callbackToken(): string | undefined {
    return process.env.XENDIT_CALLBACK_TOKEN;
  }

  private auth() {
    return { username: process.env.XENDIT_SECRET_KEY ?? '', password: '' };
  }

  async createInvoice(input: {
    externalId: string; amountIdr: number; description: string;
    channel: XenditChannel; ewallet?: string; durationSec?: number;
    customer?: { name?: string | null; email?: string | null; phone?: string | null };
  }): Promise<XenditInvoice> {
    const customer: Record<string, string> = {};
    if (input.customer?.name) customer.given_names = input.customer.name;
    if (input.customer?.email) customer.email = input.customer.email;
    if (input.customer?.phone) customer.mobile_number = input.customer.phone;
    const res = await axios.post(`${this.base}/v2/invoices`, {
      external_id: input.externalId,
      amount: input.amountIdr,
      currency: 'IDR',
      description: input.description,
      invoice_duration: input.durationSec ?? 15 * 60,
      payment_methods: invoicePaymentMethods(input.channel, input.ewallet),
      ...(Object.keys(customer).length ? { customer } : {}),
    }, { auth: this.auth(), timeout: 20_000 });
    const d = res.data as Record<string, unknown>;
    return {
      id: String(d.id),
      externalId: String(d.external_id),
      status: String(d.status),
      invoiceUrl: String(d.invoice_url),
      expiresAt: typeof d.expiry_date === 'string' ? new Date(d.expiry_date) : null,
    };
  }

  /** Best effort: stop a pending invoice from being paid (sale voided at the till). */
  async expireInvoice(invoiceId: string): Promise<void> {
    try {
      await axios.post(`${this.base}/invoices/${encodeURIComponent(invoiceId)}/expire!`, {}, { auth: this.auth(), timeout: 15_000 });
    } catch (err) {
      this.logger.warn(`Could not expire Xendit invoice ${invoiceId}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
