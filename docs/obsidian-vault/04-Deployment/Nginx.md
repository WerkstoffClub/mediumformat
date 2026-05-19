# Nginx

Config lives in:

- `nginx/nginx.conf` — global config (workers, mime, gzip, proxy headers)
- `nginx/conf.d/mediumformat.conf` — server blocks

Mounted into the container read-only via `docker-compose.yml`.

## Server blocks

### Port 80 — HTTP → HTTPS redirect + ACME

```nginx
server {
  listen 80;
  server_name mediumformat.info www.mediumformat.info
              admin.mediumformat.info mail.mediumformat.info;

  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 301 https://$host$request_uri; }
}
```

### Port 443 — public site + admin

```nginx
server {
  listen 443 ssl;
  http2 on;
  server_name mediumformat.info www.mediumformat.info;

  ssl_certificate     /etc/letsencrypt/live/mediumformat.info/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/mediumformat.info/privkey.pem;
  # ... HSTS, X-Frame-Options, Referrer-Policy
  location / {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Port 443 — Listmonk admin (`mail.mediumformat.info`)

Same cert (SAN), proxies to `listmonk:9000`. Behind basic auth — no need for
extra path-based gating.

## Global config (`nginx/nginx.conf`)

- `worker_connections 2048`
- `client_max_body_size 25m` — image uploads
- Proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`
- gzip on for text + JSON + SVG (>= 1 KB)
- `server_tokens off`

## Reload after config changes

```bash
docker compose exec nginx nginx -t        # validate
docker compose exec nginx nginx -s reload # apply
```

If certs are renewed, nginx serves the new cert by path automatically — no
reload required. We send SIGHUP only if you swap configs.
