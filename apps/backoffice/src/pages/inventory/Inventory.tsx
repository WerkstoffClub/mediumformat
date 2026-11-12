import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs, type TabDef } from '../../components/ui/Page';
import { InventoryList } from './InventoryList';
import { CategoriesPanel } from './CategoriesPanel';
import { LocationsPanel } from './LocationsPanel';
import type { Release } from '@mf/shared';

type InvTab = 'catalogue' | 'categories' | 'locations';

const SUBS: Record<InvTab, string> = {
  catalogue: 'synced from DealPOS',
  categories: 'How the catalogue and sales are organised — formats, genres and channel tags',
  locations: 'Stores, storage and events — where stock lives and where you sell',
};

const btnSec = 'inline-flex items-center gap-1.5 px-[13px] py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 transition-colors';
const ico = 'w-3.5 h-3.5';

function toCsv(rows: Release[]): string {
  const head = ['Artist', 'Title', 'Cat#', 'Barcode', 'Format', 'Condition', 'Genre', 'Stock', 'Price (IDR)', 'Location', 'Shelf'];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r =>
    [r.artist, r.title, r.catNumber, r.barcode, r.format, r.condition, r.genre, r.stock, r.priceIdr, r.storeLocation, r.shelfLocation].map(esc).join(','),
  );
  return [head.map(esc).join(','), ...body].join('\n');
}

function exportCsv(rows: Release[]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Inventory home. Catalogue (the releases table), Categories & Tags, and
 *  Locations & Events live as tabs of one page. */
export function Inventory() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: InvTab = raw === 'categories' || raw === 'locations' ? raw : 'catalogue';
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<Release[]>([]);

  const onLoad = useCallback((data: Release[], n: number) => { setRows(data); setTotal(n); }, []);

  const tabs: TabDef[] = [
    { key: 'catalogue', label: 'Catalogue', count: tab === 'catalogue' ? total : undefined },
    { key: 'categories', label: 'Categories & Tags' },
    { key: 'locations', label: 'Locations & Events' },
  ];

  // Preserve any active search (?q=) when switching tabs.
  const setTab = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === 'catalogue') next.delete('tab');
    else next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        sub={tab === 'catalogue' ? `${total != null ? `${total.toLocaleString('en-GB')} releases · ` : ''}${SUBS.catalogue}` : SUBS[tab]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <button type="button" onClick={() => setTab('locations')} className={btnSec}>
              <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              Locations
            </button>
            <button type="button" onClick={() => setTab('categories')} className={btnSec}>
              <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.41 12.4A2 2 0 012 11V4a2 2 0 012-2h7a2 2 0 011.41.59l8.18 8.18a2 2 0 010 2.83z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></svg>
              Product Categories
            </button>
            {tab === 'catalogue' && (
              <button type="button" onClick={() => exportCsv(rows)} disabled={rows.length === 0} title="Export the rows on this page as CSV" className={btnSec}>
                <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export
              </button>
            )}
            <Link
              to="/inventory/new"
              className="inline-flex items-center gap-[7px] px-4 py-2.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[14px] leading-5 font-medium hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add release
            </Link>
          </div>
        }
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'categories' ? <CategoriesPanel /> : tab === 'locations' ? <LocationsPanel /> : <InventoryList onLoad={onLoad} />}
    </div>
  );
}
