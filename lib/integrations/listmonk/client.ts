// Listmonk REST API client. Self-hosted alongside the app.
// Docs: https://listmonk.app/docs/apis/

function authHeader() {
  const u = process.env.LISTMONK_USERNAME ?? "";
  const p = process.env.LISTMONK_PASSWORD ?? "";
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

function base() {
  return process.env.LISTMONK_BASE_URL ?? "http://localhost:9000";
}

async function lmFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Listmonk ${res.status}: ${await res.text()}`);
  return res.json();
}

export const listmonk = {
  upsertSubscriber(email: string, name?: string, listIds: number[] = []) {
    return lmFetch("/api/subscribers", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: name ?? email,
        status: "enabled",
        lists: listIds,
      }),
    });
  },
  createCampaign(input: {
    name: string;
    subject: string;
    bodyHtml: string;
    listIds: number[];
  }) {
    return lmFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        subject: input.subject,
        lists: input.listIds,
        type: "regular",
        content_type: "html",
        body: input.bodyHtml,
      }),
    });
  },
  startCampaign(id: number) {
    return lmFetch(`/api/campaigns/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "running" }),
    });
  },
};
