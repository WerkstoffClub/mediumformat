# Storefront Inline CMS Editing — Design

**Date:** 2026-07-12
**Branch:** `feat/storefront-inline-cms` (based on deployed `origin/main`)
**Status:** Approved design → implementation plan pending

## Goal

Let an authenticated admin edit the shop's editorial content **directly on the
live public storefront** (`mediumformat.info`), in a WYSIWYG click-to-edit mode,
rather than only through the back-office. Scope of editable content:

1. **Archive / category pages** — product category pages (Cassettes, LPs) and
   the news/journal category pages (Staff Picks, Highlights, News, Interview).
2. **Blog posts** — the journal articles.
3. **Release / product display copy** — descriptions and editorial notes shown on
   the storefront.

A prerequisite gap: **news categories are a hardcoded `PostCategory` enum with no
editable record** behind them. They must become real records before they can be
edited on either surface.

## Non-goals (YAGNI)

- Arbitrary creation/deletion of news categories — the four are fixed; we edit
  their content, slug, template, and status, not their existence.
- A full block/rich-text page builder. Editing is per-field (text, rich copy,
  select for template/status), not free-form layout composition.
- Media/asset upload UX beyond what already exists (hero image URL is an editable
  text field; existing upload endpoints may be wired later, out of scope here).
- Versioning / draft-preview workflows beyond the existing `status` field.

## Key decisions

### D1 — News categories unify into `CategoryPage` (not a new model)

Extend the existing `CategoryPage` table with a discriminator instead of adding a
parallel `NewsCategory` model. This reuses the existing category-pages CRUD API,
back-office form, and storefront hero rendering — one code path for every
"archive page".

Schema additions to `CategoryPage`:

- `kind: CategoryPageKind` — new enum `{ PRODUCT_PAGE, NEWS_CATEGORY }`,
  default `PRODUCT_PAGE`.
- `newsCategoryKey: PostCategory?` — set only for `NEWS_CATEGORY` rows; links the
  page to the fixed post-category enum used to filter posts. Unique when present.

Existing fields (`slug`, `title`, `template`, `kicker`, `headline`, `salesCopy`,
`heroImageUrl`, `ctaLabel`, `ctaHref`, `seoTitle`, `seoDescription`, `status`,
`publishedAt`) all apply to both kinds. `formatFilter` stays product-only.

Seed the four news categories as `CategoryPage` rows (`kind = NEWS_CATEGORY`):

| title       | slug        | newsCategoryKey | template  |
|-------------|-------------|-----------------|-----------|
| Staff Picks | staff-picks | STAFF_PICKS     | HALF_HERO |
| Highlights  | highlights  | HIGHLIGHTS      | HALF_HERO |
| News        | news        | NEWS            | HALF_HERO |
| Interview   | interview   | INTERVIEW       | HALF_HERO |

`Post.category` remains the `PostCategory` enum (unchanged) — the seed rows carry
editable presentation metadata for each category; posts are still filtered by the
enum. No Post data migration.

### D2 — Storefront admin session reuses the back-office JWT

Storefront (`/`) and back-office (`/backoffice/`) share one origin, hence one
`localStorage`. The storefront reads the existing back-office token key on load;
if present, it calls `GET /auth/me` and enables edit affordances only when the
role is `ADMIN` or `MANAGER`. Fallback: a minimal login popover on the storefront
(`POST /auth/login`). Credentials are typed by the admin — never auto-filled.

A dedicated authenticated axios instance (bearer token) is used for all mutation
calls; the existing public client stays unauthenticated for reads.

### D3 — Inline edit architecture (WYSIWYG click-to-edit + save bar)

- **`AdminEditProvider`** (React context): holds `{ isAdmin, editMode, dirty,
  stage(key, value), save(), discard() }`. `dirty` is a map keyed by
  `entity:id:field`.
- **`<Editable entity id field as value>`** primitive: `as ∈ { text, richtext,
  select }`. Read mode renders `value`. In `editMode` it shows a hover outline and
  becomes click-to-edit in place (contentEditable for text/richtext, a dropdown
  for select). Edits call `stage(...)`.
- **`<SaveBar>`**: fixed floating bar, hidden until `dirty` is non-empty. Shows
  "N unsaved changes", `Save`, `Discard`. `Save` groups staged changes by
  `entity:id` and issues one `PATCH` per entity to the matching endpoint; on
  success clears dirty + toasts; on `401` prompts re-login.
- **Field → endpoint map:** `categoryPage → PATCH /category-pages/:id`,
  `post → PATCH /posts/:id`, `release → PATCH /inventory/:id`. All already exist
  and are `@Roles(ADMIN, MANAGER)` guarded.

## Architecture / data flow

