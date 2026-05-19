# Auth & Roles

## Stack

- **`next-auth@5.0.0-beta.25`** (Auth.js v5)
- **Credentials provider** only (email + bcrypt password)
- **JWT sessions** (no DB lookup on every request — works in middleware)
- **Prisma adapter** for accounts/sessions/verification-tokens

## Two-config split

`middleware.ts` runs on the Edge runtime, which **can't import Prisma or
bcrypt**. So Auth.js is configured in two files:

| File | Runtime | Contents |
|---|---|---|
| `lib/auth.config.ts` | Edge-safe | session callbacks, JWT shape, `pages.signIn` — imported by middleware |
| `lib/auth.ts` | Node | spreads `authConfig`, adds `PrismaAdapter` + `Credentials` provider — exports `auth`, `signIn`, `signOut`, `handlers` |

The `jwt` callback stashes `uid` + `role` on the token. The `session` callback
hydrates `session.user.id` + `session.user.role` from the token. No DB hit per
request.

## Roles & capabilities

`lib/permissions.ts` defines the capability matrix:

| Role | Caps |
|---|---|
| `ADMIN` | everything (16 caps) |
| `STAFF` | catalog, inventory, POS, orders, customers, messages, marketing, news, sales reports, public site |
| `SHOPKEEPER` | catalog read, POS, public site — minimal counter-staff role |
| `WHOLESALER` | public site + wholesale |
| `CUSTOMER` | public site only |

Use `can(role, cap)` in server actions / route handlers:

```ts
import { can } from "@/lib/permissions";
if (!can(session.user.role, "inventory.adjust")) throw new Error("Forbidden");
```

`isStaff(role)` is a shortcut for `role ∈ {ADMIN, STAFF, SHOPKEEPER}`.

## Middleware gate

`middleware.ts` matches `/admin/:path*`, `/account/:path*`, `/wholesale/:path*`.
For `/admin/*` (except `/admin/login`) it redirects to login unless
`role ∈ STAFF_ROLES`. `/account` and `/wholesale` are matched for future
gating (account currently requires only a session; wholesale requires
`WHOLESALER`).

## Seed admin

`prisma/seed.ts` upserts an `ADMIN` user from `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`. If `SEED_ADMIN_PASSWORD` is empty
it generates a 12-byte base64url password and prints it once on stdout.

> ⚠️ The auto-generated password is shown **once** — capture it from the
> deploy logs, or set `SEED_ADMIN_PASSWORD` explicitly in `.env`.

## Customer accounts

Customers also live in the `User` table with `role = CUSTOMER`. The website
sign-up flow (TODO) creates these. `CustomerProfile` (1:1) holds vip /
wholesaleApproved / default address / staff notes.
