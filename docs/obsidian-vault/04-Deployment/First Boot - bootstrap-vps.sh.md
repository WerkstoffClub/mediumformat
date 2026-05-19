# First Boot — `scripts/bootstrap-vps.sh`

A single idempotent script that takes a **fresh root SSH** session to a fully
deployed site at `https://mediumformat.info`. Use this for the **initial**
production bring-up; for subsequent deploys see [[Deploy Runbook]].

## Prerequisites

1. **DNS is live** — `mediumformat.info`, `www.mediumformat.info` (proxied)
   and `mail.mediumformat.info` (grey cloud) all set up in Cloudflare per
   [[DNS & Cloudflare]].
2. **Root SSH** access to the box (`ssh root@vps.rocketsystem.cloud`).
3. **Your laptop's public key** in hand (`cat ~/.ssh/id_ed25519.pub`).

## One-liner

From your laptop:

```bash
ssh root@vps.rocketsystem.cloud
```

Then, on the VPS as root:

```bash
ADMIN_EMAIL="admin@mediumformat.info" \
SSH_PUBKEY="ssh-ed25519 AAAA...your-laptop-key... you@laptop" \
bash <(curl -fsSL https://raw.githubusercontent.com/werkstoffclub/mediumformat/main/scripts/bootstrap-vps.sh)
```

(or, if you've already cloned the repo: `bash /opt/mediumformat/scripts/bootstrap-vps.sh`)

## What it does (9 steps)

1. `apt update && apt upgrade` + install `curl git openssl ufw dnsutils netcat`
2. Create `deploy` user, install your SSH public key, add to `sudo`
3. Harden SSH: `PermitRootLogin no`, `PasswordAuthentication no`,
   `ChallengeResponseAuthentication no`, restart sshd
4. `ufw allow 22,80,443` and enable firewall
5. Install Docker via `get.docker.com`, enable + start, add `deploy` to `docker` group
6. Clone repo to `/opt/mediumformat`, fast-forward `main`
7. Generate `.env` with random `AUTH_SECRET`, `POSTGRES_PASSWORD`,
   `LISTMONK_DB_PASSWORD`, `LISTMONK_PASSWORD`, `SEED_ADMIN_PASSWORD`.
   Write them to `/root/mediumformat-secrets.txt` (mode 0600).
8. DNS sanity check (resolves all three hostnames, prints the VPS public IP)
9. `init-letsencrypt.sh` → `docker compose up -d --build` →
   `prisma migrate deploy` → `db:seed`

Idempotent: every step skips if it's already done.

## After it finishes

- Capture `/root/mediumformat-secrets.txt` somewhere safe (1Password,
  laptop, anywhere not the VPS).
- Sign in at `https://mediumformat.info/admin/login` with the seed admin.
- Fill in the integration API keys in `/opt/mediumformat/.env`:
  - `DISCOGS_PAT`, `DISCOGS_USERNAME`
  - `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`
  - `BITESHIP_API_KEY`, `BITESHIP_WEBHOOK_TOKEN`
  - `YOUTUBE_API_KEY`
  - `OPENROUTER_API_KEY`
- Re-build the app + worker so they pick up the new env:
  ```bash
  cd /opt/mediumformat
  docker compose up -d --build app worker
  ```

## Rotating the root password

You typed your root password in clear text earlier. Rotate it now:

```bash
ssh root@vps.rocketsystem.cloud
passwd
```

After the bootstrap runs, root SSH login is disabled anyway, but rotating
is still the right reflex.

## If something fails

- `ufw enable` blocking your SSH session — extremely unlikely because we add
  `OpenSSH` first, but if it happens you can reset via your VPS provider's
  console (Rocketsystem dashboard).
- Certbot fails — most likely `mail.mediumformat.info` is still
  orange-clouded in Cloudflare. Set it to grey (DNS only), wait for
  propagation, re-run.
- `docker compose run --rm app npm run db:seed` failure — re-run by hand:
  ```bash
  cd /opt/mediumformat
  docker compose run --rm app npm run db:seed
  ```
