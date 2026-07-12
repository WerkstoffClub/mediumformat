# Storefront Inline CMS — Phase 1: Unified Archive Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the four hardcoded news categories into real, editable `CategoryPage` records (unified with product category pages via a `kind` discriminator), expose them through the existing category-pages + storefront APIs, and make the back-office CMS Archives tab list and edit every archive page.

**Architecture:** Extend the existing `CategoryPage` Prisma model with `kind` (`PRODUCT_PAGE | NEWS_CATEGORY`) and an optional `newsCategoryKey` (`PostCategory`). Seed the four news categories as `NEWS_CATEGORY` rows. The existing category-pages CRUD (already JWT/role-guarded) handles editing; the storefront resolver returns the category's posts when the page is a news category. The back-office Archives tab replaces its read-only enum table with a live, linked list of all `CategoryPage` rows.

**Tech Stack:** NestJS + Prisma + PostgreSQL (`apps/api`); React + Vite + Tailwind (`apps/backoffice`); Jest unit tests with in-memory Prisma mocks.

**Branch:** `feat/storefront-inline-cms` (based on deployed `origin/main`).

---

## File Structure

**Backend (`apps/api`)**
- `prisma/schema.prisma` — MODIFY: add `CategoryPageKind` enum; add `kind` + `newsCategoryKey` to `CategoryPage`.
- `prisma/migrations/<ts>_category_page_kind/migration.sql` — CREATE: enum + two columns + unique index.
- `prisma/seed.ts` — MODIFY: add idempotent `seedNewsCategories()` (upsert by slug).
- `src/category-pages/dto/create-category-page.dto.ts` — MODIFY: accept + validate `kind`, `newsCategoryKey` (Update DTO inherits via `PartialType`).
- `src/category-pages/dto/category-page-filter.dto.ts` — MODIFY: accept `kind` filter.
- `src/category-pages/category-pages.service.ts` — MODIFY: `findAll` filters by `kind`.
- `src/storefront/storefront.service.ts` — MODIFY: `categoryPage(slug)` attaches `posts` for `NEWS_CATEGORY`.
- `src/storefront/storefront.service.spec.ts` — CREATE: unit tests for the resolver branch.

**Back-office (`apps/backoffice`)**
- `src/api/categoryPages.ts` — MODIFY: add `kind` + `newsCategoryKey` to the `CategoryPage` type and `kind` to the filter.
- `src/pages/cms/CmsHub.tsx` — MODIFY: `ArchivesPanel` lists all `CategoryPage` rows (both kinds) and links each to its editor; delete the hardcoded `NEWS_CATEGORIES` archive rows.

---

## Task 1: Schema — `CategoryPageKind` enum + `kind` / `newsCategoryKey`

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (enum block near line 94; `CategoryPage` model at lines 621-641)
- Create: `apps/api/prisma/migrations/<timestamp>_category_page_kind/migration.sql`

- [ ] **Step 1: Add the `CategoryPageKind` enum**

In `apps/api/prisma/schema.prisma`, immediately after the `CategoryPageStatus` enum (currently ends at line ~102), add:

```prisma
enum CategoryPageKind {
  PRODUCT_PAGE
  NEWS_CATEGORY
}
```

- [ ] **Step 2: Add the two fields to `CategoryPage`**

In the `model CategoryPage { ... }` block, add these two lines just after the `template` line:

```prisma
  kind            CategoryPageKind     @default(PRODUCT_PAGE)
  newsCategoryKey PostCategory?        @unique
```

And add an index for kind-filtered lists — add to the block's `@@index` section:

```prisma
  @@index([kind, status])
```

- [ ] **Step 3: Validate the schema**

Run: `cd apps/api && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Author the migration SQL**

Create `apps/api/prisma/migrations/<timestamp>_category_page_kind/migration.sql` (use a timestamp after the existing `20260712091702`, e.g. `20260712120000_category_page_kind`) with:

```sql
-- CreateEnum
CREATE TYPE "CategoryPageKind" AS ENUM ('PRODUCT_PAGE', 'NEWS_CATEGORY');

-- AlterTable
ALTER TABLE "CategoryPage"
  ADD COLUMN "kind" "CategoryPageKind" NOT NULL DEFAULT 'PRODUCT_PAGE',
  ADD COLUMN "newsCategoryKey" "PostCategory";

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPage_newsCategoryKey_key" ON "CategoryPage"("newsCategoryKey");

