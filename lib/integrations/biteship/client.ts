// Biteship API. Indonesian shipping aggregator (JNE, J&T, SiCepat, Anteraja,
// GoSend, GrabExpress, Pos Indonesia, etc.) including label printing.
// Docs: https://biteship.com/en/docs/api

const BASE = "https://api.biteship.com";

function authHeader() {
  const key = process.env.BITESHIP_API_KEY ?? "";
  if (!key) throw new Error("BITESHIP_API_KEY missing");
  return key;
}

async function biteshipFetch(path: string, init: RequestInit = {}) {
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
    throw new Error(`Biteship ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const biteship = {
  rates(payload: Record<string, unknown>) {
    return biteshipFetch("/v1/rates/couriers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createOrder(payload: Record<string, unknown>) {
    return biteshipFetch("/v1/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  trackOrder(id: string) {
    return biteshipFetch(`/v1/orders/${id}`);
  },
  cancelOrder(id: string, reason: string) {
    return biteshipFetch(`/v1/orders/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ cancellation_reason: reason }),
    });
  },
};