```
Admin on storefront
  │  (edit mode toggle — only if role ADMIN/MANAGER)
  ▼
<Editable> fields on CategoryPage / NewsDetail / ReleaseDetail / Home
  │  click → edit in place → stage(entity:id:field, value)
  ▼
AdminEditProvider.dirty  ──►  <SaveBar>  ──► group by entity ──► authed axios
                                                                   PATCH /category-pages/:id
                                                                   PATCH /posts/:id
                                                                   PATCH /inventory/:id
  ▲                                                                    │
  └──────────────── refetch / optimistic update ◄─────────────────────┘
```

## Components (by unit, one purpose each)

**Backend (`apps/api`)**
- `prisma/schema.prisma` — `CategoryPageKind` enum; `kind` + `newsCategoryKey` on
  `CategoryPage`; migration.
- Seed script — upsert the four `NEWS_CATEGORY` rows.
- `category-pages` DTOs/service/controller — accept + validate `kind` /
  `newsCategoryKey`; `findAll` filterable by `kind`.
- `storefront` controller/service — `GET /storefront/category-pages/:slug`
  resolves both kinds; a news-category page returns its metadata + the posts in
  that category. (Product pages already resolve releases by `formatFilter`.)

**Back-office (`apps/backoffice`)** — Phase 1 bonus
- CMS Archives tab lists **all** `CategoryPage` rows (both kinds) and links each to
  the existing category-page editor; the news-category rows are now editable
  there too (replaces the read-only enum table).

**Storefront (`apps/storefront`)**
- `admin/AdminEditContext.tsx` — provider + hook.
- `admin/auth.ts` — token read/verify/login, authed axios.
- `admin/Editable.tsx` — the click-to-edit primitive.
- `admin/SaveBar.tsx` + `admin/EditModeToggle.tsx` — controls.
- `pages/CategoryPage.tsx` — render news-category pages (posts grid) and wrap
  fields in `<Editable>`.
- `pages/NewsDetail.tsx`, `pages/ReleaseDetail.tsx`, `pages/Home.tsx` — wrap copy
  in `<Editable>` (Phase 4 coverage).

## Error handling

- Mutations validated server-side by existing DTOs; client shows field-level error
  toasts on `400`.
- `401/403` on save → clear stale token, open login popover, preserve staged edits
  so nothing is lost.
- Slug uniqueness is enforced by the DB `@unique`; a conflicting slug edit surfaces
  a clear "slug already in use" message.
- Read-mode storefront is unaffected for anonymous visitors — edit affordances and
  the authed client never mount without an ADMIN/MANAGER session.

## Testing

- **Backend unit/integration:** migration applies; seed is idempotent; category-
  pages service accepts/validates `kind` + `newsCategoryKey`; storefront resolver
  returns posts for a news-category slug and releases for a product slug.
- **Storefront unit:** `AdminEditContext` staging/save/discard reducer; field→
  endpoint grouping; `Editable` read vs edit rendering.
- **E2E (Playwright, deferred to coverage phase):** login → toggle edit → change a
  hero headline → save → reload → persisted. Anonymous visitor sees no edit UI.
- Visual check at 375/768/1440 that edit affordances don't disturb public layout.

## Delivery — incremental

- **Phase 0 — git reconcile.** Branch off `origin/main`; keep only the VITE chore.
  (Done.)
- **Phase 1 — backend + back-office archives.** `CategoryPage.kind` +
  `newsCategoryKey`, migration, seed 4 news categories, extend DTOs/service +
  storefront resolver; make the CMS Archives tab list+edit all archive pages.
  Deploy (auto-migrates on API start).
- **Phase 2 — storefront admin session.** `AdminEditProvider`, token reuse +
  login popover, authed axios, edit-mode toggle (no editable fields yet).
- **Phase 3 — inline-edit core + first page.** `Editable` + `SaveBar`, wired to the
  category / news-category pages end-to-end. Deploy; validate on prod.
- **Phase 4 — coverage.** Extend `Editable` to blog posts, release/product copy,
  and home/landing copy.
- **Phase 5 — deploy + verify** final coverage; screenshots.

Each phase is independently shippable; we deploy and steer after Phase 1 and again
after Phase 3.

## Risks / open items

- **Multi-session repo hazard** — other `claude/*` sessions share this repo/DB.
  Work stays on `feat/storefront-inline-cms`; do not reset shared refs.
- **localStorage token-key coupling** — must confirm the exact key the back-office
  writes; if it changes, storefront reuse breaks (login popover still works).
- **contentEditable rich text** — keep it constrained (plain text / minimal
  markdown) to avoid pasted-HTML sanitization issues; sanitize on save.
- The 2 dropped local refactor commits remain in reflog if ever needed.
