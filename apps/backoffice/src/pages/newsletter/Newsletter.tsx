import { useCallback, useEffect, useState } from 'react';
import {
  exportSubscribersCsvUrl, getSubscriberSummary, listSubscribers,
  type Subscriber, type SubscriberSummary,
} from '../../api/newsletter';
import { PageHeader, Stat, Widget } from '../../components/ui/Page';
import { CampaignsPanel } from './CampaignsPanel';
import { SubscribersPanel, Avatar } from './SubscribersPanel';
import { CampaignDrawer } from './CampaignDrawer';
import { SubscriberDrawer } from './SubscriberDrawer';
import { SOURCE_LABEL } from './shared';

const RECENT_COUNT = 6;
const TOAST_MS = 4000;
const NO_PROVIDER = 'needs email provider';

const fmtN = (n: number) => n.toLocaleString('id-ID');
const fmtSigned = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtN(Math.abs(n))}`;

const UpArrow = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden><path d="M18 15l-6-6-6 6" /></svg>
);

/** Newsletter dashboard — KPI strip, campaigns, audience. Sending (and open/click
 *  tracking) activates once Resend or Mailchimp is connected. */
export function Newsletter() {
  const [reloadKey, setReloadKey] = useState(0);
  const [summary, setSummary] = useState<SubscriberSummary | null>(null);
  const [recent, setRecent] = useState<Subscriber[]>([]);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [campaignSel, setCampaignSel] = useState<string | 'new' | null>(null);
  const [subscriberSel, setSubscriberSel] = useState<Subscriber | 'new' | null>(null);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), TOAST_MS);
  }, []);
  const refresh = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    getSubscriberSummary().then(setSummary).catch(() => setSummary(null));
    listSubscribers({ limit: RECENT_COUNT }).then(r => setRecent(r.items)).catch(() => setRecent([]));
  }, [reloadKey]);

  return (
    <div>
      <PageHeader
        title="Newsletter"
        sub="Campaigns, audience & performance — Medium Format list"
        actions={
          <div className="flex items-center gap-2">
            <a
              href={exportSubscribersCsvUrl()}
              download
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export
            </a>
            <button
              onClick={() => setCampaignSel('new')}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New campaign
            </button>
          </div>
        }
      />

      {toast && (
        <div
          role="status"
          className={`mb-3 text-[12px] px-3 py-2 rounded-[6px] border ${
            toast.kind === 'ok'
              ? 'border-[var(--success)] bg-[var(--success-t)] text-[var(--success)]'
              : 'border-[var(--danger)] bg-[var(--danger-t)] text-[var(--danger)]'
          }`}
        >
          {toast.text}
        </div>
      )}

      <KpiStrip summary={summary} />

      <div className="grid grid-cols-[2fr_1fr] gap-3.5 items-start mb-3.5 max-lg:grid-cols-1">
        <CampaignsPanel reloadKey={reloadKey} onOpen={setCampaignSel} onChanged={refresh} onToast={showToast} />
        <div className="flex flex-col gap-3.5">
          <RecentSubscribers rows={recent} newThisMonth={summary?.newThisMonth} onOpen={setSubscriberSel} />
          <ListSources summary={summary} />
        </div>
      </div>

      <SubscribersPanel reloadKey={reloadKey} onOpen={setSubscriberSel} onChanged={refresh} onToast={showToast} />

      {campaignSel && (
        <CampaignDrawer
          key={campaignSel}
          campaignId={campaignSel === 'new' ? null : campaignSel}
          onClose={() => setCampaignSel(null)}
          onSaved={() => { refresh(); setCampaignSel(null); }}
          onToast={showToast}
        />
      )}
      {subscriberSel && (
        <SubscriberDrawer
          key={subscriberSel === 'new' ? 'new' : subscriberSel.id}
          subscriber={subscriberSel === 'new' ? null : subscriberSel}
          onClose={() => setSubscriberSel(null)}
          onSaved={() => { refresh(); setSubscriberSel(null); }}
          onToast={showToast}
        />
      )}
    </div>
  );
}

function KpiStrip({ summary: s }: { summary: SubscriberSummary | null }) {
  const muted = 'text-[var(--text-faint)]';
  return (
    <div className="grid grid-cols-4 gap-3 mb-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
      <Stat label="Subscribers" value={s ? fmtN(s.active) : '—'}>
        {s && <><span className="inline-flex items-center gap-1 text-[var(--success)]"><UpArrow /><span className="font-mono">{fmtN(s.newThisMonth)}</span></span><span className={muted}>this month</span></>}
      </Stat>
      <Stat label="Open rate" value="—"><span className={muted}>{NO_PROVIDER}</span></Stat>
      <Stat label="Click rate" value="—"><span className={muted}>{NO_PROVIDER}</span></Stat>
      <Stat label="Growth · 30d" value={s?.growth30dPct != null ? `${s.growth30dPct >= 0 ? '+' : '−'}${Math.abs(s.growth30dPct).toFixed(1)}%` : '—'}>
        {s && (
          <>
            <span className={`font-mono ${s.net30d >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{fmtSigned(s.net30d)} net</span>
            <span className={muted}>−{fmtN(s.unsub30d)} unsub</span>
          </>
        )}
      </Stat>
    </div>
  );
}

function RecentSubscribers({ rows, newThisMonth, onOpen }: {
  rows: Subscriber[]; newThisMonth?: number; onOpen: (s: Subscriber) => void;
}) {
  return (
    <Widget title="Recent subscribers" note={newThisMonth != null ? `this month · ${fmtN(newThisMonth)}` : undefined}>
      {rows.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-[var(--text-faint)]">No subscribers yet.</p>}
      {rows.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onOpen(s)}
          className={`w-full flex items-center gap-[11px] px-4 py-[11px] text-left hover:bg-[var(--bg-hover)] transition-colors ${i ? 'border-t border-[var(--border)]' : ''}`}
        >
          <Avatar s={s} />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] text-[var(--text-primary)] truncate">{s.name ?? s.email}</span>
            <span className="block text-[11px] text-[var(--text-muted)] truncate">{s.email}</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">{SOURCE_LABEL[s.source]}</span>
        </button>
      ))}
    </Widget>
  );
}

function ListSources({ summary }: { summary: SubscriberSummary | null }) {
  const total = summary?.total ?? 0;
  return (
    <Widget title="List sources" note="all-time share">
      <div className="p-4 flex flex-col gap-[11px]">
        {(!summary || total === 0) && <p className="text-[12px] text-[var(--text-faint)] text-center py-2">No data yet.</p>}
        {summary && total > 0 && summary.bySource.map((g, i) => {
          const pct = Math.round((g.count / total) * 100);
          return (
            <div key={g.source} className="flex items-center gap-2.5">
              <span className="text-[12px] text-[var(--text-secondary)] w-[82px] flex-shrink-0">{SOURCE_LABEL[g.source]}</span>
              <div className="flex-1 h-1.5 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${pct}%`, opacity: i === 0 ? 0.9 : i === 1 ? 0.45 : 0.25 }} />
              </div>
              <span className="font-mono text-[11px] text-[var(--text-muted)] w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}
