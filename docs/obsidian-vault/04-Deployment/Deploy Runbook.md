# Deploy Runbook

> This is the **subsequent deploy** runbook — for first-time setup see
> [[VPS Setup]] and [[DNS & Cloudflare]] and [[TLS & Let's Encrypt]].

## Standard deploy

```bash
ssh deploy@vps.rocketsystem.cloud
cd /opt/mediumformat
./scripts/deploy.sh
```

What that script does:

```bash
git fetch --all --prune
git checkout main
git pull --ff-only

docker compose build app worker
docker compose run --rm app npx prisma migrate deploy
docker compose up -d
```

`up -d` only recreates containers whose image changed, so DB / Redis stay up.

## Deploying a branch (e.g. for staging on the same box)

There isn't a separate staging today. To smoke-test a branch on the VPS:

```bash
git fetch origin
git checkout claude/document-and-deploy-setup-dOnw6
docker compose build app worker
docker compose run --rm app npx prisma migrate deploy
docker compose up -d app worker
# revert when done:
git checkout main && ./scripts/deploy.sh
```

## Verifying

```bash
docker compose ps                         # all healthy
docker compose logs --tail=200 app | grep -Ei "error|warn"
curl -fsSI https://mediumformat.info | head
```

Spot-check in a browser:

- `/` renders
- `/admin/login` accepts the seed admin
- `/shop` returns at least one product (if DB has data)

## Rollback

`./scripts/deploy.sh` doesn't pin a SHA. If a deploy goes bad:

```bash
cd /opt/mediumformat
git log --oneline -10
git checkout <previous-good-sha>
docker compose build app worker
docker compose up -d
```

For schema problems: `prisma migrate deploy` is **append-only**. Reverting
a migration that's already been applied means writing a new migration that
undoes it — there's no down-migration step. Most operational rollbacks just
revert *code* and leave the schema in the new state.

## Maintenance window

For high-risk migrations (column drops, type changes):

```bash
# Show a maintenance page (TODO: ship one in nginx)
docker compose stop app worker
# Apply migration manually
docker compose run --rm app npx prisma migrate deploy
# Bring back
docker compose up -d app worker
```
