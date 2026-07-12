import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCategoryPage,
  getCategoryPage,
  updateCategoryPage,
  type CategoryPageStatus,
  type CategoryPageTemplate,
  type CreateCategoryPageInput,
  type RecordFormat,
} from '../../api/categoryPages';

const FORMATS: Array<{ value: '' | RecordFormat; label: string }> = [
  { value: '',            label: 'No filter (show all)' },
  { value: 'LP',          label: 'LP' },
  { value: 'TWO_LP',      label: '2×LP' },
  { value: 'THREE_LP',    label: '3×LP' },
  { value: 'TWELVE_INCH', label: '12"' },
  { value: 'SEVEN_INCH',  label: '7"' },
  { value: 'CD',          label: 'CD' },
  { value: 'TWO_CD',      label: '2×CD' },
  { value: 'CASSETTE',    label: 'Cassette' },
  { value: 'MERCH',       label: 'Merch' },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]';

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface TemplateOption {
  value: CategoryPageTemplate;
  label: string;
  description: string;
  Icon: () => JSX.Element;
}

const FullHeroIcon = () => (
  <svg viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[60px] h-[40px]">
    <rect x="1" y="1" width="58" height="30" rx="2" fill="currentColor" fillOpacity="0.08" />
    <text x="30" y="20" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="600">HEADLINE</text>
    <rect x="1" y="33" width="10" height="6" rx="1" />
    <rect x="13" y="33" width="10" height="6" rx="1" />
    <rect x="25" y="33" width="10" height="6" rx="1" />
    <rect x="37" y="33" width="10" height="6" rx="1" />
  </svg>
);

const HalfHeroIcon = () => (
  <svg viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[60px] h-[40px]">
    <rect x="1" y="1" width="28" height="30" rx="2" fill="currentColor" fillOpacity="0.08" />
    <rect x="31" y="1" width="28" height="30" rx="2" />
    <line x1="35" y1="10" x2="55" y2="10" />
    <line x1="35" y1="15" x2="50" y2="15" />
    <line x1="35" y1="22" x2="45" y2="22" strokeWidth={2.2} />
    <rect x="1" y="33" width="10" height="6" rx="1" />
    <rect x="13" y="33" width="10" height="6" rx="1" />
    <rect x="25" y="33" width="10" height="6" rx="1" />
    <rect x="37" y="33" width="10" height="6" rx="1" />
  </svg>
);

const TEMPLATES: TemplateOption[] = [
  {
    value: 'FULL_HERO',
    label: 'Full hero',
    description: 'Full-bleed cinematic hero with headline overlay + product grid below.',
    Icon: FullHeroIcon,
  },
  {
    value: 'HALF_HERO',
    label: 'Half hero',
    description: '50:50 split — image left, editorial headline + sales copy right.',
    Icon: HalfHeroIcon,
  },
];

