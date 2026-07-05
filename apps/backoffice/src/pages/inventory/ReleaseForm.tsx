import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createRelease, getRelease, updateRelease } from '../../api/inventory';
import type { Release } from '@mf/shared';

/* API expects the Prisma enum values; labels follow the prototype */
const FORMATS = [
  ['LP', 'LP'], ['TWO_LP', '2×LP'], ['THREE_LP', '3×LP'], ['TWELVE_INCH', '12" single'],
  ['SEVEN_INCH', '7" single'], ['CD', 'CD'], ['TWO_CD', '2×CD'], ['CASSETTE', 'Cassette'], ['MERCH', 'Merch'],
] as const;
const CONDITIONS = [['M', 'M'], ['VGP', 'VG+'], ['VG', 'VG'], ['GP', 'G+'], ['G', 'G'], ['F', 'F'], ['P', 'P']] as const;
const LOCATIONS = [['MAIN_STORE', 'Main Store'], ['WAREHOUSE', 'Warehouse'], ['CONSIGNMENT', 'Consignment']] as const;

const inputCls = 'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

function Field({ label, required, children, htmlFor }: { label: string; required?: boolean; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5">
        {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Mockup's numbered section: raised header bar with an index circle. */
function Section({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--bg-overlay)] border-b border-[var(--border)]">
        <span className="w-[22px] h-[22px] rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center [font-variant-numeric:tabular-nums]">{n}</span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)] flex-1">{title}</span>
        {note && <span className="text-[11px] text-[var(--text-muted)] normal-case">{note}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ReleaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Release>>({
    format: 'LP' as Release['format'], condition: 'M', priceIdr: 0, stock: 0,
    storeLocation: 'MAIN_STORE', lowStockThreshold: 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) getRelease(id).then(r => setForm(r)).catch(() => navigate('/inventory'));
  }, [id, isEdit, navigate]);

  const set = (field: keyof Release) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const numFields = ['priceIdr', 'costIdr', 'stock', 'year', 'lowStockThreshold'];
      const value = numFields.includes(field as string) ? Number(e.target.value) || 0 : e.target.value;
      setForm(f => ({ ...f, [field]: value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit && id) await updateRelease(id, form);
      else await createRelease(form);
      navigate('/inventory');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save release.'));
    } finally {
      setLoading(false);
    }
  };

  const release = form as Release;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {/* page header */}
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1">
            <Link to="/inventory" className="hover:text-[var(--text-primary)]">Inventory</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="text-[var(--text-primary)]">{isEdit ? 'Edit release' : 'Add release'}</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">
            {isEdit ? `${release.artist ?? ''} — ${release.title ?? ''}` : 'Add release'}
          </h1>
          {isEdit && release.dealposVariantId && (
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              Synced from DealPOS · variant <span className="font-mono text-[11px]">{release.dealposVariantId}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/inventory" className="px-3.5 py-[9px] rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors">Cancel</Link>
          <button type="submit" disabled={loading} className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-[.88] disabled:opacity-50 transition-opacity">
            {loading ? 'Saving…' : 'Save release'}
          </button>
        </div>
      </div>

      {error && <div className="text-[12px] text-[var(--danger)] border border-[var(--danger)] rounded-md px-3 py-2 mb-4">{error}</div>}

      <div className="space-y-4">
        <Section n="1" title="Basics">
          <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <Field label="Artist" required htmlFor="artist"><input id="artist" className={inputCls} value={form.artist ?? ''} onChange={set('artist')} required /></Field>
            <Field label="Title" required htmlFor="title"><input id="title" className={inputCls} value={form.title ?? ''} onChange={set('title')} required /></Field>
            <Field label="Label" htmlFor="label"><input id="label" className={inputCls} value={form.label ?? ''} onChange={set('label')} /></Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Cat. number" htmlFor="cat"><input id="cat" className={`${inputCls} font-mono`} value={form.catNumber ?? ''} onChange={set('catNumber')} /></Field>
              <Field label="Year" htmlFor="year"><input id="year" type="number" min={1900} max={2099} className={`${inputCls} font-mono`} value={form.year ?? ''} onChange={set('year')} /></Field>
            </div>
          </div>
        </Section>

        <Section n="2" title="Format & condition">
          <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
            <Field label="Format" required htmlFor="format">
              <select id="format" className={inputCls} value={form.format} onChange={set('format')}>
                {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Genre" htmlFor="genre"><input id="genre" className={inputCls} value={form.genre ?? ''} onChange={set('genre')} placeholder="e.g. Vinyl Import" /></Field>
            <Field label="Barcode" htmlFor="barcode"><input id="barcode" className={`${inputCls} font-mono`} value={form.barcode ?? ''} onChange={set('barcode')} placeholder="EAN-13 / Code128" /></Field>
          </div>
          <div className="mt-3.5">
            <Field label="Condition grade" required>
              <div className="flex gap-1.5 flex-wrap">
                {CONDITIONS.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, condition: v as Release['condition'] }))}
                    className={`text-[12px] font-mono px-3.5 py-1.5 rounded-full border transition-colors ${
                      form.condition === v ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section n="3" title="Pricing" note="IDR · incl. PPN 11%">
          <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
            <Field label="Price" required htmlFor="price">
              <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
                <span className="pl-3 text-[12px] text-[var(--text-muted)]">Rp</span>
                <input id="price" type="number" min={0} className="w-full bg-transparent px-2 py-[9px] text-[13px] font-mono text-[var(--text-primary)] outline-none" value={form.priceIdr ?? 0} onChange={set('priceIdr')} required />
              </div>
            </Field>
            <Field label="Cost (COGS)" htmlFor="cost">
              <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
                <span className="pl-3 text-[12px] text-[var(--text-muted)]">Rp</span>
                <input id="cost" type="number" min={0} className="w-full bg-transparent px-2 py-[9px] text-[13px] font-mono text-[var(--text-primary)] outline-none" value={form.costIdr ?? ''} onChange={set('costIdr')} />
              </div>
            </Field>
            <Field label="Margin">
              <div className="px-3 py-[9px] text-[13px] font-mono text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
                {form.priceIdr && form.costIdr ? `${(((form.priceIdr - form.costIdr) / form.priceIdr) * 100).toFixed(1)}%` : '—'}
              </div>
            </Field>
          </div>
        </Section>

        <Section n="4" title="Stock & location">
          <div className="grid grid-cols-[1fr_120px_100px_110px] gap-3.5 items-end max-md:grid-cols-2">
            <Field label="Location" htmlFor="loc">
              <select id="loc" className={inputCls} value={form.storeLocation} onChange={set('storeLocation')}>
                {LOCATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Shelf" htmlFor="shelf"><input id="shelf" className={`${inputCls} font-mono`} value={form.shelfLocation ?? ''} onChange={set('shelfLocation')} placeholder="e.g. A3" /></Field>
            <Field label="Qty" htmlFor="qty"><input id="qty" type="number" min={0} className={`${inputCls} font-mono`} value={form.stock ?? 0} onChange={set('stock')} /></Field>
            <Field label="Low-stock at" htmlFor="threshold"><input id="threshold" type="number" min={0} className={`${inputCls} font-mono`} value={form.lowStockThreshold ?? 2} onChange={set('lowStockThreshold')} /></Field>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-3">
            Stock refreshes from DealPOS on every sync; per-location allocation arrives with the multi-location phase (as designed in the prototype).
          </p>
        </Section>

        <Section n="5" title="Media">
          <div className="flex gap-4 items-start max-md:flex-col">
            <span className="w-[104px] h-[104px] rounded-[8px] flex-shrink-0 overflow-hidden bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center">
              {form.imageUrl
                ? <img src={form.imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                : <span className="w-14 h-14 rounded-full" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, var(--text-faint) 0 1.5px, transparent 1.5px 4px)' }} />}
            </span>
            <div className="flex-1 w-full">
              <Field label="Cover art URL" htmlFor="image">
                <input id="image" className={`${inputCls} font-mono text-[11px]`} value={form.imageUrl ?? ''} onChange={set('imageUrl')} placeholder="https://…" />
              </Field>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">Synced releases carry their DealPOS artwork automatically; Meta rejects catalogue items without an image.</p>
            </div>
          </div>
        </Section>

        <Section n="6" title="Description">
          <textarea
            className={`${inputCls} min-h-[96px] resize-y`}
            value={form.notes ?? ''}
            onChange={set('notes')}
            placeholder="Pressing details, condition notes, edition info…"
          />
        </Section>
      </div>
    </form>
  );
}
