#!/usr/bin/env bash
# One-shot VPS bootstrap for vps.rocketsystem.cloud (31.97.220.192).
# Run as root on a fresh Ubuntu/Debian box once mediumformat.info DNS
# already points at this server in Cloudflare.
#
# Idempotent — safe to re-run.
#
# Required env vars:
#   ADMIN_EMAIL  Let's Encrypt registration address (e.g. admin@mediumformat.info)
#   SSH_PUBKEY   Public key string to install for the deploy user
#                (e.g. 'ssh-ed25519 AAAA... your@laptop')
#
# Optional:
#   SEED_ADMIN_PASSWORD  if unset, will be auto-generated and printed once

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "must run as root" >&2; exit 1
fi

ADMIN_EMAIL="${ADMIN_EMAIL:?set ADMIN_EMAIL=admin@mediumformat.info}"
SSH_PUBKEY="${SSH_PUBKEY:?set SSH_PUBKEY=\"ssh-ed25519 AAAA... you@laptop\"}"

REPO_URL="https://github.com/werkstoffclub/mediumformat.git"
REPO_DIR="/opt/mediumformat"

log() { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }

# ---------------------------------------------------------------------------
log "1/9 apt update + upgrade"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get -yq upgrade
DEBIAN_FRONTEND=noninteractive apt-get -yq install \
  curl git ca-certificates openssl ufw dnsutils netcat-openbsd

# ---------------------------------------------------------------------------
log "2/9 deploy user + ssh key"
if ! id deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
fi
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$SSH_PUBKEY" /home/deploy/.ssh/authorized_keys \
  || echo "$SSH_PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# ---------------------------------------------------------------------------
log "3/9 ssh hardening (root + password login disabled)"
sed -i \
  -e 's|^#\?PermitRootLogin.*|PermitRootLogin no|' \
  -e 's|^#\?PasswordAuthentication.*|PasswordAuthentication no|' \
  -e 's|^#\?ChallengeResponseAuthentication.*|ChallengeResponseAuthentication no|' \
  /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd

# ---------------------------------------------------------------------------
log "4/9 ufw firewall (22, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---------------------------------------------------------------------------
log "5/9 docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker deploy
systemctl enable docker
systemctl start docker

# ---------------------------------------------------------------------------
log "6/9 working tree at $REPO_DIR"
install -d -m 755 -o deploy -g deploy "$REPO_DIR"
if [[ ! -d $REPO_DIR/.git ]]; then
  sudo -u deploy git clone "$REPO_URL" "$REPO_DIR"
fi
sudo -u deploy git -C "$REPO_DIR" fetch --all --prune
sudo -u deploy git -C "$REPO_DIR" checkout main
sudo -u deploy git -C "$REPO_DIR" pull --ff-only
cd "$REPO_DIR"

# ---------------------------------------------------------------------------
log "7/9 .env (generated secrets — saved to /root/mediumformat-secrets.txt)"
if [[ ! -f .env ]]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  LISTMONK_DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  LISTMONK_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-18)}"

  cp .env.example .env
  # Pin production values for the secrets we generated + the domain
  sed -i \
    -e "s|^NODE_ENV=.*|NODE_ENV=production|" \
    -e "s|^APP_URL=.*|APP_URL=https://mediumformat.info|" \
    -e "s|^PUBLIC_APP_URL=.*|PUBLIC_APP_URL=https://mediumformat.info|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://mediumformat:${POSTGRES_PASSWORD}@postgres:5432/mediumformat?schema=public|" \
    -e "s|^REDIS_URL=.*|REDIS_URL=redis://redis:6379|" \
    -e "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" \
    -e "s|^AUTH_URL=.*|AUTH_URL=https://mediumformat.info|" \
    -e "s|^SEED_ADMIN_EMAIL=.*|SEED_ADMIN_EMAIL=${ADMIN_EMAIL}|" \
    -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}|" \
    -e "s|^LISTMONK_BASE_URL=.*|LISTMONK_BASE_URL=http://listmonk:9000|" \
    -e "s|^LISTMONK_PASSWORD=.*|LISTMONK_PASSWORD=${LISTMONK_PASSWORD}|" \
    .env

  # Append the docker-compose-only vars that aren't in .env.example
  {
    echo ""
    echo "# --- Docker compose secrets ---"
    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
    echo "LISTMONK_DB_PASSWORD=${LISTMONK_DB_PASSWORD}"
  } >> .env

  chmod 600 .env
  chown deploy:deploy .env

  cat > /root/mediumformat-secrets.txt <<EOF
Medium Format — generated secrets (keep safe, this file is only on this VPS)
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Admin login:         https://mediumformat.info/admin/login
  email:             ${ADMIN_EMAIL}
  password:          ${SEED_ADMIN_PASSWORD}

Listmonk admin:      https://mail.mediumformat.info
  username:          admin
  password:          ${LISTMONK_PASSWORD}

Postgres password:   ${POSTGRES_PASSWORD}
Listmonk DB pass:    ${LISTMONK_DB_PASSWORD}
AUTH_SECRET:         ${AUTH_SECRET}

Full env file:       ${REPO_DIR}/.env
EOF
  chmod 600 /root/mediumformat-secrets.txt

  echo
  echo "============================================================"
  echo "  Generated secrets written to /root/mediumformat-secrets.txt"
  echo "  Save them somewhere safe NOW — they won't be regenerated."
  echo "============================================================"
fi

# ---------------------------------------------------------------------------
log "8/9 verify DNS points at this VPS"
THIS_IP="$(curl -fsS https://api.ipify.org || echo unknown)"
for host in mediumformat.info www.mediumformat.info mail.mediumformat.info; do
  resolved="$(getent hosts "$host" | awk '{print $1}' | head -1)"
  echo "  $host -> ${resolved:-<unresolved>}"
done
echo "  (this VPS public IP: $THIS_IP)"
echo "  Cloudflare-proxied records will not resolve to $THIS_IP — that's expected."
echo "  But mail.mediumformat.info MUST resolve directly to $THIS_IP (grey cloud)"
echo "  or the Let's Encrypt HTTP-01 challenge will fail."

# ---------------------------------------------------------------------------
log "9/9 TLS + compose up + migrate + seed"

# Issue certs only if they don't already exist in the named volume.
if ! docker compose run --rm --entrypoint test certbot \
       -f /etc/letsencrypt/live/mediumformat.info/fullchain.pem 2>/dev/null; then
  echo "  no cert yet, running init-letsencrypt"
  ADMIN_EMAIL="$ADMIN_EMAIL" bash scripts/init-letsencrypt.sh
else
  echo "  cert already present, skipping issuance"
fi

# Prefer the image pre-built by GitHub Actions; fall back to local build
# if the pull fails (private package without auth, or first deploy before
# the workflow has run).
if ! docker compose pull app worker 2>/dev/null; then
  echo "  pulling image failed — building locally instead"
  docker compose build app worker
fi

docker compose up -d
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed || true

echo
echo "============================================================"
echo "  Bootstrap complete."
echo "  Public site:   https://mediumformat.info"
echo "  Admin login:   https://mediumformat.info/admin/login"
echo "  Listmonk:      https://mail.mediumformat.info"
echo
echo "  Secrets:       /root/mediumformat-secrets.txt"
echo "  Env file:      ${REPO_DIR}/.env"
echo "  Logs:          docker compose logs --tail=200 -f app"
echo
echo "  Next: edit ${REPO_DIR}/.env to fill in API keys"
echo "        (Discogs, Xendit, Biteship, YouTube, OpenRouter),"
echo "        then: cd ${REPO_DIR} && docker compose up -d --build app worker"
echo "============================================================"
