# VPS Setup — `vps.rocketsystem.cloud`

> Host: `vps.rocketsystem.cloud` → `31.97.220.192`
> Run these once, when the box is fresh.

## 1. Connect as root

```bash
ssh root@vps.rocketsystem.cloud
# or by IP:
ssh root@31.97.220.192
```

## 2. Patch + create deploy user

```bash
apt update && apt -y upgrade
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys     # paste ~/.ssh/id_ed25519.pub from your laptop
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

## 3. Lock down SSH

```bash
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

From now on connect as **`ssh deploy@vps.rocketsystem.cloud`**.

## 4. Firewall

```bash
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable
```

Cloudflare's WAF still sees traffic on 80/443 — we want them open at the OS
firewall too because the cert-renewal path is direct.

## 5. Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
# log out / back in for the group to take effect
```

## 6. Working tree

```bash
sudo mkdir -p /opt/mediumformat
sudo chown deploy:deploy /opt/mediumformat
cd /opt/mediumformat
git clone https://github.com/werkstoffclub/mediumformat.git .
cp .env.example .env
nano .env       # fill secrets — see [[Environment Variables]]
```

## 7. Issue Let's Encrypt certs

DNS must be live first — see [[DNS & Cloudflare]] and verify with
`dig mediumformat.info`.

```bash
ADMIN_EMAIL=admin@mediumformat.info ./scripts/init-letsencrypt.sh
```

## 8. First boot

```bash
docker compose up -d --build
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed
```

Visit `https://mediumformat.info` and sign in at `/admin/login`.

## 9. Backups

```bash
sudo cp scripts/backup.sh /usr/local/bin/mf-backup.sh
sudo chmod +x /usr/local/bin/mf-backup.sh
echo "0 3 * * * /usr/local/bin/mf-backup.sh" | sudo tee /etc/cron.d/mediumformat-backup
```

For off-site copies install rclone and configure an `r2` remote pointing at a
Cloudflare R2 bucket. See [[Backups]].
