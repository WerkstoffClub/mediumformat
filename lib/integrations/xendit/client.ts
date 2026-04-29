// Xendit Invoice API. Single unified checkout URL covering QRIS, e-wallets,
// VAs, cards, retail outlets, and ShopeePay.
// Docs: https://docs.xendit.co/

const BASE = "https://api.xendit.co";

function authHeader() {
  const key = process.env.XENDIT_SECRET_KEY ?? "";
  if (!key) throw new Error("XENDIT_SECRET_KEY missing");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function xenditFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Xendit ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface CreateInvoiceInput {
  externalId: string;
  amountIdr: number;
  description: string;
  customer: { email?: string; mobileNumber?: string; givenNames?: string };
  successRedirectUrl: string;
  failureRedirectUrl: string;
  invoiceDuration?: number;
}

export const xendit = {
  createInvoice(input: CreateInvoiceInput) {
    return xenditFetch("/v2/invoices", {
      method: "POST",
      body: JSON.stringify({
        external_id: input.externalId,
        amount: input.amountIdr,
        description: input.description,
        currency: "IDR",
        customer: input.customer,
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
        invoice_duration: input.invoiceDuration ?? 86_400,
      }),
    });
  },
  getInvoice(id: string) {
    return xenditFetch(`/v2/invoices/${id}`);
  },
  expireInvoice(id: string) {
    return xenditFetch(`/invoices/${id}/expire!`, { method: "POST" });
  },
};

// Webhook handler verifies Xendit's `x-callback-token` against
// XENDIT_WEBHOOK_TOKEN before trusting the body. See app/api/webhooks/xendit.
export function verifyXenditCallback(headerToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected) return false;
  return headerToken === expected;
}
