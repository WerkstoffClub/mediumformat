#!/usr/bin/env bash
# ==========================================================================
# Medium Format — static prototype deploy
# Syncs the web-root files to the VPS via rsync-over-SSH.
# Usage:  ./deploy/deploy.sh          (real deploy)
#         DRY=1 ./deploy/deploy.sh    (preview changes, no writes)
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Load config ---
if [ -f deploy/deploy.env ]; then
  set -a; . deploy/deploy.env; set +a
else
  echo "ERROR: deploy/deploy.env not found. Copy deploy/deploy.env.example and fill it in." >&2
  exit 1
fi
: "${SSH_HOST:?}"; : "${SSH_USER:?}"; : "${SSH_PORT:=22}"; : "${REMOTE_ROOT:?}"

# --- What ships (the web root). Everything else stays out. ---
INCLUDES=(
  index.html 404.html favicon.svg robots.txt sitemap.xml site.webmanifest
  "mockup-*.html"
  design-system
)

DRYFLAG=""
[ "${DRY:-0}" = "1" ] && DRYFLAG="--dry-run" && echo ">> DRY RUN (no files written)"

echo ">> Deploying to ${SSH_USER}@${SSH_HOST}:${REMOTE_ROOT}"
ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" "mkdir -p '${REMOTE_ROOT}'"

# Stage the exact file set so --delete only prunes within the web root.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for item in "${INCLUDES[@]}"; do
  # shellcheck disable=SC2086
  cp -R $item "$STAGE"/ 2>/dev/null || true
done

rsync -avz $DRYFLAG --delete \
  -e "ssh -p ${SSH_PORT}" \
  "$STAGE"/ \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_ROOT}/"

echo ">> Done. https://mediumformat.info/"
