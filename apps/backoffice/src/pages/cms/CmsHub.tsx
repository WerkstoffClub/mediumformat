import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Panel, Tabs, thCls, tdCls, StatusPill, EmptyRow, type TabDef } from '../../components/ui/Page';
import { Badge } from '../../components/ui/Badge';
import { BlogList } from '../blog/BlogList';
import { CategoryPagesList } from '../category-pages/CategoryPagesList';
import { getPosts, type PostCategory } from '../../api/posts';
import { listCategoryPages, type CategoryPage } from '../../api/categoryPages';

type CmsTab = 'news' | 'pages' | 'archives';

const TABS: TabDef[] = [
  { key: 'news', label: 'News' },
  { key: 'pages', label: 'Pages' },
  { key: 'archives', label: 'Archives' },
];

const SUBS: Record<CmsTab, string> = {
  news: 'Blog posts, organised by category — the storefront journal.',
  pages: 'Landing and category pages served on the storefront.',
  archives: 'Every archive page — product category pages and news categories — in one place.',
};

const isCmsTab = (v: string | null): v is 'pages' | 'archives' => v === 'pages' || v === 'archives';

/** The four fixed PostCategory values (see api/posts.ts) — no dedicated
 *  endpoint for categories, so they're enumerated here alongside a
 *  derived slug used only for the Archives overview below. */
const NEWS_CATEGORIES: { value: PostCategory; label: string; slug: string }[] = [
  { value: 'STAFF_PICKS', label: 'Staff Picks', slug: 'staff-picks' },
  { value: 'HIGHLIGHTS',  label: 'Highlights',  slug: 'highlights' },
  { value: 'NEWS',        label: 'News',        slug: 'news' },
  { value: 'INTERVIEW',   label: 'Interview',   slug: 'interview' },
];

const TEMPLATE_LABELS: Record<string, string> = {
  FULL_HERO: 'Full hero',
  HALF_HERO: 'Half hero',
};

const STATUS_LABELS: Record<CategoryPage['status'], string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
};

function setTabParam(params: URLSearchParams, key: string): URLSearchParams {
  const next = new URLSearchParams(params);
  if (key === 'news') next.delete('tab'); else next.set('tab', key);
  return next;
}

/** Right-rail panel on the News tab — post counts per category, fetched
 *  as lightweight `limit: 1` calls (only the `total` is used). */
function CategoryCountsPanel() {
  const [counts, setCounts] = useState<Partial<Record<PostCategory, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      NEWS_CATEGORIES.map(c => getPosts({ category: c.value, limit: 1 }).then(r => r.total).catch(() => 0)),
    ).then(totals => {
      if (cancelled) return;
      const next: Partial<Record<PostCategory, number>> = {};
      NEWS_CATEGORIES.forEach((c, i) => { next[c.value] = totals[i]; });
      setCounts(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <Panel title="Categories / Tags">
      <ul>
        {NEWS_CATEGORIES.map(c => (
          <li
            key={c.value}
            className="flex items-center justify-between px-3.5 py-2.5 text-[12px] border-b border-[var(--border-sub)] last:border-b-0"
          >
            <span className="text-[var(--text-primary)]">{c.label}</span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {loading ? '…' : (counts[c.value] ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Read-only union of every archive/category page — product category
 *  pages (from the category-pages API) plus the fixed news categories —
 *  so slug + template assignment can be audited from one screen. */
function ArchivesPanel() {
  const [pages, setPages] = useState<CategoryPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategoryPages({ limit: 100 }).then(r => setPages(r.data)).finally(() => setLoading(false));
  }, []);

  const totalRows = pages.length + NEWS_CATEGORIES.length;

  return (
    <Panel title="All archive pages" note={loading ? undefined : `${totalRows} total`}>
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
            <tr key={p.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
              <td className={tdCls}>
                <span className="font-semibold text-[var(--text-primary)]">{p.title}</span>
              </td>
              <td className={tdCls}><Badge variant="brand">Product page</Badge></td>
              <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>/pages/{p.slug}</td>
              <td className={tdCls}>{TEMPLATE_LABELS[p.template] ?? p.template}</td>
              <td className={tdCls}><StatusPill value={STATUS_LABELS[p.status] ?? p.status} /></td>
            </tr>
          ))}
          {!loading && NEWS_CATEGORIES.map(c => (
            <tr key={c.value} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
              <td className={tdCls}>
                <span className="font-semibold text-[var(--text-primary)]">{c.label}</span>
              </td>
              <td className={tdCls}><Badge variant="neutral">News category</Badge></td>
              <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>/journal?category={c.slug}</td>
              <td className={`${tdCls} text-[var(--text-faint)]`}>—</td>
              <td className={tdCls}><StatusPill value={null} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** CMS hub — merges the former standalone Blog and Category pages surfaces
 *  under one tabbed page (News / Pages / Archives), URL-persisted like
 *  Sales and Purchase Orders. */
export function CmsHub() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: CmsTab = isCmsTab(raw) ? raw : 'news';

  const setTab = (key: string) => setParams(setTabParam(params, key), { replace: true });

  return (
    <div>
      <PageHeader title="CMS" sub={SUBS[tab]} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          <BlogList />
          <CategoryCountsPanel />
        </div>
      )}
      {tab === 'pages' && <CategoryPagesList />}
      {tab === 'archives' && <ArchivesPanel />}
    </div>
  );
}
