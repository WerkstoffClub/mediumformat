import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReleases } from '../../api/inventory';
import { getSyncStatus, runSync, type SyncEntityState } from '../../api/finance';
import { getSocialSettings, updateSocialSettings, type SocialSettings } from '../../api/social';
import { getChannels, type ChannelSummary } from '../../api/ops';
import { PageHeader } from '../../components/ui/Page';

type Status = 'connected' | 'syncing' | 'error' | 'off';

const STATUS_STYLE: Record<Status, [string, string]> = {
  connected: ['Connected', 'bg-[var(--success-t)] text-[var(--success)]'],
  syncing:   ['Syncing', 'bg-[var(--info-t)] text-[var(--info)]'],
  error:     ['Error', 'bg-[var(--danger-t)] text-[var(--danger)]'],
  off:       ['Off', 'bg-[var(--brand-muted)] text-[var(--text-muted)]'],
};

function StatusPill({ status }: { status: Status }) {
  const [label, cls] = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-[5px] text-[11px] font-medium px-[9px] py-[2px] rounded-full whitespace-nowrap ${cls}`}>
      <span className="w-[6px] h-[6px] rounded-full bg-current" />{label}
    </span>
  );
}

interface Card {
  name: string;
  kind: string;
  color: string;
  status: Status;
  icon: React.ReactNode;
  metrics: Array<[string, string]>;
  action?: { label: string; onClick?: () => void; to?: string; busy?: boolean };
  configureTo?: string;
  toggle?: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean };
}

const ic = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);

const ago = (v: string | null | undefined): string => {
  if (!v) return '—';
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 36) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export function Channels() {
  const [sync, setSync] = useState<SyncEntityState[]>([]);
  const [syncRunning, setSyncRunning] = useState(false);
  const [social, setSocial] = useState<SocialSettings | null>(null);
  const [tags, setTags] = useState<ChannelSummary['channels']>([]);
  const [totalReleases, setTotalReleases] = useState(0);
  const [feedListings, setFeedListings] = useState(0);

  const load = () => {
    getSyncStatus().then(s => { setSync(s.entities); setSyncRunning(s.running); }).catch(() => {});
    getSocialSettings().then(setSocial).catch(() => {});
    getChannels().then(r => setTags(r.channels)).catch(() => {});
    getReleases({ limit: 1 }).then(r => setTotalReleases(r.total)).catch(() => {});
    Promise.all([
      getReleases({ limit: 1, stock: 'in' }).then(r => r.total).catch(() => 0),
      getReleases({ limit: 1, stock: 'low' }).then(r => r.total).catch(() => 0),
    ]).then(([a, b]) => setFeedListings(a + b));
  };
  useEffect(load, []);

  const syncErrors = sync.filter(e => e.status === 'error');
  const lastSync = sync.map(e => e.lastRunAt).filter(Boolean).sort().pop() ?? null;
  const tag = (pattern: RegExp) => tags.find(t => pattern.test(t.tag));
  const tiktok = tag(/tiktok/i);
  const shopee = tag(/shopee/i);

  const onSyncNow = async () => {
    setSyncRunning(true);
    try { await runSync(); } finally { load(); }
  };

  const onFeedToggle = async (checked: boolean) => {
    const updated = await updateSocialSettings({ feedEnabled: checked }).catch(() => null);
    if (updated) setSocial(updated);
  };

  const cards: Card[] = useMemo(() => [
    {
      name: 'DealPOS',
      kind: 'POS + store system · source of truth',
      color: '#0EA5E9',
      status: syncRunning ? 'syncing' : syncErrors.length > 0 ? 'error' : 'connected',
      icon: ic(<><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="3" y1="20" x2="21" y2="20"/><line x1="8" y1="9" x2="16" y2="9"/></>),
      metrics: [['Last sync', ago(lastSync)], ['Listings', String(totalReleases)]],
      action: { label: syncRunning ? 'Syncing…' : 'Sync now', onClick: onSyncNow, busy: syncRunning },
      configureTo: '/sales',
      toggle: { checked: true, disabled: true },
    },
    {
      name: 'Meta catalogue',
      kind: 'Facebook · Instagram · WhatsApp',
      color: '#6366F1',
      status: social ? (social.feedEnabled ? 'connected' : 'off') : 'off',
      icon: ic(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
      metrics: [['Feed', social?.feedEnabled ? 'Pulled hourly by Meta' : 'Disabled'], ['Listings', String(feedListings)]],
      configureTo: '/social',
      toggle: { checked: social?.feedEnabled ?? false, onChange: onFeedToggle },
    },
    {
      name: 'TikTok Shop',
      kind: 'marketplace · via DealPOS',
      color: '#69C9D0',
      status: tiktok ? 'connected' : 'off',
      icon: ic(<><path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>),
      metrics: [['Orders', tiktok ? String(tiktok.orders) : '—'], ['Last order', tiktok ? ago(tiktok.lastOrderAt) : '—']],
      configureTo: '/settlements',
      toggle: { checked: Boolean(tiktok), disabled: true },
    },
    {
      name: 'Shopee',
      kind: 'marketplace · via DealPOS',
      color: '#F97316',
      status: shopee ? 'connected' : 'off',
      icon: ic(<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>),
      metrics: [['Orders', shopee ? String(shopee.orders) : '—'], ['Last order', shopee ? ago(shopee.lastOrderAt) : '—']],
      configureTo: '/settlements',
      toggle: { checked: Boolean(shopee), disabled: true },
    },
    {
      name: 'Website',
      kind: 'mediumformat.info · storefront',
      color: '#6366F1',
      status: 'off',
      icon: ic(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
      metrics: [['Status', 'Prototype live'], ['Checkout', 'Not yet built']],
      toggle: { checked: false, disabled: true },
    },
    {
      name: 'Discogs',
      kind: 'marketplace · collector',
      color: '#9CA3AF',
      status: 'off',
      icon: ic(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></>),
      metrics: [['Last sync', '—'], ['Listings', '—']],
      toggle: { checked: false, disabled: true },
    },
    {
      name: 'Bandcamp',
      kind: 'digital + physical',
      color: '#14B8A6',
      status: 'off',
      icon: ic(<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15l4-6 4 6z"/></>),
      metrics: [['Last sync', '—'], ['Listings', '—']],
      toggle: { checked: false, disabled: true },
    },
  ], [syncRunning, syncErrors.length, lastSync, totalReleases, social, feedListings, tiktok, shopee]);

  const active = cards.filter(c => c.status === 'connected' || c.status === 'syncing').length;

  return (
    <div>
      <PageHeader
        title="Sales Channels"
        sub="Connections, sync health & listings across every storefront"
        actions={
          <button
            onClick={onSyncNow}
            disabled={syncRunning}
            className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={1.6}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            {syncRunning ? 'Syncing…' : 'Sync all'}
          </button>
        }
      />

      {/* summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-[18px] max-md:grid-cols-2">
        {[
          ['Active channels', `${active} / ${cards.length}`],
          ['Catalogue listings', String(totalReleases)],
          ['Last full sync', ago(lastSync)],
          ['Sync errors', String(syncErrors.length)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)] mb-2">{label}</p>
            <p className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{value}</p>
          </div>
        ))}
      </div>

      {/* channel cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 mb-[22px]">
        {cards.map(card => (
          <div key={card.name} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[18px] flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-[11px]">
                <div
                  className="w-[38px] h-[38px] rounded-[6px] border flex items-center justify-center flex-shrink-0"
                  style={{ color: card.color, background: `color-mix(in srgb, ${card.color} 13%, var(--bg-overlay))`, borderColor: `color-mix(in srgb, ${card.color} 32%, var(--border))` }}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{card.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-[2px]">{card.kind}</p>
                </div>
              </div>
              <StatusPill status={card.status} />
            </div>
            <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-[var(--border)]">
              {card.metrics.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-medium mb-1">{label}</p>
                  <p className={`text-[14px] ${value === '—' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {card.action ? (
                <button
                  onClick={card.action.onClick}
                  disabled={card.action.busy}
                  className="flex-1 text-[12px] font-medium px-2.5 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-50 transition-colors"
                >
                  {card.action.label}
                </button>
              ) : <span className="flex-1" />}
              {card.configureTo && (
                <Link to={card.configureTo} className="text-[12px] font-medium px-2.5 py-2 rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors">
                  Configure
                </Link>
              )}
              {card.toggle && (
                <label className={`relative w-10 h-[23px] flex-shrink-0 ${card.toggle.disabled ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="absolute opacity-0 w-full h-full m-0"
                    checked={card.toggle.checked}
                    disabled={card.toggle.disabled}
                    onChange={e => card.toggle?.onChange?.(e.target.checked)}
                    aria-label={`${card.name} connection`}
                  />
                  <span className={`absolute inset-0 rounded-full border transition-colors ${card.toggle.checked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-overlay)] border-[var(--border)]'}`} />
                  <span className={`absolute top-[3px] left-[3px] w-[15px] h-[15px] rounded-full transition-transform ${card.toggle.checked ? 'translate-x-[17px] bg-[var(--accent-text)]' : 'bg-[var(--text-muted)]'}`} />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* sync activity log */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
        <div className="flex items-center justify-between gap-2.5 px-4 py-[13px] bg-[var(--bg-overlay)] border-b border-[var(--border)]">
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">Sync activity log</span>
          <span className="text-[11px] text-[var(--text-muted)]">DealPOS entities · latest run</span>
        </div>
        {sync.length === 0 && <p className="px-4 py-6 text-[12px] text-[var(--text-faint)]">No sync has run yet.</p>}
        {sync.map(entity => (
          <div key={entity.entity} className="flex gap-3 px-4 py-3 border-t border-[var(--border)] first:border-t-0 items-start">
            <span className={`w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 ${entity.status === 'error' ? 'bg-[var(--danger-t)] text-[var(--danger)]' : 'bg-[var(--success-t)] text-[var(--success)]'}`}>
              {entity.status === 'error'
                ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                : <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] text-[var(--text-primary)] capitalize">{entity.entity} — {entity.status}</span>
              <span className="block text-[12px] text-[var(--text-muted)] mt-[3px] truncate">{entity.message ?? '—'}</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">{ago(entity.lastRunAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
