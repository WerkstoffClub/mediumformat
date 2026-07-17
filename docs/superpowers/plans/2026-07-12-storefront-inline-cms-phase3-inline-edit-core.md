# Storefront Inline CMS — Phase 3: Inline-Edit Core + Category Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Checkbox steps. Cohesive frontend unit — build the core (Tasks 1–3) then the wiring (Tasks 4–6), review, deploy.

**Goal:** Add WYSIWYG click-to-edit to the storefront: an `Editable` primitive + a floating `SaveBar`, wired into the category page (hero copy fields) with per-entity PATCH saves — plus make the category page render **news categories** (posts grid) so the four seeded ones can be published and edited.

**Architecture:** Extend `AdminEditProvider` (Phase 2) with a dirty-edit store keyed `entity:id:field` and a `save()` that groups edits per entity and PATCHes the existing guarded endpoint (`/category-pages/:id`, via the Phase-2 `adminApi`). An `Editable` component self-gates on `isAdmin && editMode`: transparent plain text to visitors, click-to-edit for admins. Saved values live in a client "saved overlay" (`staged ?? saved ?? serverValue`) so a successful save shows immediately with no reload or refetch flicker.

**Tech Stack:** React 18 + Vite + Tailwind (storefront). Verify: `tsc --noEmit` + `vite build` + browser. No unit runner (project convention).

**Branch:** `feat/storefront-inline-edit-core` (off `main`).

**Scope (Phase 3):** category page only — entity `categoryPage`, text fields `kicker`, `headline`, `salesCopy`, `title`. Blog posts, releases, home copy, and template/status/slug inline editing are **Phase 4** (out of scope). Publishing the 4 news categories is done as a post-deploy data step.

---

## Context an implementer needs

- Phase 2 shipped `apps/storefront/src/admin/{adminAuth.ts,AdminEditContext.tsx,AdminBar.tsx,AdminLoginPopover.tsx}`. `useAdminEdit()` exposes `{ isAdmin, editMode, … }`. `adminApi` is the authed axios instance (bearer from `mf-access-token`). `AdminEditProvider` wraps the app in `App.tsx`; `AdminBar`/`AdminLoginPopover` render in `Shell.tsx`.
- The mutation endpoint `PATCH /api/v1/category-pages/:id` exists and is `@Roles(ADMIN, MANAGER)`; body is a partial of the category-page fields (title/kicker/headline/salesCopy/template/status/etc.). It returns the updated row.
- Storefront category page: `apps/storefront/src/pages/CategoryPage.tsx` renders `<HalfHero page/>` or `<FullHero page/>` then a releases grid. Heroes (`apps/storefront/src/components/category/{FullHero,HalfHero}.tsx`) destructure `page` and render `kicker`/`headline||title`/`salesCopy`/CTA with their own class names (`mf-cat-*`).
- The API resolver already returns `posts` embedded on a `NEWS_CATEGORY` category page (Phase 1). `CategoryPage` type in `apps/storefront/src/api/storefront.ts` currently lacks `kind`/`newsCategoryKey`/`posts`. `Post` type exists there. `NewsList.tsx` has a `PostCard` + `.mf-post-*` styles to mirror for the news grid.
- Design: monochrome tokens (`--ink`,`--body`,`--mute`,`--surface`,`--hairline`,`--accent`,`--accent-text`,`--danger`,`--r-pill`,`--e2`/`--e3`). The edit affordance outline should use `var(--accent)`.

---

## File Structure

- Modify `apps/storefront/src/admin/AdminEditContext.tsx` — add dirty/saved store + `stage`/`getValue`/`discardAll`/`save`, `dirtyCount`, `saving`, `saveError`, `rev`.
- Create `apps/storefront/src/admin/Editable.tsx` — the click-to-edit primitive.
- Create `apps/storefront/src/admin/SaveBar.tsx` — floating unsaved-changes bar.
- Modify `apps/storefront/src/layouts/Shell.tsx` — render `<SaveBar/>`.
- Modify `apps/storefront/src/api/storefront.ts` — `CategoryPageKind` type; add `kind`/`newsCategoryKey`/`posts` to `CategoryPage`.
- Modify `apps/storefront/src/components/category/FullHero.tsx` + `HalfHero.tsx` — render editable text fields via `Editable`.
- Modify `apps/storefront/src/pages/CategoryPage.tsx` — kind-aware grid (posts vs releases) + editable section title.

