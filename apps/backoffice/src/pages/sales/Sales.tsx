import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs, type TabDef } from '../../components/ui/Page';
import { SalesOverview } from './SalesOverview';
import { SettlementsPanel } from './SettlementsPanel';
import { DealersPanel, PeersPanel } from './PartnerStreams';

const TABS: TabDef[] = [
  { key: 'overview', label: 'MF retail' },
  { key: 'peers', label: 'Peers · tickets' },
  { key: 'dealers', label: 'Dealers · POS' },
  { key: 'settlements', label: 'Settlements' },
];
type TabKey = 'overview' | 'peers' | 'dealers' | 'settlements';
const isTab = (v: string | null): v is TabKey => TABS.some(t => t.key === v);

const SUBS: Record<Exclude<TabKey, 'overview'>, string> = {
  peers: 'Ticket sales at Peers venues — tickets, revenue and door check-in',
  dealers: 'POS sales at Dealers — third-party record shops on the MF POS',
  settlements: 'Marketplace payouts — what the platforms still owe and what already settled',
};

/** Sales home. MF retail (revenue, margins, channels, payments), the two partner
 *  streams kept in their own tabs (Peers tickets, Dealers POS — never mixed), and
 *  Settlements (marketplace payouts). Deep-link with ?tab=. */
export function Sales() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = isTab(raw) ? raw : 'overview';
  const [lastSync, setLastSync] = useState<string | null>(null);

  const onLastSync = useCallback((label: string | null) => setLastSync(label), []);

  return (
    <div>
      <PageHeader
        title="Sales"
        sub={
          tab === 'overview'
            ? `Revenue, margins, channels and payments — from the DealPOS mirror${lastSync ? ` · last sync ${lastSync}` : ''}`
            : SUBS[tab]
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={key => setParams(key === 'overview' ? {} : { tab: key }, { replace: true })} />
      {tab === 'overview' && <SalesOverview onLastSync={onLastSync} />}
      {tab === 'peers' && <PeersPanel />}
      {tab === 'dealers' && <DealersPanel />}
      {tab === 'settlements' && <SettlementsPanel />}
    </div>
  );
}
