# Deploying Medium Format → mediumformat.info (Docker)

Containerized, **portable** deployment of the static prototype. A small Caddy
file-server container serves the 52-page site.

> **Host moved 2026-11-13: production now runs on dd-vps (seedlink VPS) in
> `/opt/mediumformat`, not vps.lacak.live.** dd-vps is Tailscale-only (no
> public 80/443/SSH); traffic arrives via the Cloudflare Tunnel
> `mediumformat-dd-vps` (systemd `cloudflared-mediumformat`) → `127.0.0.1:3300`.
> TLS is at Cloudflare; Caddy does www→apex + http→https. API uploads persist in
> `/opt/mediumformat/data/`. The lacak-specific notes below are historical.
>
> Layout since 2026-11-13: React storefront at `/` (`deploy-app.sh`), back-office
> at `/backoffice/`, static prototype at `/prototype/` (`site/prototype/`).
>
> Section subdomains: `dealers.mediumformat.info` → `mockup-dealers.html`,
> `peers.mediumformat.info` → `mockup-peers.html`. Caddy rewrites `/` to the
> mockup and serves every path on those hosts from `/srv/prototype`. Adding one =
> Caddyfile host matcher + tunnel ingress in `/etc/cloudflared/mediumformat.yml`
> on dd-vps + proxied CNAME to the tunnel.

> **The older host-nginx + rsync kit** lives in `deploy/` (`deploy/README.md`).
> Use one or the other — this container path is the current one.

## Two modes (pick per host)

| File set | When | TLS |
|---|---|---|
| `docker-compose.yml` + `Caddyfile` | **dd-vps (now)** — behind Cloudflare Tunnel on 127.0.0.1:3300 | Cloudflare |
| `docker-compose.selfhosted.yml` + `Caddyfile.selfhosted` | A future **bare** VPS with nothing on 80/443 | Caddy auto-HTTPS |

Both serve identical content, pretty URLs, headers and 404 handling. Migrating
between them is a file swap — see **Migration** below.

---

## Reality on vps.lacak.live (verified)

- **Ubuntu 24.04**, Docker 29 + Compose v5, public IP **76.13.16.128**.
- **Traefik v3.6** owns `:80/:443`, on the external Docker network **`proxy_public`**,
  entrypoint **`websecure`**, cert resolver **`myresolver`** (Let's Encrypt TLS
  challenge). Other stacks (`lacak-web`, `n8n`, `evolution-api`, `hermes`) sit behind it.
- **Stacks are plain `docker compose` folders under `/opt/stacks/<name>/`.**
  There is **no Portainer/Dockge installed** — apps are brought up with
  `docker compose up -d`. This kit follows that same convention.
- **DNS already resolves:** `mediumformat.info` + `www` → `76.13.16.128`. Traefik can
  issue the cert as soon as the container is up.

The `docker-compose.yml` here mirrors the existing `lacak-web` stack (static site,
apex+www, www→apex redirect) label-for-label.

---

## Deploy to vps.lacak.live

One-time setup, then **one command per release**:

```bash
cp deploy/docker/stack.env.example deploy/docker/stack.env   # fill in SSH details
ssh-copy-id root@76.13.16.128                                # key-based SSH (once)
chmod +x deploy/docker/*.sh

DRY=1 ./deploy/docker/deploy.sh    # preview the file sync
./deploy/docker/deploy.sh          # sync site+Caddyfile+compose, up the stack, smoke-test HTTPS
```

`deploy.sh` is idempotent — re-run it for every release. It pushes to
`/opt/stacks/mediumformat/`, runs `docker compose up -d`, reloads Caddy, and
curls `https://mediumformat.info/` to confirm a 200. Traefik picks up the
container's labels automatically and issues/renews the cert.

> **Content-only change?** `./deploy/docker/sync.sh` is enough (and faster) — it
> pushes just the site + Caddyfile; Caddy serves it live, no `up` needed.

### Verify

```bash
curl -I https://mediumformat.info            # 200 + HSTS
curl -sI https://www.mediumformat.info | grep -i location   # 301 → apex
ssh root@76.13.16.128 'docker logs --tail 20 mediumformat-web'
```
Cert issuance shows up in Traefik's logs (`docker logs traefik`), not Caddy's.

---

## Updating the site later

```bash
./deploy/docker/sync.sh
```
Static content is served live — no restart. If you changed the **Caddyfile**:
```bash
ssh root@76.13.16.128 'docker exec mediumformat-web caddy reload --config /etc/caddy/Caddyfile'
```
If you changed **docker-compose.yml** (labels): re-`scp` it, then
`docker compose up -d` again in the stack folder.

