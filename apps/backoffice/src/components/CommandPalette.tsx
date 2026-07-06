import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReleases } from '../api/inventory';
import { fmtIdr } from '../api/ops';
import type { Release } from '@mf/shared';

interface PageEntry { label: string; to: string; hint: string; }

const PAGES: PageEntry[] = [
  { label: 'Dashboard', to: '/dashboard', hint: 'Overview' },
  { label: 'Sales', to: '/sales', hint: 'Overview' },
  { label: 'POS', to: '/pos', hint: 'Selling' },
  { label: 'Orders', to: '/orders', hint: 'Selling' },
  { label: 'Inventory', to: '/inventory', hint: 'Selling' },
  { label: 'Customers', to: '/customers', hint: 'Selling' },
  { label: 'Channels', to: '/channels', hint: 'Selling' },
  { label: 'Categories & Tags', to: '/categories', hint: 'Selling' },
  { label: 'Purchase orders', to: '/purchase-orders', hint: 'Shop' },
  { label: 'Settlements', to: '/settlements', hint: 'Shop' },
  { label: 'Preorders', to: '/preorders', hint: 'Shop' },
  { label: 'Vouchers', to: '/vouchers', hint: 'Shop' },
  { label: 'Newsletter', to: '/newsletter', hint: 'Marketing' },
  { label: 'Social Media', to: '/social', hint: 'Marketing' },
  { label: 'Blog', to: '/blog', hint: 'Marketing' },
  { label: 'Preferences', to: '/preferences', hint: 'Config' },
  { label: 'Add release', to: '/inventory/new', hint: 'Action' },
];

type Row =
  | { kind: 'page'; page: PageEntry }
  | { kind: 'release'; release: Release };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<Release[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setReleases([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setReleases([]); return; }
    debounce.current = setTimeout(() => {
      getReleases({ q: query.trim(), limit: 8 }).then(r => setReleases(r.data)).catch(() => setReleases([]));
    }, 220);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = (q ? PAGES.filter(p => p.label.toLowerCase().includes(q)) : PAGES.slice(0, 6))
      .map(page => ({ kind: 'page' as const, page }));
    const rels = releases.map(release => ({ kind: 'release' as const, release }));
    return [...rels, ...pages];
  }, [query, releases]);

  useEffect(() => { setActive(a => Math.min(a, Math.max(rows.length - 1, 0))); }, [rows.length]);

  const pick = useCallback((row: Row) => {
    onClose();
    if (row.kind === 'page') navigate(row.page.to);
    else navigate(`/inventory/${row.release.id}/edit`);
  }, [navigate, onClose]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && rows[active]) { e.preventDefault(); pick(rows[active]); }
    else if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" role="dialog" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative w-full max-w-[560px] mx-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,.7)]">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search releases or jump to a page…"
            className="bg-transparent outline-none border-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
            aria-label="Search"
          />
          <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5 py-px">Esc</span>
        </div>
        <div className="max-h-[340px] overflow-y-auto py-1.5">
          {rows.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-[var(--text-faint)]">No matches.</p>
          )}
          {rows.map((row, i) => (
            <button
              key={row.kind === 'page' ? row.page.to : row.release.id}
              onClick={() => pick(row)}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] ${
                i === active ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {row.kind === 'release' ? (
                <>
                  <span className="flex-1 truncate">
                    <span className="text-[var(--text-primary)]">{row.release.artist}</span> – {row.release.title}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">{fmtIdr(row.release.priceIdr)}</span>
                </>
              ) : (
                <>
                  <span className="flex-1">{row.page.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{row.page.hint}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
