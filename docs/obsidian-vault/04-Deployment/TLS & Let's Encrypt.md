# TLS & Let's Encrypt

## Strategy

- **Cloudflare ↔ browser**: TLS terminated at Cloudflare's edge.
- **Cloudflare ↔ origin**: TLS terminated at our nginx, using a **real
  Let's Encrypt certificate** (Cloudflare SSL/TLS = `Full (strict)` requires
  this).
- **`mail.mediumformat.info`**: grey-cloud (DNS only), so the browser hits
  nginx directly using the same Let's Encrypt cert.

The certbot container runs as a sidecar with a 12-hour renew loop:

```yaml
certbot:
  image: certbot/certbot:latest
  volumes:
    - certbot-www:/var/www/certbot
    - certbot-certs:/etc/letsencrypt
  entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait $${!}; done"
```

nginx serves `/.well-known/acme-challenge/` from the shared `certbot-www`
volume.

## Initial issuance — `scripts/init-letsencrypt.sh`

```bash
ADMIN_EMAIL=admin@mediumformat.info ./scripts/init-letsencrypt.sh
```

What it does:

1. `docker compose stop nginx` so port 80 is free.
2. Runs a one-shot `certbot certonly --standalone` for the three SANs:
   - `mediumformat.info`
   - `www.mediumformat.info`
   - `mail.mediumformat.info`
3. `docker compose up -d` brings the stack back, with certs now in
   `certbot-certs` (mounted at `/etc/letsencrypt` inside nginx).

> ⚠️ The challenge is on **port 80 of the VPS directly** — the `mail`
> subdomain MUST be DNS-only at Cloudflare or this fails.

## Renewal

The certbot loop runs `certbot renew --webroot` every 12 hours. Renewals
happen ~30 days before expiry. nginx reads certs by path with no reload,
so renewal is fully hands-off; we send a SIGHUP to nginx after renew via
a deploy-script post-hook (TBD — not yet wired).

## Files in production

```
certbot-certs:/etc/letsencrypt/live/mediumformat.info/
  ├── fullchain.pem       ← nginx ssl_certificate
  ├── privkey.pem         ← nginx ssl_certificate_key
  ├── cert.pem
  └── chain.pem
```

## If things go wrong

```bash
docker compose run --rm certbot certificates           # list certs
docker compose run --rm certbot renew --dry-run        # test renewal
docker compose logs --tail=200 certbot
docker compose logs --tail=200 nginx
```

For a full reset:

```bash
docker compose stop nginx
docker run --rm -p 80:80 -v "$(pwd)/certbot-certs:/etc/letsencrypt" \
  -v "$(pwd)/certbot-www:/var/www/certbot" \
  certbot/certbot:latest delete --cert-name mediumformat.info
ADMIN_EMAIL=admin@mediumformat.info ./scripts/init-letsencrypt.sh
```