-- CreateIndex
CREATE INDEX "CategoryPage_kind_status_idx" ON "CategoryPage"("kind", "status");
```

- [ ] **Step 5: Apply the migration + regenerate client**

Run: `cd apps/api && npx prisma migrate deploy && npx prisma generate`
Expected: migration `category_page_kind` applied; `Generated Prisma Client`.
(If the local dev DB differs from `mediumformat` default, set `DATABASE_URL` inline for this command.)

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(cms): add CategoryPage.kind + newsCategoryKey (unify archive pages)"
```

---

## Task 2: Seed the four news categories (idempotent)

**Files:**
- Modify: `apps/api/prisma/seed.ts` (add function; call it from `main()`)

- [ ] **Step 1: Add `seedNewsCategories()`**

In `apps/api/prisma/seed.ts`, add this function above `main()`. It upserts by `slug`, so it is safe to run repeatedly and independent of the existing product-page seed guard:

```ts
async function seedNewsCategories() {
  const now = new Date();
  const cats: Array<{
    slug: string;
    title: string;
    newsCategoryKey: 'STAFF_PICKS' | 'HIGHLIGHTS' | 'NEWS' | 'INTERVIEW';
    kicker: string;
    headline: string;
    salesCopy: string;
  }> = [
    {
      slug: 'staff-picks',
      title: 'Staff Picks',
      newsCategoryKey: 'STAFF_PICKS',
      kicker: 'FROM THE COUNTER',
      headline: 'What we can’t stop playing.',
      salesCopy:
        'The records and tapes the shop keeps reaching for — chosen by the people who file them.',
    },
    {
      slug: 'highlights',
      title: 'Highlights',
      newsCategoryKey: 'HIGHLIGHTS',
      kicker: 'THIS WEEK',
      headline: 'On the wall, right now.',
      salesCopy: 'New arrivals and the pressings we want you to hear first.',
    },
    {
      slug: 'news',
      title: 'News',
      newsCategoryKey: 'NEWS',
      kicker: 'DISPATCHES',
      headline: 'From the shop and the labels we love.',
      salesCopy: 'Restocks, events, and word from the wider record community.',
    },
    {
      slug: 'interview',
      title: 'Interview',
      newsCategoryKey: 'INTERVIEW',
      kicker: 'IN CONVERSATION',
      headline: 'The people behind the records.',
      salesCopy: 'Artists, labels, and collectors, in their own words.',
    },
  ];

  for (const c of cats) {
    await prisma.categoryPage.upsert({
      where: { slug: c.slug },
      update: {}, // never clobber edits made in the CMS
      create: {
        slug: c.slug,
        title: c.title,
        kind: 'NEWS_CATEGORY',
        newsCategoryKey: c.newsCategoryKey,
        template: 'HALF_HERO',
        kicker: c.kicker,
        headline: c.headline,
        salesCopy: c.salesCopy,
        status: 'PUBLISHED',
        publishedAt: now,
      },
    });
  }

  console.log('✓ Seeded/verified 4 news categories (staff-picks, highlights, news, interview)');
}
```

- [ ] **Step 2: Call it from `main()`**

Change `main()` to:

```ts
async function main() {
  await seedAdmin();
  await seedCategoryPages();
  await seedNewsCategories();
}
```

- [ ] **Step 3: Run the seed**

Run: `cd apps/api && npx prisma db seed`
(If `db seed` is not wired in `package.json`, run `npx ts-node prisma/seed.ts`.)
Expected: prints the "Seeded/verified 4 news categories" line; re-running does not duplicate.

- [ ] **Step 4: Verify idempotency + rows**

Run: `cd apps/api && npx prisma db seed`
Expected: same success output, still exactly 4 `NEWS_CATEGORY` rows (upsert `update: {}` is a no-op).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(cms): seed four news categories as NEWS_CATEGORY pages"
```

---

## Task 3: DTOs — accept `kind` + `newsCategoryKey`

**Files:**
- Modify: `apps/api/src/category-pages/dto/create-category-page.dto.ts`
- Modify: `apps/api/src/category-pages/dto/category-page-filter.dto.ts`

- [ ] **Step 1: Extend the create DTO**

In `create-category-page.dto.ts`, add `CategoryPageKind` and `PostCategory` to the `@prisma/client` import, then add these optional fields at the end of the class:

```ts
  @IsOptional()
  @IsEnum(CategoryPageKind)
  kind?: CategoryPageKind;

  @IsOptional()
  @IsEnum(PostCategory)
  newsCategoryKey?: PostCategory;