export function CategoryPageForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<CreateCategoryPageInput>({
    title: '',
    slug: '',
    formatFilter: null,
    template: 'FULL_HERO',
    kicker: '',
    headline: '',
    salesCopy: '',
    heroImageUrl: '',
    ctaLabel: '',
    ctaHref: '',
    seoTitle: '',
    seoDescription: '',
    status: 'DRAFT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [initialStatus, setInitialStatus] = useState<CategoryPageStatus>('DRAFT');

  useEffect(() => {
    if (isEdit && id) {
      getCategoryPage(id)
        .then(p => {
          setForm({
            title: p.title,
            slug: p.slug,
            formatFilter: p.formatFilter ?? null,
            template: p.template,
            kicker: p.kicker ?? '',
            headline: p.headline ?? '',
            salesCopy: p.salesCopy ?? '',
            heroImageUrl: p.heroImageUrl ?? '',
            ctaLabel: p.ctaLabel ?? '',
            ctaHref: p.ctaHref ?? '',
            seoTitle: p.seoTitle ?? '',
            seoDescription: p.seoDescription ?? '',
            status: p.status,
          });
          setInitialStatus(p.status);
        })
        .catch(() => navigate('/cms?tab=pages'));
    }
  }, [id, isEdit, navigate]);

  const setField = <K extends keyof CreateCategoryPageInput>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm(f => ({
        ...f,
        [field]: field === 'formatFilter' && value === '' ? null : value,
        // Auto-slug from title on new pages
        ...(field === 'title' && !isEdit ? { slug: slugify(value) } : {}),
      }));
    };

  const setTemplate = (template: CategoryPageTemplate) =>
    setForm(f => ({ ...f, template }));

  // Convert empty strings to undefined for the API (which treats them as optional).
  const cleanForApi = (): CreateCategoryPageInput => {
    const trimmed = (v: string | null | undefined) =>
      typeof v === 'string' && v.trim() === '' ? null : v;
    return {
      ...form,
      kicker: trimmed(form.kicker),
      headline: trimmed(form.headline),
      salesCopy: trimmed(form.salesCopy),
      heroImageUrl: trimmed(form.heroImageUrl),
      ctaLabel: trimmed(form.ctaLabel),
      ctaHref: trimmed(form.ctaHref),
      seoTitle: trimmed(form.seoTitle),
      seoDescription: trimmed(form.seoDescription),
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = cleanForApi();
      if (isEdit && id) await updateCategoryPage(id, payload);
      else await createCategoryPage(payload);
      navigate('/cms?tab=pages');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save page.'));
    } finally {
      setLoading(false);
    }
  };

  const publishedPreview =
    isEdit && initialStatus === 'PUBLISHED' && form.slug
      ? `/api/v1/storefront/category-pages/${form.slug}`
      : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] mb-5">
        {isEdit ? 'Edit category page' : 'New category page'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template picker */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
            Template
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => {
              const on = form.template === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={`text-left border rounded-md p-3 transition-colors flex gap-3 items-start ${
                    on
                      ? 'border-[var(--brand)] bg-[var(--bg-overlay)]'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                  }`}
                  aria-pressed={on}
                >
                  <span className={on ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    <t.Icon />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-semibold text-[var(--text-primary)] mb-0.5">
                      {t.label}
                    </span>
                    <span className="block text-[10px] text-[var(--text-muted)] leading-snug">
                      {t.description}
                    </span>
                  </span>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border ${
                      on
                        ? 'border-[var(--brand)] bg-[var(--brand)]'
                        : 'border-[var(--text-muted)]'
                    }`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Basics */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <Field label="Title *">
            <input
              className={inputCls}
              value={form.title}
              onChange={setField('title')}
              required
              minLength={2}
              maxLength={120}
            />
          </Field>
          <Field label="Slug *" hint={`Public URL: /pages/${form.slug || 'your-slug'}`}>
            <input
              className={`${inputCls} font-mono`}
              value={form.slug}
              onChange={setField('slug')}
              required
              placeholder="auto-generated-from-title"
              maxLength={120}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Format filter">
              <select
                className={inputCls}
                value={form.formatFilter ?? ''}
                onChange={setField('formatFilter')}
              >
                {FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={setField('status')}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Editorial */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Hero content
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kicker" hint="Small uppercase eyebrow above the headline.">
              <input
                className={inputCls}
                value={form.kicker ?? ''}
                onChange={setField('kicker')}
                placeholder="HI-FI TAPE"
                maxLength={120}
              />
            </Field>
            <Field label="CTA label">
              <input
                className={inputCls}
                value={form.ctaLabel ?? ''}
                onChange={setField('ctaLabel')}
                placeholder="Browse cassettes"
                maxLength={120}
              />
            </Field>
          </div>
          <Field label="Headline">
            <input
              className={inputCls}
              value={form.headline ?? ''}
              onChange={setField('headline')}
              placeholder="The tape underground, curated."
              maxLength={240}
            />
          </Field>
          <Field label="Sales copy">
            <textarea
              className={`${inputCls} resize-y`}
              rows={5}
              value={form.salesCopy ?? ''}
              onChange={setField('salesCopy')}
              placeholder="One paragraph, roughly 80–120 words. Sold to enthusiasts, not shoppers."
              maxLength={4000}
            />
          </Field>
          <Field label="Hero image URL">
            <input
              className={inputCls}
              value={form.heroImageUrl ?? ''}
              onChange={setField('heroImageUrl')}
              placeholder="https://..."
              type="url"
              maxLength={2000}
            />
          </Field>
          <Field label="CTA link">
            <input
              className={inputCls}
              value={form.ctaHref ?? ''}
              onChange={setField('ctaHref')}
              placeholder="/pages/cassettes"
              maxLength={500}
            />
          </Field>
        </div>

        {/* SEO */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">SEO</p>
          <Field label="SEO title">
            <input
              className={inputCls}
              value={form.seoTitle ?? ''}
              onChange={setField('seoTitle')}
              maxLength={240}
            />
          </Field>
          <Field label="SEO description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.seoDescription ?? ''}
              onChange={setField('seoDescription')}
              maxLength={500}
            />
          </Field>
        </div>

        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/cms?tab=pages')}
            className="px-4 py-2 border border-[var(--border)] rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          {publishedPreview && (
            <a
              href={publishedPreview}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 border border-[var(--border)] rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Preview JSON ↗
            </a>
          )}
          <div className="flex-1" />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--accent-text)] text-[12px] font-bold rounded-md disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create page'}
          </button>
        </div>
      </form>
    </div>
  );
}
