import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createLocation, deleteLocation, formatDateRange, getLocations, updateLocation,
  type Location, type LocationInput, type LocationKind, type StoreLocationKey,
} from '../../api/locations';
import { fmtIdrCompact } from '../../api/ops';

const KIND_META: Record<LocationKind, { label: string; icon: React.ReactNode }> = {
  RETAIL: { label: 'Retail floor', icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" /> },
  STORAGE: { label: 'Storage', icon: <><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" /></> },
  TEMPORARY: { label: 'Event · pop-up', icon: <><path d="M3 21h18" /><path d="M12 3L3 12h18L12 3z" /><path d="M12 3v18" /></> },
  CONSIGNMENT: { label: 'Consignment', icon: <><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></> },
};

const KIND_OPTIONS: Array<{ value: LocationKind; label: string }> = [
  { value: 'RETAIL', label: 'Retail floor' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'TEMPORARY', label: 'Event / pop-up' },
  { value: 'CONSIGNMENT', label: 'Consignment' },
];

const STORE_OPTIONS: Array<{ value: StoreLocationKey; label: string }> = [
  { value: 'MAIN_STORE', label: 'Main store' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'CONSIGNMENT', label: 'Consignment' },
];

interface FormState {
  name: string;
  kind: LocationKind;
  active: boolean;
  address: string;
  startDate: string;
  endDate: string;
  matchKey: string;
  storeLocation: StoreLocationKey | '';
  shelves: string[];
}

const emptyForm: FormState = {
  name: '', kind: 'RETAIL', active: true, address: '', startDate: '', endDate: '', matchKey: '', storeLocation: '', shelves: [],
};

function toForm(l: Location): FormState {
  return {
    name: l.name,
    kind: l.kind,
    active: l.active,
    address: l.address ?? '',
    startDate: l.startDate ? l.startDate.slice(0, 10) : '',
    endDate: l.endDate ? l.endDate.slice(0, 10) : '',
    matchKey: l.matchKey ?? '',
    storeLocation: l.storeLocation ?? '',
    shelves: [...l.shelves],
  };
}

function toPayload(f: FormState): LocationInput {
  const isEvent = f.kind === 'TEMPORARY';
  const shelves = f.shelves.map(s => s.trim()).filter(Boolean);
  return {
    name: f.name.trim(),
    kind: f.kind,
    active: f.active,
    address: f.address.trim() || undefined,
    startDate: isEvent && f.startDate ? new Date(f.startDate).toISOString() : undefined,
    endDate: isEvent && f.endDate ? new Date(f.endDate).toISOString() : undefined,
    matchKey: isEvent && f.matchKey.trim() ? f.matchKey.trim() : undefined,
    storeLocation: !isEvent && f.storeLocation ? f.storeLocation : undefined,
    shelves,
  };
}

const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)]';
const labelCls = 'block text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5';

function KindIcon({ kind }: { kind: LocationKind }) {
  return (
    <span className="w-9 h-9 rounded-[8px] bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)]">
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{KIND_META[kind].icon}</svg>
    </span>
  );
}

function Fig({ k, v, warn }: { k: string; v: number | string; warn?: boolean }) {
  const isWarn = warn && typeof v === 'number' && v > 0;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">{k}</p>
      <p className={`font-mono text-[16px] font-medium mt-0.5 truncate ${isWarn ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}`}>{v}</p>
    </div>
  );
}