```

Updated import line:

```ts
import {
  CategoryPageStatus,
  CategoryPageTemplate,
  CategoryPageKind,
  PostCategory,
  RecordFormat,
} from '@prisma/client';
```

(`UpdateCategoryPageDto extends PartialType(CreateCategoryPageDto)` — it inherits these automatically.)

- [ ] **Step 2: Extend the filter DTO**

In `category-page-filter.dto.ts`, add `CategoryPageKind` to the import and this field to the class:

```ts
  @IsOptional() @IsEnum(CategoryPageKind) kind?: CategoryPageKind;
```

- [ ] **Step 3: Type-check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/category-pages/dto
git commit -m "feat(cms): category-page DTOs accept kind + newsCategoryKey"
```

---

## Task 4: Service — filter by `kind`; storefront resolver returns posts

**Files:**
- Modify: `apps/api/src/category-pages/category-pages.service.ts` (`findAll`, ~line with `const where`)
- Modify: `apps/api/src/storefront/storefront.service.ts` (`categoryPage`, ~line 78)
- Create: `apps/api/src/storefront/storefront.service.spec.ts`

- [ ] **Step 1: Write the failing test for the storefront resolver**

Create `apps/api/src/storefront/storefront.service.spec.ts`:

```ts
import { StorefrontService } from './storefront.service';

/** In-memory Prisma stub covering categoryPage.findUnique + post.findMany. */
function makePrisma(page: any, posts: any[]) {
  return {
    categoryPage: { findUnique: jest.fn(async () => page) },
    post: { findMany: jest.fn(async () => posts) },
  } as any;
}

describe('StorefrontService.categoryPage', () => {
  it('attaches posts for a NEWS_CATEGORY page', async () => {
    const page = {
      slug: 'staff-picks',
      status: 'PUBLISHED',
      kind: 'NEWS_CATEGORY',
      newsCategoryKey: 'STAFF_PICKS',
    };
    const posts = [{ id: 'p1', slug: 'a', status: 'PUBLISHED' }];
    const svc = new StorefrontService(makePrisma(page, posts));

    const result: any = await svc.categoryPage('staff-picks');

    expect(result.posts).toEqual(posts);
  });

  it('does not attach posts for a PRODUCT_PAGE', async () => {
    const page = { slug: 'lps', status: 'PUBLISHED', kind: 'PRODUCT_PAGE', newsCategoryKey: null };
    const svc = new StorefrontService(makePrisma(page, []));

    const result: any = await svc.categoryPage('lps');

    expect(result.posts).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && npx jest src/storefront/storefront.service.spec.ts`