---

## Migration to another VPS

Everything is in the repo + one folder (`/opt/stacks/mediumformat`). No host-specific
state except the TLS cert, which the target's proxy re-issues automatically.

**A) Target also runs this Traefik setup** (same `proxy_public` + `myresolver`):
1. `./sync.sh` with `stack.env` pointed at the new host (creates the folder + site).
2. `scp docker-compose.yml` there, `docker compose up -d`.
3. Repoint DNS `A` records to the new IP. Traefik on the new box issues a fresh cert.

**B) Target is a bare VPS** (nothing on 80/443):
1. `./sync.sh` to the new host.
2. Use the **self-hosted** variant instead:
   ```bash
   scp deploy/docker/docker-compose.selfhosted.yml newhost:/opt/stacks/mediumformat/docker-compose.yml
   scp deploy/docker/Caddyfile.selfhosted        newhost:/opt/stacks/mediumformat/Caddyfile
   ssh newhost 'cd /opt/stacks/mediumformat && docker compose up -d'
   ```
   This Caddy owns 80/443 and provisions its own Let's Encrypt cert (persisted in the
   `caddy_data` volume — back it up per `docker-compose.selfhosted.yml` comments).
3. Repoint DNS.

Either way: **copy folder → bring up stack → repoint DNS.** Done.

---

## Deploy from GitHub Actions

`.github/workflows/deploy.yml` runs `deploy-app.sh` from a GitHub runner, so a deploy can be started from
anywhere (GitHub → Actions → **deploy** → Run workflow, or a Claude cloud session). dd-vps only takes SSH over
Tailscale, so the runner joins the tailnet as `tag:ci` first. The script reads no local `.env` in CI; the
secrets already live in `/opt/mediumformat/api.env`.

One-time setup:

1. **GitHub default branch → `main`** (Settings → General → Default branch). `workflow_dispatch` only lists
   workflows that exist on the default branch.
2. **Tailscale ACL** (admin console → Access controls): let `tag:ci` exist and reach dd-vps on port 22, e.g.
   `"tagOwners": {"tag:ci": ["autogroup:admin"]}` and an ACL/grant from `tag:ci` to dd-vps `:22`.
   If Tailscale SSH is enabled on dd-vps, also add an `ssh` rule allowing `tag:ci` as `root`.
3. **Tailscale OAuth client** (Settings → OAuth clients → Generate): scopes *Devices Core* write and *Auth Keys*
   write, tag `tag:ci`. Save as repo secrets `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`.
4. **Deploy SSH key**, from a machine already on the tailnet:

   ```bash
   ssh-keygen -t ed25519 -N '' -C gha-deploy -f /tmp/mf-deploy
   ssh-copy-id -i /tmp/mf-deploy.pub root@dd-vps.tail9b9f75.ts.net
   gh secret set DEPLOY_SSH_KEY -R WerkstoffClub/mediumformat < /tmp/mf-deploy && rm /tmp/mf-deploy /tmp/mf-deploy.pub
   ```

Optional repo variables `DEPLOY_SSH_HOST` / `DEPLOY_SSH_USER` override `dd-vps.tail9b9f75.ts.net` / `root`.
The job ends with a smoke check of `/`, `/backoffice/` and `/api/v1/storefront/releases`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No cert / TLS error | Confirm DNS still points at the box and Traefik is up (`docker ps traefik`). Watch `docker logs traefik`. |
| 404 Traefik page | Labels not picked up — container not on `proxy_public`, or `traefik.enable=true` missing. `docker inspect mediumformat-web` → check networks/labels. |
| 404 from the site on `/mockup-cart` | Content not synced — re-run `sync.sh`, confirm files in `/opt/stacks/mediumformat/site`. |
| Changed Caddyfile, no effect | `caddy reload` (see Updating) or restart the stack. |
| Hit Let's Encrypt rate limit while testing | Rare with TLS challenge; if needed, test on the self-hosted variant with its staging `acme_ca` line first. |

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | **Primary** stack — Caddy behind Traefik (this VPS). |
| `Caddyfile` | Behind-proxy web config: :80 file server, pretty URLs, headers. |
| `docker-compose.selfhosted.yml` | Variant — self-contained Caddy owning 80/443 (bare host). |
| `Caddyfile.selfhosted` | Auto-HTTPS config for the self-hosted variant. |
| `sync.sh` + `stack.env.example` | Push web root + Caddyfile to the VPS stack folder. |
| `Dockerfile` + `Dockerfile.dockerignore` | Optional baked image (registry workflow); bakes `Caddyfile.selfhosted`. |
