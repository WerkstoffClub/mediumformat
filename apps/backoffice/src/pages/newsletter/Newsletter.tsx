import { useEffect, useState } from 'react';
import { getCustomers } from '../../api/ops';
import { PageHeader, Panel } from '../../components/ui/Page';

/** Audience view over synced customers; sending goes live with an email provider. */
export function Newsletter() {
  const [withEmail, setWithEmail] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    getCustomers({ limit: 1 }).then(r => setTotal(r.total)).catch(() => {});
    getCustomers({ q: '@', limit: 1 }).then(r => setWithEmail(r.total)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Newsletter" sub="Audience from synced DealPOS customers" />
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['Customers', total ?? '—'],
          ['With email address', withEmail ?? '—'],
          ['Campaigns sent', 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-[20px] font-black font-mono text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
      <Panel title="Compose">
        <p className="text-[11px] text-[var(--text-muted)] max-w-[52ch]">
          Campaign compose &amp; send activates once an email provider is connected
          (Resend / Mailchimp). The audience above is already live — every synced
          customer with an email address is subscribable.
        </p>
      </Panel>
    </div>
  );
}
