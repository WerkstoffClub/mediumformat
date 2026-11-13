import { callbackTokenValid, invoicePaymentMethods, parseInvoiceEvent } from './xendit.client';

describe('invoicePaymentMethods', () => {
  it('maps each register family to Xendit invoice methods', () => {
    expect(invoicePaymentMethods('QRIS')).toEqual(['QRIS']);
    expect(invoicePaymentMethods('CARD')).toEqual(['CREDIT_CARD']);
    expect(invoicePaymentMethods('VA')).toContain('BCA');
    expect(invoicePaymentMethods('EWALLET', 'ShopeePay')).toEqual(['SHOPEEPAY']);
  });
  it('falls back to every e-wallet plus QRIS for GoPay', () => {
    expect(invoicePaymentMethods('EWALLET', 'GoPay')).toEqual(['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA', 'QRIS']);
  });
});

describe('parseInvoiceEvent', () => {
  it('reads a paid invoice callback', () => {
    expect(parseInvoiceEvent({
      id: 'inv_1', external_id: 'POS-261113-ABCDE', status: 'PAID',
      payment_method: 'QR_CODE', payment_channel: 'QRIS', paid_at: '2026-11-13T06:00:00.000Z', paid_amount: 538350,
    })).toEqual({
      invoiceId: 'inv_1', externalId: 'POS-261113-ABCDE', status: 'PAID', paidMethod: 'QR_CODE · QRIS',
      paidAt: new Date('2026-11-13T06:00:00.000Z'), paidAmount: 538350,
    });
  });
  it('treats SETTLED as paid and keeps EXPIRED', () => {
    expect(parseInvoiceEvent({ id: 'i', external_id: 'e', status: 'SETTLED' })?.status).toBe('PAID');
    expect(parseInvoiceEvent({ id: 'i', external_id: 'e', status: 'EXPIRED' })?.status).toBe('EXPIRED');
  });
  it('ignores bodies that are not invoice events', () => {
    expect(parseInvoiceEvent({ event: 'payment.succeeded' })).toBeNull();
    expect(parseInvoiceEvent(null)).toBeNull();
  });
});

describe('callbackTokenValid', () => {
  it('accepts only the exact token', () => {
    expect(callbackTokenValid('secret-token', 'secret-token')).toBe(true);
    expect(callbackTokenValid('secret-tokem', 'secret-token')).toBe(false);
    expect(callbackTokenValid('short', 'secret-token')).toBe(false);
    expect(callbackTokenValid(undefined, 'secret-token')).toBe(false);
    expect(callbackTokenValid('x', undefined)).toBe(false);
  });
});
