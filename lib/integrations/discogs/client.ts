// Discogs API client. Single-shop auth via Personal Access Token.
// Docs: https://www.discogs.com/developers
//
// Used for:
//   - Release metadata lookup (by id, by barcode, free-text)
//   - Marketplace listings management (create / update / delete / list)
//   - Marketplace orders (poll, update status, message buyer)

const BASE = "https://api.discogs.com";

interface DiscogsConfig {
  pat: string;
  username: string;
  userAgent: string;
}

function getConfig(): DiscogsConfig {
  return {
    pat: process.env.DISCOGS_PAT ?? "",
    username: process.env.DISCOGS_USERNAME ?? "",
    userAgent:
      process.env.DISCOGS_USER_AGENT ??
      "MediumFormatAdmin/0.1 +https://mediumformat.info",
  };
}

async function discogsFetch(path: string, init: RequestInit = {}) {
  const cfg = getConfig();
  if (!cfg.pat) throw new Error("DISCOGS_PAT missing");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Discogs token=${cfg.pat}`,
      "User-Agent": cfg.userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Discogs ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const discogs = {
  // Metadata
  getRelease(id: number) {
    return discogsFetch(`/releases/${id}`);
  },
  searchByBarcode(barcode: string) {
    return discogsFetch(
      `/database/search?barcode=${encodeURIComponent(barcode)}&type=release`,
    );
  },
  search(query: string) {
    return discogsFetch(
      `/database/search?q=${encodeURIComponent(query)}&type=release&per_page=15`,
    );
  },

  // Marketplace - listings
  createListing(payload: Record<string, unknown>) {
    return discogsFetch("/marketplace/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateListing(listingId: number, payload: Record<string, unknown>) {
    return discogsFetch(`/marketplace/listings/${listingId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteListing(listingId: number) {
    return discogsFetch(`/marketplace/listings/${listingId}`, { method: "DELETE" });
  },
  inventory(page = 1) {
    const cfg = getConfig();
    if (!cfg.username) throw new Error("DISCOGS_USERNAME missing");
    return discogsFetch(
      `/users/${cfg.username}/inventory?page=${page}&per_page=100`,
    );
  },

  // Marketplace - orders
  listOrders(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return discogsFetch(`/marketplace/orders${q}`);
  },
  getOrder(id: string) {
    return discogsFetch(`/marketplace/orders/${id}`);
  },
  updateOrder(id: string, payload: Record<string, unknown>) {
    return discogsFetch(`/marketplace/orders/${id}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  orderMessages(id: string) {
    return discogsFetch(`/marketplace/orders/${id}/messages`);
  },
  postOrderMessage(id: string, message: string, status?: string) {
    return discogsFetch(`/marketplace/orders/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, status }),
    });
  },
};
