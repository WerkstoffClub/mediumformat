# Deployment

## 1. VPS preparation — `vps.rocketsystem.cloud` (31.97.220.192)

```bash
# As root, first connect (hostname or IP both work):
ssh root@vps.rocketsystem.cloud

# Update + create deploy user with sudo + ssh key:
apt update && apt -y upgrade
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
# paste your public key from `cat ~/.ssh/id_ed25519.pub` on your laptop:
nano /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Lock down SSH:
sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall:
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable

# Docker:
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

From now on connect as `ssh deploy@vps.rocketsystem.cloud`.

## 2. Cloudflare DNS for mediumformat.info

**You need to do this yourself in your Cloudflare dashboard — I can't access
your account.**

### a. Register or transfer the domain

- If `mediumformat.info` is not yet registered: register it with **Cloudflare
  Registrar** at-cost (`.info` ≈ $9/year).
- If it's registered elsewhere: in Cloudflare → Add Site → Free plan → follow
  the nameserver-change instructions at your current registrar.

### b. DNS records (Cloudflare → DNS → Records)

Add the following with **Proxy status: Proxied (orange cloud)** unless noted:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `mediumformat.info` | `31.97.220.192` | Proxied |
| A | `www` | `31.97.220.192` | Proxied |
| A | `mail` (Listmonk admin) | `31.97.220.192` | DNS only (grey cloud — needed for Let's Encrypt webroot challenge) |
| TXT | `mediumformat.info` | `v=spf1 -all` *(replace later when you wire SMTP)* | DNS only |

### c. SSL/TLS settings

- **SSL/TLS → Overview → "Full (strict)"** (Cloudflare ↔ origin uses the Let's
  Encrypt cert we issue in step 4).
- **SSL/TLS → Edge Certificates → Always Use HTTPS: On**, **Min TLS 1.2**,
  **Automatic HTTPS Rewrites: On**, **HTTP Strict Transport Security**
  → enable after you've confirmed the site works.

### d. Performance & caching

- **Speed → Optimization → Auto Minify**: HTML, CSS, JS on
- **Caching → Configuration → Browser Cache TTL**: "Respect Existing Headers"
- Add a **Cache Rule** to bypass cache for `/admin/*`, `/api/*`, `/account/*`,
  `/cart`, `/checkout`. (Otherwise admin actions would be cached.)

### e. Security

- **Security → Bots → Bot Fight Mode: On**
- **WAF → Managed Rules**: leave defaults; enable "Cloudflare Managed Ruleset"
- **Security → Settings → Security Level**: Medium

## 3. Initial deploy

On the VPS as `deploy`:

```bash
sudo mkdir -p /opt/mediumformat
sudo chown deploy:deploy /opt/mediumformat
cd /opt/mediumformat
git clone https://github.com/werkstoffclub/mediumformat.git .
cp .env.example .env
# Edit .env — at minimum set:
#   AUTH_SECRET=$(openssl rand -base64 32)
#   POSTGRES_PASSWORD=...
#   LISTMONK_DB_PASSWORD=...
#   SEED_ADMIN_PASSWORD=... (or leave blank to auto-generate)
nano .env
```

## 4. Issue Let's Encrypt certificates

DNS must be live first (verify with `dig mediumformat.info`).

```bash
ADMIN_EMAIL=admin@mediumformat.info ./scripts/init-letsencrypt.sh
```

## 5. Bring up the stack

```bash
docker compose up -d --build
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed
```

Visit `https://mediumformat.info`. Sign in to admin at
`https://mediumformat.info/admin/login`.

## 6. Backups (cron)

```bash
sudo cp scripts/backup.sh /usr/local/bin/mf-backup.sh
sudo chmod +x /usr/local/bin/mf-backup.sh
echo "0 3 * * * /usr/local/bin/mf-backup.sh" | sudo tee /etc/cron.d/mediumformat-backup
```

For off-site copies install rclone and configure an `r2` remote pointing at a
Cloudflare R2 bucket.

## 7. Subsequent deploys

```bash
ssh deploy@vps.rocketsystem.cloud
cd /opt/mediumformat
./scripts/deploy.sh
```

> See `docs/obsidian-vault/` for an extended Obsidian-formatted runbook,
> domain glossary, data-model walk-through and progress log.