Expected: FAIL — `result.posts` is `undefined` in the first test (resolver doesn't attach posts yet).

- [ ] **Step 3: Implement the resolver branch**

In `apps/api/src/storefront/storefront.service.ts`, replace the `categoryPage` method with:

```ts
  async categoryPage(slug: string) {
    const p = await this.prisma.categoryPage.findUnique({ where: { slug } });
    if (!p || p.status !== 'PUBLISHED') throw new NotFoundException();

    if (p.kind === 'NEWS_CATEGORY' && p.newsCategoryKey) {
      const posts = await this.prisma.post.findMany({
        where: { status: 'PUBLISHED', category: p.newsCategoryKey },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      });
      return { ...p, posts };
    }

    return p;
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx jest src/storefront/storefront.service.spec.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Add the `kind` filter to `findAll`**

In `apps/api/src/category-pages/category-pages.service.ts`, in `findAll`, after the `const { page = 1, limit = 50, status, template, search } = filter;` line add `kind` to the destructure and the where clause:

```ts
    const { page = 1, limit = 50, status, template, search, kind } = filter;
```

and after `if (template) where.template = template;` add:

```ts
    if (kind) where.kind = kind;
```

- [ ] **Step 6: Type-check + full unit suite**

Run: `cd apps/api && npx tsc --noEmit && npx jest`
Expected: no type errors; all specs pass (including the new storefront spec).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/storefront apps/api/src/category-pages/category-pages.service.ts
git commit -m "feat(cms): storefront resolves posts for news-category pages; filter category-pages by kind"
```

---

## Task 5: Back-office — Archives tab lists + links every archive page

**Files:**
- Modify: `apps/backoffice/src/api/categoryPages.ts`
- Modify: `apps/backoffice/src/pages/cms/CmsHub.tsx` (`ArchivesPanel`; delete `NEWS_CATEGORIES` archive rows)

- [ ] **Step 1: Extend the API client types**

In `apps/backoffice/src/api/categoryPages.ts`:

Add the kind type near the other type aliases:

```ts
export type CategoryPageKind = 'PRODUCT_PAGE' | 'NEWS_CATEGORY';
export type NewsCategoryKey = 'STAFF_PICKS' | 'HIGHLIGHTS' | 'NEWS' | 'INTERVIEW';
```

Add these two fields to the `CategoryPage` interface (after `template`):

```ts
  kind: CategoryPageKind;
  newsCategoryKey?: NewsCategoryKey | null;
```

Add `kind` to `CategoryPageFilter`:

```ts
  kind?: CategoryPageKind;
```

- [ ] **Step 2: Rewrite `ArchivesPanel` to render all rows from the API**

In `apps/backoffice/src/pages/cms/CmsHub.tsx`, replace the entire `ArchivesPanel` function with a version that (a) drops the hardcoded `NEWS_CATEGORIES` rows, (b) renders a `kind` badge, and (c) links each row to the category-page editor. Use the existing editor route (`useNavigate` to the same route `CategoryPagesList` uses for a row — reuse that path; if the list navigates to `/cms/pages/:id` or `/category-pages/:id/edit`, match it exactly):

```tsx
function ArchivesPanel() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<CategoryPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategoryPages({ limit: 100 }).then(r => setPages(r.data)).finally(() => setLoading(false));
  }, []);

  const kindBadge = (k: CategoryPage['kind']) =>
    k === 'NEWS_CATEGORY'
      ? <Badge variant="neutral">News category</Badge>
      : <Badge variant="brand">Product page</Badge>;

  const slugHref = (p: CategoryPage) =>
    p.kind === 'NEWS_CATEGORY' ? `/journal?category=${p.slug}` : `/pages/${p.slug}`;

  return (
    <Panel title="All archive pages" note={loading ? undefined : `${pages.length} total`}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#0d0d0d]">
            {['Title', 'Kind', 'Slug', 'Template', 'Status'].map(h => (
              <th key={h} className={thCls}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <EmptyRow cols={5}>Loading…</EmptyRow>}
          {!loading && pages.map(p => (
            <tr
              key={p.id}
              onClick={() => navigate(editorPathFor(p.id))}
              className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              <td className={tdCls}>
                <span className="font-semibold text-[var(--text-primary)]">{p.title}</span>
              </td>
              <td className={tdCls}>{kindBadge(p.kind)}</td>
              <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{slugHref(p)}</td>
              <td className={tdCls}>{TEMPLATE_LABELS[p.template] ?? p.template}</td>
              <td className={tdCls}><StatusPill value={STATUS_LABELS[p.status] ?? p.status} /></td>
            </tr>
          ))}
          {!loading && pages.length === 0 && <EmptyRow cols={5}>No archive pages yet.</EmptyRow>}
        </tbody>
      </table>
    </Panel>
  );
}
```

- [ ] **Step 3: Define `editorPathFor` to match the existing editor route**

Open `apps/backoffice/src/pages/category-pages/CategoryPagesList.tsx` and find how a row navigates to its editor (the `onClick`/`Link` target). Add a small helper near the top of `CmsHub.tsx` returning that exact path, e.g. if the route is `/cms/pages/:id/edit`:

```tsx
const editorPathFor = (id: string) => `/cms/pages/${id}/edit`;
```

Replace the literal above with the real route string discovered in `CategoryPagesList.tsx` (and confirm the router registers it). Update the `import` line at the top of `CmsHub.tsx` to add `useNavigate`:

```tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
```

- [ ] **Step 4: Remove the now-unused `NEWS_CATEGORIES` archive usage**

`NEWS_CATEGORIES` is still used by `CategoryCountsPanel` (News tab counts) — keep the constant. Only its use inside `ArchivesPanel` is removed (done in Step 2). Verify no unused-import/lint errors.

- [ ] **Step 5: Type-check + build**

Run: `cd apps/backoffice && npx tsc --noEmit && npx vite build`
Expected: no type errors; build succeeds.

- [ ] **Step 6: Visual verification (preview)**

Start the back-office dev server (`preview_start` with the backoffice launch config, `VITE_API_TARGET` pointed at the API), navigate to `/backoffice/cms?tab=archives`, and confirm: the four news categories now appear with the "News category" badge, real `/journal?category=…` slugs, "Half hero" template, and a "Published" status (no more "—"); clicking any row opens its editor. Screenshot for the user.

- [ ] **Step 7: Commit**

```bash
git add apps/backoffice/src/api/categoryPages.ts apps/backoffice/src/pages/cms/CmsHub.tsx
git commit -m "feat(cms): Archives tab lists + links every archive page (incl. editable news categories)"
```

---

## Task 6: Deploy Phase 1

**Files:** none (deploy scripts under `deploy/docker`)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/storefront-inline-cms
```

- [ ] **Step 2: Open a PR to `main`**

Use `gh pr create` with a summary of Phase 1 (schema + seed + DTO/service + Archives tab) and a test plan. Merge once green (the API image runs `prisma migrate deploy` on start, so the migration applies automatically on deploy).

- [ ] **Step 3: Deploy + verify on prod**

Run the deploy (`deploy/docker/deploy-app.sh` per the runbook). After deploy: confirm the migration applied (API logs), the seed ran (four news categories exist — run the seed once against prod if the deploy does not), and `GET /api/v1/storefront/category-pages/staff-picks` returns the page **with a `posts` array**. Confirm the back-office Archives tab on `mediumformat.info/backoffice/cms?tab=archives` shows the editable news categories.

---

## Later Phases (roadmap — expand into their own plans as we steer)

Per the incremental-delivery decision, Phases 2–5 get their own plans once Phase 1 is shipped and reviewed. Scoped now so nothing is ambiguous:

- **Phase 2 — Storefront admin session.** `apps/storefront/src/admin/auth.ts` (read back-office JWT from shared-origin `localStorage`; verify via `GET /auth/me`; login popover fallback via `POST /auth/login`; authed axios instance) + `admin/AdminEditContext.tsx` (provider/hook) + `admin/EditModeToggle.tsx`. Gate all edit UI on role ∈ {ADMIN, MANAGER}. Confirm the exact `localStorage` token key the back-office writes.
- **Phase 3 — Inline-edit core + first page.** `admin/Editable.tsx` (click-to-edit: text/richtext/select), `admin/SaveBar.tsx` (dirty map keyed `entity:id:field`; group + PATCH per entity to `/category-pages/:id`). Wire the category / news-category storefront page (`pages/CategoryPage.tsx`, including rendering the posts grid for news categories) end-to-end. Deploy + validate on prod.
- **Phase 4 — Coverage.** Extend `Editable` to blog posts (`pages/NewsDetail.tsx` → `PATCH /posts/:id`), release/product copy (`pages/ReleaseDetail.tsx` → `PATCH /inventory/:id`), and home/landing copy (`pages/Home.tsx`). Sanitize rich-text on save.
- **Phase 5 — Deploy + verify.** Full-coverage deploy; Playwright E2E (login → edit → save → reload persists; anonymous sees no edit UI); responsive screenshots at 375/768/1440.

---

## Self-Review Notes

- **Spec coverage:** D1 (unify into `CategoryPage`) → Tasks 1–5. News-category editability → Tasks 2+5. Storefront resolver returns posts → Task 4. Back-office Archives editable → Task 5. D2/D3 (storefront auth + inline edit) → Phases 2–4 roadmap (own plans, per incremental delivery). Deploy → Task 6.
- **Placeholder scan:** `editorPathFor` (Task 5 Step 3) is the one value that must be read from the existing router/`CategoryPagesList.tsx` rather than guessed — called out explicitly with how to find it.
- **Type consistency:** `CategoryPageKind` values (`PRODUCT_PAGE`/`NEWS_CATEGORY`) and `newsCategoryKey` (`PostCategory`) are identical across schema, migration, DTOs, seed, service, and the back-office client type.
