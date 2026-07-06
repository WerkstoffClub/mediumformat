import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs, type TabDef } from '../../components/ui/Page';
import { InventoryList } from './InventoryList';
import { CategoriesPanel } from './CategoriesPanel';
import { LocationsPanel } from './LocationsPanel';

type InvTab = 'catalogue' | 'categories' | 'locations';

const SUBS: Record<InvTab, string> = {
  catalogue: 'synced from DealPOS',
  categories: 'How the catalogue and sales are organised — formats, genres and channel tags',
  locations: 'Stores, storage and events — where stock lives and where you sell',
};

/** Inventory home. Catalogue (the releases table), Categories & Tags, and
 *  Locations & Events live as tabs of one page. */
export function Inventory() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: InvTab = raw === 'categories' || raw === 'locations' ? raw : 'catalogue';
  const [total, setTotal] = useState<number | null>(null);

  const onTotal = useCallback((n: number) => setTotal(n), []);

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
          tab === 'catalogue' ? (
            <Link
              to="/inventory/new"
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add release
            </Link>
          ) : undefined
        }
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'categories' ? <CategoriesPanel /> : tab === 'locations' ? <LocationsPanel /> : <InventoryList onTotal={onTotal} />}
    </div>
  );
}
