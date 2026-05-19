# CI Deploy (push to main → live)

After this is wired up, the deploy loop is:

```
git push origin main
        │
        ▼
GitHub Actions: build linux/amd64 image, push to GHCR
        │
        ▼
GitHub Actions: ssh deploy@port.rocketsystem.cloud, run ./scripts/deploy.sh
        │
        ▼
docker compose pull && prisma migrate deploy && docker compose up -d
        │
        ▼
https://mediumformat.info is live
```

No manual SSH for routine deploys. For hotfixes / debugging you can still
run `scripts/deploy.sh` on the box by hand.

## The workflow

`.github/workflows/build-image.yml` has two jobs:

| Job | Trigger | Does |
|---|---|---|
| `build` | push to `main`, tags `v*`, manual | Builds + pushes the image to GHCR |
| `deploy` | needs `build`, **only on `main`** | SSHes to the VPS and runs `scripts/deploy.sh` |

Tagging `v1.2.3` builds + pushes but **does not deploy** — pin the version
in `.env` on the VPS to roll forward / back (see [[Image Build Pipeline]]).

`concurrency: vps-deploy / cancel-in-progress: false` queues simultaneous
deploys instead of cancelling — half-deploys are worse than slower deploys.

## One-time setup (~5 min)

### 1. Generate a dedicated CI SSH keypair

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-mediumformat" \
  -f ~/.ssh/mediumformat_ci -N ""
```

Two files:
- `~/.ssh/mediumformat_ci` — private (goes into a GitHub secret)
- `~/.ssh/mediumformat_ci.pub` — public (installed on the VPS)

### 2. Authorise the CI key on the VPS

```bash
ssh deploy@port.rocketsystem.cloud
echo '<paste contents of mediumformat_ci.pub here>' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

Verify from your laptop:

```bash
ssh -i ~/.ssh/mediumformat_ci deploy@port.rocketsystem.cloud whoami
# should print: deploy
```

### 3. Capture the VPS's SSH host key

```bash
ssh-keyscan -t ed25519,rsa port.rocketsystem.cloud
```

Save that output — it goes into the `VPS_KNOWN_HOSTS` secret. Without it
CI will refuse to connect (and that's the right default — no TOFU in CI).

### 4. Add the four secrets to GitHub

GitHub → Repo → Settings → Secrets and variables → Actions → New secret:

| Secret | Value |
|---|---|
| `VPS_HOST` | `port.rocketsystem.cloud` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_PRIVATE_KEY` | full contents of `~/.ssh/mediumformat_ci` (including `BEGIN`/`END` lines) |
| `VPS_KNOWN_HOSTS` | output of `ssh-keyscan` from step 3 |

### 5. Trigger the first deploy

```bash
git push origin main
```

Watch `Actions → Build & push image` in GitHub. Two jobs: `build` runs
~2 min, `deploy` runs ~30 s.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `Host key verification failed` | Empty / wrong `VPS_KNOWN_HOSTS` | Re-run `ssh-keyscan` and update the secret |
| `Permission denied (publickey)` | Public key not in `~deploy/.ssh/authorized_keys`, or wrong private key in secret | Re-paste public key on VPS, re-paste private key in secret |
| `./scripts/deploy.sh: Permission denied` | Script not executable on VPS | `chmod +x /opt/mediumformat/scripts/*.sh` |
| `prisma migrate deploy` fails | Migration applied partially | SSH in, inspect `_prisma_migrations` table; resolve manually |
| GHA build succeeds, deploy step skipped | You pushed a branch other than `main` | Expected — only `main` pushes deploy |

## Rotating the CI key

```bash
# 1. Generate a new key locally
ssh-keygen -t ed25519 -C "github-actions-mediumformat" \
  -f ~/.ssh/mediumformat_ci_v2 -N ""

# 2. Add the new public key on the VPS
ssh deploy@port.rocketsystem.cloud
cat >> ~/.ssh/authorized_keys
<paste new public key, Ctrl-D>

# 3. Update the GitHub secret VPS_SSH_PRIVATE_KEY with the new private key

# 4. Trigger a deploy and confirm it works
git commit --allow-empty -m "ci: verify new deploy key" && git push

# 5. Remove the old public key from ~/.ssh/authorized_keys on the VPS
```

## Manual deploy (still supported)

If GitHub is down or you need to deploy from a non-main branch:

```bash
ssh deploy@port.rocketsystem.cloud
cd /opt/mediumformat
git checkout <branch>
./scripts/deploy.sh
```

The script does the same `docker compose pull || build` + migrate + up flow.
