# Deploying the Medium Format prototype → mediumformat.info

Static, self-contained HTML prototype (43 pages + assets). Only external
dependency is Google Fonts. Target: the VPS at **vps.lacak.live**, served as
**https://mediumformat.info**.

## What ships (the web root)
```
index.html            # prototype hub
404.html              # branded not-found
mockup-*.html         # 42 screens (desktop + -mobile)
favicon.svg  robots.txt  sitemap.xml  site.webmanifest
design-system/        # tokens.css, tokens.json, DESIGN reference
```

## What I need from you (the credentials mentioned)
1. **SSH access** to the VPS: host (`vps.lacak.live` or its IP), username, port, and
   whether that user has `sudo` (needed once, for nginx + certbot).
2. **DNS control** for `mediumformat.info` — I'll point an `A`/`AAAA` record at the VPS,
   or tell me the VPS public IP and I'll give you the exact records to add.
3. Confirm the web server: this kit assumes **nginx**. A **Caddy** alternative is trivial
   if you prefer auto-HTTPS with no certbot (say the word).

Put SSH details in `deploy/deploy.env` (copy from `deploy.env.example`) — it's gitignored.

---

## One-time server setup (run on the VPS, needs sudo)

```bash
# 1. Packages
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx rsync

# 2. Web root + certbot ACME dir
sudo mkdir -p /var/www/mediumformat.info /var/www/certbot
sudo chown -R "$USER":www-data /var/www/mediumformat.info

# 3. Install the server block
sudo cp deploy/nginx/mediumformat.info.conf /etc/nginx/sites-available/mediumformat.info
sudo ln -sf /etc/nginx/sites-available/mediumformat.info /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## DNS
Point the domain at the VPS **before** requesting the certificate:
```
A     mediumformat.info      -> <VPS_IPV4>
A     www.mediumformat.info  -> <VPS_IPV4>
```
Verify: `dig +short mediumformat.info` returns the VPS IP.

## TLS certificate
```bash
sudo certbot --nginx -d mediumformat.info -d www.mediumformat.info \
  --redirect --agree-tos -m you@example.com --no-eff-email
```
Certbot fills in the `ssl_certificate*` paths referenced in the conf and sets up auto-renewal.
(If you go the Caddy route instead, HTTPS is automatic and this step is skipped.)

---

## Deploy the site (from this repo, your machine)

```bash
cp deploy/deploy.env.example deploy/deploy.env    # then edit it
chmod +x deploy/deploy.sh

DRY=1 ./deploy/deploy.sh    # preview what would change
./deploy/deploy.sh          # ship it
```

`deploy.sh` rsyncs the web-root file set to `REMOTE_ROOT` (with `--delete`, so the
server mirrors exactly what ships — nothing else on the box is touched).

Re-run `./deploy/deploy.sh` any time to publish updates.

---

## Notes / follow-ups for the real product
- **CSP**: the prototype uses inline `<style>`/`<script>`, so the nginx CSP allows
  `'unsafe-inline'`. When the real app (React `apps/backoffice` + NestJS `apps/api`)
  replaces these static pages, switch to a nonce-based CSP.
- **Self-host fonts** to drop the Google Fonts dependency and tighten CSP + perf.
- **Pretty URLs** are enabled (`/mockup-cart` → `mockup-cart.html`); internal links use the
  `.html` form and also work.
- This kit deploys the **prototype**. Standing up the real API + admin app (Docker/Postgres,
  reverse-proxy `/api`) is a separate step — happy to scaffold that next.