---

## Task 1: Extend `AdminEditContext` with the edit store + save

**Files:** Modify `apps/storefront/src/admin/AdminEditContext.tsx`

- [ ] **Step 1: Add the store types + state.** Below the existing imports add:

```ts
import { adminApi } from './adminAuth';

export type EditEntity = 'categoryPage';
interface StagedEdit { entity: EditEntity; id: string; field: string; value: string; }
const keyOf = (entity: EditEntity, id: string, field: string) => `${entity}:${id}:${field}`;
```

Extend the `AdminEditValue` interface with:

```ts
  dirtyCount: number;
  saving: boolean;
  saveError: string | null;
  rev: number;                       // bumps on discard/save — Editable resets its DOM on change
  stage: (entity: EditEntity, id: string, field: string, value: string) => void;
  /** Display value: staged edit ?? just-saved value ?? the server value passed in. */
  getValue: (entity: EditEntity, id: string, field: string, serverValue: string) => string;
  discardAll: () => void;
  save: () => Promise<void>;
```

Inside `AdminEditProvider`, add state:

```ts
  const [dirty, setDirty] = useState<Record<string, StagedEdit>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
```

- [ ] **Step 2: Add the store actions** (inside the provider, before the returned value):

```ts
  const stage = useCallback((entity: EditEntity, id: string, field: string, value: string) => {
    setDirty(d => ({ ...d, [keyOf(entity, id, field)]: { entity, id, field, value } }));
  }, []);

  const getValue = useCallback(
    (entity: EditEntity, id: string, field: string, serverValue: string): string => {
      const k = keyOf(entity, id, field);
      if (k in dirty) return dirty[k].value;
      if (k in saved) return saved[k];
      return serverValue;
    },
    [dirty, saved],
  );

  const discardAll = useCallback(() => {
    setDirty({});
    setSaveError(null);
    setRev(r => r + 1);   // force Editable elements to reset their contentEditable DOM
  }, []);

  const save = useCallback(async () => {
    const edits = Object.values(dirty);
    if (edits.length === 0) return;
    setSaving(true);
    setSaveError(null);

    // Group by entity:id, then PATCH each entity once with its changed fields.
    const groups = new Map<string, { entity: EditEntity; id: string; fields: Record<string, string> }>();
    for (const e of edits) {
      const gk = `${e.entity}:${e.id}`;
      const g = groups.get(gk) ?? { entity: e.entity, id: e.id, fields: {} };
      g.fields[e.field] = e.value;
      groups.set(gk, g);
    }

    try {
      for (const g of groups.values()) {
        if (g.entity === 'categoryPage') {
          await adminApi.patch(`/category-pages/${g.id}`, g.fields);
        }
      }
      // Promote saved edits into the client overlay so they stay on screen,
      // then clear the dirty set. No reload / refetch needed.
      setSaved(s => {
        const next = { ...s };
        for (const e of edits) next[keyOf(e.entity, e.id, e.field)] = e.value;
        return next;
      });
      setDirty({});
      setRev(r => r + 1);
    } catch (err) {
      setSaveError(
        axios.isAxiosError(err) && err.response?.status === 401
          ? 'Your session expired — sign in again.'
          : 'Save failed — please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [dirty]);
```

- [ ] **Step 3: Expose them** in the context value object, and add `dirtyCount: Object.keys(dirty).length` there. Also clear the store on `signOut` (add `setDirty({}); setSaved({});` inside the existing `signOut`).

- [ ] **Step 4: Type-check.** `cd apps/storefront && npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add apps/storefront/src/admin/AdminEditContext.tsx
git commit -m "feat(storefront): edit store (stage/getValue/save) in AdminEditProvider"
```

---

## Task 2: `Editable.tsx` primitive

**Files:** Create `apps/storefront/src/admin/Editable.tsx`

Self-gating click-to-edit. Read mode (or non-admin / edit-mode-off): render `<As className>{display}</As>` — or `null` when `display` is empty and not editing (preserves the "hide empty field" behaviour). Edit mode: same element, `contentEditable`, with an accent dashed outline; the DOM text is set imperatively (via ref) so React re-renders never move the caret; `onInput` stages the new text.

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useRef, type ElementType } from 'react';
import { useAdminEdit } from './AdminEditContext';
import type { EditEntity } from './AdminEditContext';

