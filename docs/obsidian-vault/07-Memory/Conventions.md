# Conventions

## Code

- **No README/docs.md additions unless asked.** Per `AGENTS.md`,
  this is **NOT the Next.js you know** — read the relevant guide in
  `node_modules/next/dist/docs/` before writing code, and heed deprecation
  notices. APIs and conventions may differ from training data.
- **TypeScript strict**. No `any` unless you can argue it.
- **Prisma is the source of truth** — don't hand-write SQL except in
  migrations and reports.
- **Money is `Decimal(14, 2)` in IDR**. Always.
- **Dates** — use Prisma's `DateTime`. Format with `date-fns` in `id-ID`
  locale via `lib/format.ts`.
- **Server actions** for mutations. Route handlers (`/api/*`) only for
  webhooks and Auth.js.

## File layout

- Public site under `app/(site)/`, admin under `app/admin/`. Don't mix.
- Integration clients under `lib/integrations/<service>/client.ts`.
- BullMQ handlers under `jobs/handlers/<verb>.ts`.
- One Prisma model per concept; no junk fields without a reason.

## Permissions

- Always check capability in server actions via `can(role, "...")` from
  `lib/permissions.ts`. Don't trust the middleware alone — it only guards
  routes, not actions.

## Migrations

- Schema-only. Data backfills go in standalone scripts.
- Never edit a checked-in migration.

## i18n

- Default `id-ID`. English as a secondary locale; copy lives in next-intl
  message files (TBD path).
- Prices always displayed via `lib/format.ts` (`Rp 123.456`, dot thousands).

## Comments

- Default to none. Comment only the **why** when the why is non-obvious.
- Don't explain what the code does — names should.

## Git

- Branch: `claude/<short-summary>-<random-suffix>` for AI-assisted work.
- Branch: `feature/<short-summary>` for human-driven work.
- Commits: imperative subject, no scope prefix, no ticket number.
- Squash-merge into main.
- **⚠️ `main` auto-deploys.** Every push (or merge) to `main` triggers
  the GHA workflow that builds the image and SSHes into the VPS to run
  `./scripts/deploy.sh`. Never push to `main` directly for non-trivial
  changes — open a PR, review, merge.
- Use `git tag vX.Y.Z` for releases. Tags build a tagged image but do
  not auto-deploy; pin a release on the VPS by setting `APP_IMAGE` in
  `.env` (see [[04-Deployment/Image Build Pipeline]]).

## Secrets

- Never commit `.env*` (gitignored).
- Rotate `AUTH_SECRET` only with downtime planned — all JWTs invalidate.
