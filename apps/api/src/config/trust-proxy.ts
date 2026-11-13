// Proxy hops between the internet and the API (prod, dd-vps):
// cloudflared tunnel -> Caddy -> API. Express trusts the nearest N hops, so
// req.ip is the real client. Never `true`: that trusts a client-supplied
// X-Forwarded-For and lets anyone dodge per-IP throttling.
// Change this if a hop is added or removed (e.g. back to Traefik -> Caddy).
export const TRUST_PROXY_HOPS = 2;