interface EditableProps {
  entity: EditEntity;
  id: string;
  field: string;
  value: string | null;
  /** Displayed (read-mode only) when value is empty — e.g. title behind a headline. */
  fallback?: string | null;
  as?: ElementType;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function Editable({
  entity, id, field, value, fallback, as, className, placeholder, multiline,
}: EditableProps) {
  const { isAdmin, editMode, getValue, stage, rev } = useAdminEdit();
  const ref = useRef<HTMLElement>(null);
  const As: ElementType = as ?? 'span';
  const editing = isAdmin && editMode;

  const current = getValue(entity, id, field, value ?? '');
  const display = current || (editing ? '' : (fallback ?? '') || '');

  // In edit mode, set the DOM text imperatively and DON'T pass children —
  // this stops React from resetting the caret on each keystroke/re-render.
  useEffect(() => {
    if (editing && ref.current && ref.current.textContent !== current) {
      ref.current.textContent = current;
    }
  }, [editing, rev]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editing) {
    if (!display) return null;   // hide empty fields for visitors (matches current behaviour)
    return <As className={className}>{display}</As>;
  }

  return (
    <As
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder ?? field}
      data-editable={field}
      data-empty={current ? undefined : ''}
      style={{
        outline: '1px dashed var(--accent)',
        outlineOffset: '3px',
        borderRadius: '3px',
        cursor: 'text',
        minWidth: '1ch',
      }}
      onInput={e => stage(entity, id, field, (e.currentTarget.textContent ?? '').replace(/\n{2,}/g, multiline ? '\n' : ' '))}
      onKeyDown={e => { if (!multiline && e.key === 'Enter') e.preventDefault(); }}
    />
  );
}
```

- [ ] **Step 2: Add a placeholder style** (empty editable shows its field name faintly). Append to `apps/storefront/src/index.css`:

```css
[data-editable][data-empty]:empty::before {
  content: attr(aria-label);
  color: var(--mute);
  opacity: .6;
}
```

- [ ] **Step 3: Type-check.** `cd apps/storefront && npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit.**
```bash
git add apps/storefront/src/admin/Editable.tsx apps/storefront/src/index.css
git commit -m "feat(storefront): Editable click-to-edit primitive"
```

---

## Task 3: `SaveBar.tsx` + mount

**Files:** Create `apps/storefront/src/admin/SaveBar.tsx`; modify `apps/storefront/src/layouts/Shell.tsx`

- [ ] **Step 1: Write the SaveBar** (visible only when admin, edit mode, and there are unsaved changes; floats above the AdminBar):

```tsx
import { useAdminEdit } from './AdminEditContext';

export function SaveBar() {
  const { isAdmin, editMode, dirtyCount, saving, saveError, save, discardAll } = useAdminEdit();
  if (!isAdmin || !editMode || dirtyCount === 0) return null;

  return (
    <div
      className="fixed left-1/2 z-[215] flex items-center gap-3 -translate-x-1/2 rounded-[var(--r-pill)] px-4 py-2 text-[13px] backdrop-blur"
      style={{
        bottom: 'calc(var(--player-h) + 72px)',
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        boxShadow: 'var(--e3)',
        color: 'var(--ink)',
      }}
      role="region"
      aria-label="Unsaved changes"
    >
      <span style={{ color: 'var(--body)' }}>
        {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
      </span>
      {saveError && <span style={{ color: 'var(--danger)' }}>{saveError}</span>}
      <button
        type="button"
        onClick={discardAll}
        disabled={saving}
        className="text-[12px]"
        style={{ color: 'var(--mute)' }}
      >
        Discard
      </button>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-[var(--r-pill)] px-3 py-1 text-[12px] font-medium disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Mount in Shell.** In `apps/storefront/src/layouts/Shell.tsx`, import `{ SaveBar }` and render it next to `<AdminBar/>`:

```tsx
      <AdminBar />
      <SaveBar />
      <AdminLoginPopover />
