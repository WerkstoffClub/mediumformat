import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPost, getPost, updatePost, type PostCategory, type PostStatus } from '../../api/posts';

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'STAFF_PICKS', label: 'Staff Picks' },
  { value: 'HIGHLIGHTS',  label: 'Highlights' },
  { value: 'NEWS',        label: 'News' },
  { value: 'INTERVIEW',   label: 'Interview' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]";

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function PostForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', body: '',
    coverUrl: '', category: 'NEWS' as PostCategory, status: 'DRAFT' as PostStatus,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (isEdit && id) {
      getPost(id).then(p => setForm({
        title: p.title, slug: p.slug, excerpt: p.excerpt ?? '',
        body: p.body, coverUrl: p.coverUrl ?? '',
        category: p.category, status: p.status,
      })).catch(() => navigate('/cms?tab=news'));
    }
  }, [id, isEdit, navigate]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({
        ...f,
        [field]: e.target.value,
        // Auto-slug from title on new posts
        ...(field === 'title' && !isEdit ? { slug: slugify(e.target.value) } : {}),
      }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      ...form,
      coverUrl: form.coverUrl || undefined,
      excerpt:  form.excerpt  || undefined,
    };
    try {
      if (isEdit && id) await updatePost(id, payload);
      else await createPost(payload);
      navigate('/cms?tab=news');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save post.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] mb-5">
        {isEdit ? 'Edit Post' : 'New Post'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <Field label="Title *">
            <input className={inputCls} value={form.title} onChange={set('title')} required minLength={3} />
          </Field>
          <Field label="Slug *">
            <input className={`${inputCls} font-mono`} value={form.slug} onChange={set('slug')} required placeholder="auto-generated-from-title" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
          </div>
          <Field label="Cover Image URL">
            <input className={inputCls} value={form.coverUrl} onChange={set('coverUrl')} placeholder="https://..." type="url" />
          </Field>
          <Field label="Excerpt">
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.excerpt} onChange={set('excerpt')} placeholder="Short summary shown in listings..." />
          </Field>
          <Field label="Body *">
            <textarea className={`${inputCls} resize-y font-mono text-[11px]`} rows={12} value={form.body} onChange={set('body')} required minLength={10} placeholder="Write your post content here (Markdown supported in Phase 3 storefront)..." />
          </Field>
        </div>
        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/cms?tab=news')} className="px-4 py-2 border border-[var(--border)] rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--accent-text)] text-[12px] font-bold rounded-md disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
