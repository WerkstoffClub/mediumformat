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

# Use `docker compose run` so we inherit the same NAMED volumes
# (certbot-certs, certbot-www) that the long-running certbot service and
# the nginx service mount. A separate `docker run -v ./certbot-certs:...`
# binds the host path instead and the certs never reach nginx.
docker compose run --rm \
  -p 80:80 \
  --entrypoint certbot \
  certbot certonly --standalone \
    --email "$EMAIL" --agree-tos --no-eff-email --non-interactive \
    --keep-until-expiring \
    $(printf -- "-d %s " "${DOMAINS[@]}")

docker compose up -d