```

- [ ] **Step 3: Type-check + build.** `cd apps/storefront && npx tsc --noEmit && npx vite build` → clean.

- [ ] **Step 4: Commit.**
```bash
git add apps/storefront/src/admin/SaveBar.tsx apps/storefront/src/layouts/Shell.tsx
git commit -m "feat(storefront): floating SaveBar (save/discard staged edits)"
```

---

## Task 4: API types — `kind` / `newsCategoryKey` / `posts`

**Files:** Modify `apps/storefront/src/api/storefront.ts`

- [ ] **Step 1:** Add the kind type near `CategoryPageTemplate`:

```ts
export type CategoryPageKind = 'PRODUCT_PAGE' | 'NEWS_CATEGORY';
```

- [ ] **Step 2:** Add these fields to the `CategoryPage` interface (after `template`):

```ts
  kind: CategoryPageKind;
  newsCategoryKey: string | null;
  posts?: Post[];          // present only for NEWS_CATEGORY pages (embedded by the resolver)
```

(`Post` is already defined above in this file.)

- [ ] **Step 3: Type-check.** `cd apps/storefront && npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit.**
```bash
git add apps/storefront/src/api/storefront.ts
git commit -m "feat(storefront): CategoryPage type carries kind + embedded posts"
```

---

## Task 5: Editable hero fields

**Files:** Modify `apps/storefront/src/components/category/FullHero.tsx`, `HalfHero.tsx`

For each hero, replace the raw text nodes with `Editable`, keeping the exact class names so styling is unchanged for visitors. `import { Editable } from '../../admin/Editable';`

- [ ] **Step 1: FullHero.** Replace the kicker/headline/copy block:

```tsx
        <Editable entity="categoryPage" id={page.id} field="kicker" value={kicker}
          as="span" className="mf-cat-full-hero-kicker" placeholder="Kicker" />
        <Editable entity="categoryPage" id={page.id} field="headline" value={headline} fallback={title}
          as="h1" className="mf-cat-full-hero-h1" placeholder="Headline" />
        <Editable entity="categoryPage" id={page.id} field="salesCopy" value={salesCopy} multiline
          as="p" className="mf-cat-full-hero-copy" placeholder="Sales copy" />
```

Keep the `id="mf-cat-full-hero-title"` on the h1 by adding it — `Editable` forwards unknown props? It does NOT; instead leave the `aria-labelledby` on the section pointing at the h1 but drop the id dependency, OR keep a plain `<h1 id=…>` wrapper. Simplest: remove `aria-labelledby`/`id` coupling and give the section `aria-label={title}` instead. Apply that change to the `<section>` (replace `aria-labelledby="mf-cat-full-hero-title"` with `aria-label={title || 'Category'}`).

- [ ] **Step 2: HalfHero.** Same substitution with the half-hero class names (`mf-cat-half-hero-kicker`, `mf-cat-half-hero-h1`, `mf-cat-half-hero-lede`), and the same `aria-labelledby`→`aria-label={title}` change on its `<section>`.

- [ ] **Step 3: Type-check + build.** `cd apps/storefront && npx tsc --noEmit && npx vite build` → clean.

- [ ] **Step 4: Commit.**
```bash
git add apps/storefront/src/components/category/FullHero.tsx apps/storefront/src/components/category/HalfHero.tsx
git commit -m "feat(storefront): inline-editable hero copy (kicker/headline/salesCopy)"
```

---

## Task 6: Kind-aware category page + editable section title

**Files:** Modify `apps/storefront/src/pages/CategoryPage.tsx`

- [ ] **Step 1: Render posts for news categories.** After fetching the page, branch: a `NEWS_CATEGORY` page uses `p.posts` (already embedded) for its grid; a product page fetches releases as today. Replace the fetch/`.then` body so that for `p.kind === 'NEWS_CATEGORY'` it does NOT call `listReleases` (uses `p.posts ?? []`), and add `posts` state. Import `Editable`, `type Post`, and reuse a local `PostCard` (copy the `PostCard` component + the `.mf-post-*` CSS from `NewsList.tsx`, or extract `PostCard` into `apps/storefront/src/components/PostCard.tsx` and import it in both — prefer extracting to avoid duplication).

Concretely:
```tsx
  const [posts, setPosts] = useState<Post[]>([]);
  const isNews = page?.kind === 'NEWS_CATEGORY';
  // in the fetch .then:
  if (p.kind === 'NEWS_CATEGORY') { setPosts(p.posts ?? []); setReleases([]); }
  else { /* existing listReleases(...) */ }
```

- [ ] **Step 2: Editable section title + kind-aware grid.** Make the section heading editable, and render the right grid:

```tsx
        <Editable entity="categoryPage" id={page.id} field="title" value={page.title}
          as="h2" className="text-[22px] md:text-[26px] font-semibold"
          placeholder="Section title" />
```
(keep the surrounding `style` by moving those styles into the className or leaving them on a wrapping element — the existing h2 uses inline `style`; put that style on the `Editable` via className utilities or wrap. Simplest: keep the count/title row layout, swap the `<h2 style=…>` for the `Editable` and move its colour/tracking to a small local class or inline the same look with tailwind arbitrary values `text-[color:var(--ink)] tracking-[-0.03em]`.)

Grid:
```tsx
        {isNews ? (
          posts.length === 0
            ? <EmptyState>No posts in this category yet.</EmptyState>
            : <div className="mf-news-grid">{posts.map(p => <PostCard key={p.id} post={p} />)}</div>
        ) : ( /* existing releases grid / error / empty */ )}
```
Adjust the count label to read “N post(s)” vs “N record(s)” by kind.

- [ ] **Step 3: Extract `PostCard`.** Create `apps/storefront/src/components/PostCard.tsx` exporting the `PostCard` (moved verbatim from `NewsList.tsx`, including its `formatDate` helper) and the `.mf-post-*` + `.mf-news-grid` styles (as a `<style>` block in the component, or leave the styles in a shared place). Update `NewsList.tsx` to import it and delete its local copy. Keep behaviour identical.

- [ ] **Step 4: Type-check + build.** `cd apps/storefront && npx tsc --noEmit && npx vite build` → clean.

- [ ] **Step 5: Commit.**
```bash
git add apps/storefront/src/pages/CategoryPage.tsx apps/storefront/src/components/PostCard.tsx apps/storefront/src/pages/NewsList.tsx
git commit -m "feat(storefront): kind-aware category page (posts grid) + editable section title"
```

---

## Task 7: Deploy, publish news categories, verify

- [ ] **Step 1:** Push → PR → merge to `main`; sync local `main`.
- [ ] **Step 2:** `./deploy/docker/deploy-app.sh` (storefront rebuild; backend unchanged).
- [ ] **Step 3: Publish the 4 news categories** now that they render correctly. Via authenticated API (admin token) or directly:
  `docker exec mediumformat-db psql -U mf -d mediumformat -c "UPDATE \"CategoryPage\" SET status='PUBLISHED', \"publishedAt\"=now() WHERE kind='NEWS_CATEGORY' AND status='DRAFT';"`
  (Prefer the API/back-office if you want the audit path, but SQL is acceptable for a one-off state flip.)
- [ ] **Step 4: Verify on prod (browser, logged-in admin):**
  - Product page `/pages/lps`: enter edit mode → hero kicker/headline/sales copy show the dashed edit outline → change the headline → **SaveBar** shows “1 unsaved change” → Save → the new headline stays (no reload) → open an incognito/logged-out load of `/pages/lps` and confirm the change persisted publicly.
  - News page `/pages/staff-picks`: renders the hero + a **posts grid** (not records). Editable hero fields work there too.
  - Anonymous visitor: no edit outlines, no bars.
  - Screenshot proof (note: storefront CSP blocks the browser-tool screenshot injection — verify via `javascript_tool`/DOM if screenshots fail).

---

## Self-Review Notes

- **Spec D3 coverage:** `Editable` (text, self-gating) — Task 2; dirty store keyed `entity:id:field` + `SaveBar` grouping + PATCH `/category-pages/:id` via `adminApi` — Task 1/3; wired to the category page hero + section — Task 5/6. Template/status/slug + posts/releases/home editing correctly deferred to Phase 4.
- **News-category rendering + publish** (the Phase-1 DRAFT deferral) — Task 6 + Task 7 Step 3.
- **No-reload save model:** `getValue` = `staged ?? saved ?? serverValue`; Save promotes staged→saved. `rev` bump forces `Editable` to re-sync its contentEditable DOM after save/discard (prevents stale caret text).
- **Placeholder/adaptation steps:** Task 5 (aria id→aria-label swap) and Task 6 (moving the h2 inline-style onto the Editable, extracting PostCard) are the judgement points — called out explicitly.
- **Type consistency:** `EditEntity`/`stage`/`getValue`/`rev` defined in `AdminEditContext` and consumed unchanged by `Editable`/`SaveBar`; `CategoryPageKind` matches the back-office/API string union (`PRODUCT_PAGE`/`NEWS_CATEGORY`).
- **No unit runner** — `tsc` + `vite build` + browser (project convention); the risky bit (contentEditable caret) is verified live in Task 7.