export function LocationsPanel() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Location | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Location | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getLocations()
      .then(setLocations)
      .catch(() => setError('Could not load locations. Check the API and that the migration has run.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => { setForm(emptyForm); setEditing('new'); };
  const openEdit = (l: Location) => { setForm(toForm(l)); setEditing(l); };
  const close = () => { setEditing(null); setSaving(false); };

  useEffect(() => { if (editing) setTimeout(() => nameRef.current?.focus(), 30); }, [editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { nameRef.current?.focus(); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (editing === 'new') await createLocation(payload);
      else if (editing) await updateLocation(editing.id, payload);
      close();
      load();
    } catch {
      setError('Could not save the location.');
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await deleteLocation(removing.id);
      setRemoving(null);
      load();
    } catch {
      setError('Could not remove the location.');
      setRemoving(null);
    }
  };

  const eventCount = useMemo(() => locations.filter(l => l.kind === 'TEMPORARY').length, [locations]);
  const isEvent = form.kind === 'TEMPORARY';

  return (
    <div>
      {error && <div className="mb-3.5 text-[11px] text-[var(--danger)] border border-[var(--danger)] rounded-[6px] px-3 py-2 bg-[var(--danger-t)]">{error}</div>}

      <div className="flex items-center justify-between gap-3 mb-3.5">
        <p className="text-[12px] text-[var(--text-muted)]">
          {loading ? 'Loading…' : `${locations.length} location${locations.length === 1 ? '' : 's'}${eventCount ? ` · ${eventCount} event${eventCount === 1 ? '' : 's'}` : ''}`}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add location
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
        {locations.map(l => {
          const subtitle = l.kind === 'TEMPORARY'
            ? [l.address, formatDateRange(l.startDate, l.endDate)].filter(Boolean).join(' · ')
            : l.address;
          return (
            <div key={l.id} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <KindIcon kind={l.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{l.name}</p>
                    {!l.active && <span className="text-[9px] uppercase tracking-[0.05em] px-1.5 py-px rounded-[4px] border border-[var(--border)] text-[var(--text-muted)]">Inactive</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{subtitle || '—'}</p>
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">{KIND_META[l.kind].label}</span>
                </div>
                <button
                  onClick={() => setRemoving(l)}
                  title="Remove location"
                  aria-label={`Remove ${l.name}`}
                  className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-overlay)] transition-colors flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                </button>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[var(--border-sub)]">
                {l.kind === 'TEMPORARY' ? (
                  <>
                    <Fig k="Revenue" v={fmtIdrCompact(l.sales?.revenue ?? 0)} />
                    <Fig k="Orders" v={l.sales?.orders ?? 0} />
                    <Fig k="Avg order" v={fmtIdrCompact(l.sales?.avgOrder ?? 0)} />
                  </>
                ) : (
                  <>
                    <Fig k="Items" v={l.stats.items} />
                    <Fig k="Shelves" v={Math.max(l.stats.shelves, l.shelves.length)} />
                    <Fig k="Low stock" v={l.stats.lowStock} warn />
                  </>
                )}
              </div>

              {l.shelves.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {l.shelves.map(s => (
                    <span key={s} className="font-mono text-[10px] px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)]">{s}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto pt-1">
                <Link
                  to={l.storeLocation ? `/inventory?tab=catalogue` : '/inventory?tab=catalogue'}
                  className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                >
                  View items
                </Link>
                <button
                  onClick={() => openEdit(l)}
                  className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                >
                  Edit{l.kind !== 'TEMPORARY' ? ' · shelves' : ''}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && (
          <button
            onClick={openNew}
            className="min-h-[180px] rounded-[8px] border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors flex flex-col items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span className="text-[12px] font-medium">Add a location</span>
          </button>
        )}
      </div>

      {/* Add / edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={close}>
          <div
            className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,.7)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{editing === 'new' ? 'Add location' : 'Edit location'}</h3>
              <button onClick={close} aria-label="Close" className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Location name</label>
                <input ref={nameRef} className={inputCls} value={form.name} placeholder="e.g. Main Store, or ATM Fair pop-up" onChange={e => set('name', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={form.kind} onChange={e => set('kind', e.target.value as LocationKind)}>
                    {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={form.active ? 'active' : 'inactive'} onChange={e => set('active', e.target.value === 'active')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>{isEvent ? 'Venue / address' : 'Address'}</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.address} placeholder={isEvent ? 'e.g. Jakarta Convention Center' : 'Street, city'} onChange={e => set('address', e.target.value)} />
              </div>

              {isEvent ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Starts</label>
                      <input type="date" className={inputCls} value={form.startDate} max={form.endDate || undefined} onChange={e => set('startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Ends</label>
                      <input type="date" className={inputCls} value={form.endDate} min={form.startDate || undefined} onChange={e => set('endDate', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Sales match key <span className="text-[var(--text-faint)] normal-case font-normal">· optional</span></label>
                    <input className={inputCls} value={form.matchKey} placeholder="DealPOS tag or outlet used for this event" onChange={e => set('matchKey', e.target.value)} />
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelCls}>Inventory link <span className="text-[var(--text-faint)] normal-case font-normal">· for item counts</span></label>
                  <select className={inputCls} value={form.storeLocation} onChange={e => set('storeLocation', e.target.value as StoreLocationKey | '')}>
                    <option value="">Not linked</option>
                    {STORE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Shelves</label>
                <div className="space-y-2">
                  {form.shelves.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={inputCls}
                        value={s}
                        placeholder="e.g. A1, Crate 2"
                        onChange={e => set('shelves', form.shelves.map((v, j) => (j === i ? e.target.value : v)))}
                      />
                      <button
                        onClick={() => set('shelves', form.shelves.filter((_, j) => j !== i))}
                        aria-label="Remove shelf"
                        className="w-9 h-9 flex-shrink-0 rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] flex items-center justify-center transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => set('shelves', [...form.shelves, ''])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[6px] border border-dashed border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add shelf
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
              <button onClick={close} className="px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Saving…' : 'Save location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setRemoving(null)}>
          <div className="w-full max-w-[400px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,.7)]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Remove location?</h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                Remove <b className="text-[var(--text-primary)]">{removing.name}</b>? This only deletes the location record{removing.stats.items > 0 ? `; the ${removing.stats.items} linked item${removing.stats.items === 1 ? '' : 's'} stay in the catalogue` : ''}. It can't be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--border)]">
              <button onClick={() => setRemoving(null)} className="px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors">Cancel</button>
              <button onClick={confirmRemove} className="px-4 py-2 rounded-[6px] border border-[var(--danger)] text-[13px] font-medium text-[var(--danger)] hover:bg-[var(--danger-t)] transition-colors">Remove location</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
