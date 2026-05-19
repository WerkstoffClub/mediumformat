# 🏠 Home

**Medium Format** is an independent record shop based in Jakarta, Indonesia,
selling vinyl, CDs, cassettes and merch across five channels:

| Channel | Type | Status |
|---|---|---|
| Website (`mediumformat.info`) | Owned | MVP-1 |
| POS (in-store at Toko Medium Format) | Owned | MVP-2 |
| Discogs Marketplace | 3rd party | MVP-2 |
| Tokopedia | 3rd party | MVP-3 |
| Shopee | 3rd party | MVP-4 |

This app is the **admin dashboard + public website + sync workers** that runs all
five channels off a single catalog/inventory database.

## Quick links

### Get started
- [[01-Overview/Product Vision]]
- [[01-Overview/Stack]]
- [[05-Operations/Local Development]]

### Building features
- [[02-Architecture/Application Layout]]
- [[02-Architecture/Data Model]]
- [[02-Architecture/Routes Map]]
- [[03-Features/Catalog]]
- [[03-Features/Inventory]]
- [[03-Features/POS]]
- [[03-Features/Orders & Payments]]
- [[03-Features/Channels]]
- [[03-Features/Track Previews]]

### Deploying
- [[04-Deployment/Production Topology]]
- [[04-Deployment/Preflight]]
- [[04-Deployment/VPS Setup]]
- [[04-Deployment/First Boot - bootstrap-vps.sh]]
- [[04-Deployment/DNS & Cloudflare]]
- [[04-Deployment/TLS & Let's Encrypt]]
- [[04-Deployment/Image Build Pipeline]]
- [[04-Deployment/CI Deploy]]
- [[04-Deployment/Deploy Runbook]]
- [[04-Deployment/Environment Variables]]

### Operations
- [[05-Operations/Database Migrations]]
- [[05-Operations/Seed Data]]
- [[05-Operations/Worker Process]]
- [[05-Operations/Backups]]

### History
- [[06-History/Progress Log]]
- [[06-History/Commit History]]
- [[06-History/Decisions]]

### Memory
- [[07-Memory/Domain Glossary]]
- [[07-Memory/Conventions]]
- [[07-Memory/Open Questions]]

## Production endpoints

| URL | Purpose |
|---|---|
| `https://mediumformat.info` | Public site (root) |
| `https://www.mediumformat.info` | redirects → root |
| `https://mediumformat.info/admin` | Admin dashboard |
| `https://mail.mediumformat.info` | Listmonk newsletter admin |
| `port.rocketsystem.cloud` (`31.97.220.192`) | Host (SSH `deploy@…`) |

## How a deploy works

- **Day to day**: `git push origin main` — GitHub Actions builds the image,
  pushes to GHCR, SSHes to the VPS, runs `./scripts/deploy.sh`. See
  [[04-Deployment/CI Deploy]].
- **First time**: [[04-Deployment/Preflight]] → [[04-Deployment/First Boot - bootstrap-vps.sh]]
  → set GitHub secrets per [[04-Deployment/CI Deploy]].
- **Hotfix on the box**: `ssh deploy@port.rocketsystem.cloud && cd /opt/mediumformat && ./scripts/deploy.sh`.
- **Rollback**: edit `APP_IMAGE` in `/opt/mediumformat/.env` to a pinned
  tag, then `docker compose pull && docker compose up -d`.
