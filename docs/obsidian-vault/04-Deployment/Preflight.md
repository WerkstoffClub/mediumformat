# Preflight — `scripts/preflight.sh`

Read-only sanity check. Run on the VPS before bootstrap to verify it has the
right specs, DNS is configured, and the network can reach the services we
depend on.

## Usage

```bash
ssh root@port.rocketsystem.cloud
# clone shallow + run, or curl-pipe-bash:
curl -fsSL https://raw.githubusercontent.com/WerkstoffClub/mediumformat/claude/document-and-deploy-setup-dOnw6/scripts/preflight.sh | bash
```

Or, if the repo is already cloned:

```bash
bash /opt/mediumformat/scripts/preflight.sh
```

## What it checks

| Check | Pass / Warn / Fail |
|---|---|
| OS + kernel + uptime | informational |
| vCPU count | warn if `< 2` |
| RAM total | ok ≥ 4 GB, warn 2–4 GB (use GHA image-build flow), fail < 2 GB |
| Disk free | warn if `< 30 GB` |
| Docker present | informational (bootstrap installs if missing) |
| Public IP | resolves via `ipify` / `ifconfig.me` |
| DNS `mediumformat.info` | should resolve to Cloudflare edge (proxied) |
| DNS `www.mediumformat.info` | should resolve to Cloudflare edge (proxied) |
| DNS `mail.mediumformat.info` | **must** resolve directly to the VPS IP (grey cloud), else LE fails |
| Ports 80 / 443 free | warn if anything is already listening |
| Outbound HTTPS to GitHub, Docker registry, Let's Encrypt | warn if unreachable |

## Sample interpretation

- All green / yellow warnings only → go ahead and run
  `scripts/bootstrap-vps.sh`.
- RAM ≤ 2 GB → resize the VPS plan, or switch to the GHA image-build flow
  before bootstrap (see [[Image Build Pipeline]]).
- `mail.mediumformat.info` resolves through Cloudflare → flip it to grey
  cloud at `cloudflare.com → mediumformat.info → DNS`, wait 1–2 min, re-run.
- Port 80/443 already in use → another reverse proxy is running.
  `systemctl stop nginx caddy apache2 2>/dev/null` then re-check.
