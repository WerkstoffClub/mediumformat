# DNS & Cloudflare for `mediumformat.info`

> Do this **before** running `./scripts/init-letsencrypt.sh`.
> Cloudflare cannot be automated by this app — you do this by hand once.

## 1. Get the domain into Cloudflare

- **If unregistered**: register `mediumformat.info` at Cloudflare Registrar
  (at-cost, ≈ $9/year for `.info`).
- **If registered elsewhere**: Cloudflare → Add Site → Free plan → change
  nameservers at the current registrar.

## 2. DNS records

Cloudflare → DNS → Records:

| Type | Name | Content | Proxy | Why |
|---|---|---|---|---|
| A | `mediumformat.info` | `31.97.220.192` | Proxied (orange) | apex |
| A | `www` | `31.97.220.192` | Proxied (orange) | `www` → apex |
| A | `mail` | `31.97.220.192` | **DNS only (grey)** | Listmonk; LE HTTP-01 needs direct origin |
| TXT | `mediumformat.info` | `v=spf1 -all` | DNS only | placeholder until SMTP wiring |

`vps.rocketsystem.cloud` itself is set by the VPS provider — don't try to
manage that record.

## 3. SSL/TLS

- **Overview → "Full (strict)"** — Cloudflare ↔ origin uses the real
  Let's Encrypt cert we install at the VPS.
- **Edge Certificates → Always Use HTTPS: On**
- **Min TLS 1.2**
- **Automatic HTTPS Rewrites: On**
- **HSTS** — turn on **after** confirming the site works.

## 4. Caching

- **Caching → Configuration → Browser Cache TTL**: `Respect Existing Headers`
- Add a **Cache Rule** to bypass cache for:
  - `/admin/*`
  - `/api/*`
  - `/account/*`
  - `/cart`
  - `/checkout`

Without that rule, admin actions get served stale from Cloudflare.

## 5. Performance

- **Speed → Optimization → Auto Minify**: HTML, CSS, JS

## 6. Security

- **Security → Bots → Bot Fight Mode: On**
- **WAF → Managed Rules**: enable Cloudflare Managed Ruleset (defaults)
- **Security Level**: Medium

## 7. Verify

```bash
dig +short mediumformat.info
dig +short www.mediumformat.info
dig +short mail.mediumformat.info
# All three should resolve. The first two via Cloudflare's edge IPs,
# the third directly to 31.97.220.192.
```

If `mail.mediumformat.info` resolves to Cloudflare IPs instead, you've
left the orange cloud on — fix that before running certbot or HTTP-01
will fail.
