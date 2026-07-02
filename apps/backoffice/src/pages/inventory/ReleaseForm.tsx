import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRelease, getRelease, updateRelease } from '../../api/inventory';
import type { Release } from '@mf/shared';

const FORMATS  = ['LP', '2xLP', '3xLP', '12_INCH', '7_INCH', 'CD', '2xCD', 'CASSETTE', 'MERCH'] as const;
const CONDITIONS = ['M', 'VGP', 'VG', 'GP', 'G', 'F', 'P'] as const;
const LOCATIONS = ['MAIN_STORE', 'WAREHOUSE', 'CONSIGNMENT'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]";

export function ReleaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Release>>({
    format: 'LP', condition: 'M', priceIdr: 0, stock: 0,
    storeLocation: 'MAIN_STORE', lowStockThreshold: 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (isEdit && id) getRelease(id).then(r => setForm(r)).catch(() => navigate('/inventory'));
  }, [id, isEdit, navigate]);

  const set = (field: keyof Release) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const numFields = ['priceIdr', 'stock', 'year', 'lowStockThreshold'];
      const value = numFields.includes(field as string) ? Number(e.target.value) : e.target.value;
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] mb-5">
        {isEdit ? 'Edit Release' : 'Add Release'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 grid grid-cols-2 gap-4">
          <Field label="Artist *"><input className={inputCls} value={form.artist ?? ''} onChange={set('artist')} required /></Field>
          <Field label="Title *"><input className={inputCls} value={form.title ?? ''} onChange={set('title')} required /></Field>
          <Field label="Label"><input className={inputCls} value={form.label ?? ''} onChange={set('label')} /></Field>
          <Field label="Cat. Number"><input className={inputCls} value={form.catNumber ?? ''} onChange={set('catNumber')} /></Field>
          <Field label="Year"><input type="number" className={inputCls} value={form.year ?? ''} onChange={set('year')} min={1900} max={2099} /></Field>
          <Field label="Genre"><input className={inputCls} value={form.genre ?? ''} onChange={set('genre')} /></Field>
          <Field label="Format *">
            <select className={inputCls} value={form.format} onChange={set('format')} required>
              {FORMATS.map(f => <option key={f} value={f}>{f.replace(/_/g, '"')}</option>)}
            </select>
          </Field>
          <Field label="Condition *">
            <select className={inputCls} value={form.condition} onChange={set('condition')} required>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (IDR) *"><input type="number" className={inputCls} value={form.priceIdr ?? 0} onChange={set('priceIdr')} min={0} required /></Field>
          <Field label="Stock *"><input type="number" className={inputCls} value={form.stock ?? 0} onChange={set('stock')} min={0} required /></Field>
          <Field label="Low Stock Threshold"><input type="number" className={inputCls} value={form.lowStockThreshold ?? 2} onChange={set('lowStockThreshold')} min={0} /></Field>
          <Field label="Barcode"><input className={inputCls} value={form.barcode ?? ''} onChange={set('barcode')} placeholder="EAN-13 or Code128" /></Field>
          <Field label="Store Location">
            <select className={inputCls} value={form.storeLocation} onChange={set('storeLocation')}>
              {LOCATIONS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Shelf / Rack"><input className={inputCls} value={form.shelfLocation ?? ''} onChange={set('shelfLocation')} placeholder="e.g. Rack A · Shelf 2" /></Field>
          <div className="col-span-2">
            <Field label="Notes"><textarea className={`${inputCls} resize-none`} rows={3} value={form.notes ?? ''} onChange={set('notes')} /></Field>
          </div>
        </div>
        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/inventory')} className="px-4 py-2 border border-[var(--border)] rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-[12px] font-bold rounded-md disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Release'}
          </button>
        </div>
      </form>
    </div>
  );
}
