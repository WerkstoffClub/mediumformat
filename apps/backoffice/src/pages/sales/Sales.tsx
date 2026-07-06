import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs, type TabDef } from '../../components/ui/Page';
import { SalesOverview } from './SalesOverview';
import { SettlementsPanel } from './SettlementsPanel';

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'settlements', label: 'Settlements' },
];

/** Sales home. Overview (revenue, margins, channels, payments) and the
 *  Settlements tab (marketplace payouts) — formerly a separate page. */
export function Sales() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'settlements' ? 'settlements' : 'overview';
  const [lastSync, setLastSync] = useState<string | null>(null);

  const onLastSync = useCallback((label: string | null) => setLastSync(label), []);

  return (
    <div>
      <PageHeader
        title="Sales"
        sub={
          tab === 'settlements'
            ? 'Marketplace payouts — what the platforms still owe and what already settled'
            : `Revenue, margins, channels and payments — from the DealPOS mirror${lastSync ? ` · last sync ${lastSync}` : ''}`
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={key => setParams(key === 'overview' ? {} : { tab: key }, { replace: true })} />
      {tab === 'settlements' ? <SettlementsPanel /> : <SalesOverview onLastSync={onLastSync} />}
    </div>
  );
}
