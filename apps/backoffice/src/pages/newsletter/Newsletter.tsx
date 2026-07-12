import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../../components/ui/Page';
import { SubscribersTab } from './SubscribersTab';
import { CampaignsTab } from './CampaignsTab';

type Tab = 'subscribers' | 'campaigns';

const isTab = (v: string | null): v is Tab => v === 'subscribers' || v === 'campaigns';

/** Newsletter shell — tab-switched over subscribers and campaigns.
 *  Sending is disabled until an email provider is connected. */
export function Newsletter() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'subscribers';

  const onChange = (next: string) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'subscribers') p.delete('tab'); else p.set('tab', next);
      return p;
    }, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Newsletter"
        sub="Audience management and campaign compose — sending activates when Resend or Mailchimp is connected."
      />
      <Tabs
        tabs={[
          { key: 'subscribers', label: 'Subscribers' },
          { key: 'campaigns',   label: 'Campaigns' },
        ]}
        active={tab}
        onChange={onChange}
      />
      {tab === 'subscribers' ? <SubscribersTab /> : <CampaignsTab />}
    </div>
  );
}
