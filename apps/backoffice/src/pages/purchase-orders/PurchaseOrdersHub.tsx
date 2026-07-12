import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs, type TabDef } from '../../components/ui/Page';
import { PurchaseOrdersList } from './PurchaseOrdersList';
import { ImportsList } from '../imports/ImportsList';
import { ConsolidationsList } from '../consolidations/ConsolidationsList';

type PoTab = 'orders' | 'imports' | 'consolidations';

const TABS: TabDef[] = [
  { key: 'orders', label: 'Purchase orders' },
  { key: 'imports', label: 'Imports' },
  { key: 'consolidations', label: 'Consolidations' },
];

const SUBS: Record<PoTab, string> = {
  orders: 'Buying stock — track POs from draft to fully received.',
  imports: 'Vendor invoices — from parsed PDF to landed inventory.',
  consolidations: 'Group international orders by freight forwarder, then split the forwarder invoice across lines by weight.',
};

const isPoTab = (v: string | null): v is 'imports' | 'consolidations' =>
  v === 'imports' || v === 'consolidations';

/** Purchase Orders home. Purchase orders (buying stock), Imports (vendor
 *  invoices) and Forwarder Consolidations live as tabs of one page —
 *  formerly three separate sidebar items. */
export function PurchaseOrdersHub() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: PoTab = isPoTab(raw) ? raw : 'orders';

  // Preserve any other search params (e.g. ?q=) when switching tabs.
  const setTab = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === 'orders') next.delete('tab'); else next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Purchase Orders" sub={SUBS[tab]} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'imports' ? <ImportsList /> : tab === 'consolidations' ? <ConsolidationsList /> : <PurchaseOrdersList />}
    </div>
  );
}
