# Image Build Pipeline (GitHub Actions → GHCR)

Why: `next build` peaks around 1.5 GB during compile. On a 2 GB VPS that
OOM-kills the build. The fix is to build the Docker image **in CI**, push to
GitHub Container Registry, and have the VPS only ever **pull**.

## What ships

- **`.github/workflows/build-image.yml`** — builds + pushes
  `ghcr.io/werkstoffclub/mediumformat:<tags>` on every push to `main` and
  every tag matching `v*`.
- **`docker-compose.yml`** — `app` and `worker` services declare
  `image: ${APP_IMAGE:-ghcr.io/werkstoffclub/mediumformat:latest}` plus
  `build: .` (so local dev can still `docker compose build`).
- **`scripts/deploy.sh`** — does `docker compose pull app worker`; on
  failure falls back to local build.

## Tags produced

| Trigger | Tags |
|---|---|
| push to `main` | `latest`, `main`, `sha-<short>` |
| tag `v1.2.3` | `v1.2.3`, `sha-<short>` |
| feature branch | `<branch-name>`, `sha-<short>` |

## One-time setup

### 1. Permissions

`.github/workflows/build-image.yml` already declares:

```yaml
permissions:
  contents: read
  packages: write
```

…and uses the built-in `GITHUB_TOKEN`. No extra secrets needed.

### 2. Make the package pullable from the VPS

The first push creates `ghcr.io/werkstoffclub/mediumformat` as a **private**
package by default. Either:

**A. Make it public** (simplest) — GitHub → Repo → Packages → click the
package → Settings → Change visibility → Public. Anyone can pull, including
your VPS, with no auth.

**B. Keep it private** + log the VPS into GHCR — recommended if the image
embeds anything you don't want public:

```bash
# On your laptop:
# Create a PAT (classic) with read:packages scope at
#   https://github.com/settings/tokens
# Copy the token, then on the VPS as the deploy user:
echo "<token>" | docker login ghcr.io -u <your-github-username> --password-stdin
```

This writes `~/.docker/config.json` so future pulls just work.

### 3. Link package → repo (for nice GitHub UI + inherits repo perms)

GitHub → Repo → Packages → click package → Package settings → Manage
repository access → Add `werkstoffclub/mediumformat` with Admin role.

## How a deploy looks now

```
push to main
   │
   ▼
GitHub Actions: build linux/amd64 image, push :latest + :main + :sha-xxx
   │
   ▼
On the VPS:  ssh deploy@port.rocketsystem.cloud
             cd /opt/mediumformat
             ./scripts/deploy.sh    ← pulls image, migrates, restarts
```

Cold start to live deploy is ~60s of pull + restart. No build on the VPS.

## Rolling back

Once you tag a release with `vX.Y.Z`, you can pin to it on the VPS by
exporting `APP_IMAGE` in `.env`:

```ini
# Add to /opt/mediumformat/.env
APP_IMAGE=ghcr.io/werkstoffclub/mediumformat:v0.1.0
```

Then `docker compose pull && docker compose up -d` pulls and runs that
specific tag instead of `latest`. Roll back / forward at will.

## Local dev: still builds

`docker-compose.yml` declares both `image:` and `build:`. For local work:

```bash
docker compose up --build app worker     # build locally, tag as image:
```

This tags the locally-built image with the GHCR name but doesn't push.
Compose uses it for `up`.

## When pulls fail

Two common cases:

1. **Package is private + no `docker login` on the VPS** →
   `deploy.sh` and `bootstrap-vps.sh` both fall back to a local build.
   Slow on a small box but always works.
2. **Workflow hasn't run yet for this SHA** → same fallback kicks in.

So nothing is ever blocked on the registry being healthy.
