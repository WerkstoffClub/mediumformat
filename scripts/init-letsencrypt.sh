#!/usr/bin/env bash
# One-shot bootstrap for Let's Encrypt certificates. Run after DNS is pointing
# at the VPS but before the rest of the stack is up.
#
# Usage:
#   ADMIN_EMAIL=you@example.com ./scripts/init-letsencrypt.sh

set -euo pipefail

DOMAINS=("mediumformat.info" "www.mediumformat.info" "mail.mediumformat.info")
EMAIL="${ADMIN_EMAIL:?set ADMIN_EMAIL=...}"

# Stop nginx if running so port 80 is free for standalone challenge.
docker compose stop nginx 2>/dev/null || true

docker run --rm \
  -v "$(pwd)/certbot-certs:/etc/letsencrypt" \
  -v "$(pwd)/certbot-www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot:latest certonly --standalone \
  --email "$EMAIL" --agree-tos --no-eff-email \
  $(printf -- "-d %s " "${DOMAINS[@]}")

docker compose up -d
