import { useCallback, useEffect, useMemo, useState } from 'react';
import { fmtDate } from '../../api/ops';
import {
  deleteCampaign, duplicateCampaign, listCampaigns,
  type Campaign, type CampaignStatus,
} from '../../api/newsletter';
import { EmptyRow, SearchBox, tdCls, thCls } from '../../components/ui/Page';
import { CampaignDrawer } from './CampaignDrawer';

type StatusFilter = 'all' | CampaignStatus;

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'DRAFT',     label: 'Draft' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'SENT',      label: 'Sent' },
];

const PROVIDER_UNCONNECTED = 'Email provider not connected (Resend / Mailchimp)';

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function CampaignsTab() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [status, setStatus] = useState<StatusFilter>('all');

  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<string | 'new' | null>(null);

  const [kpiRows, setKpiRows] = useState<Campaign[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listCampaigns({
      limit: 100,
      q: debouncedQ || undefined,
      status: status !== 'all' ? status : undefined,
    })
      .then(r => setRows(r.items))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, status]);

  const loadKpi = useCallback(() => {
    listCampaigns({ limit: 200 })
      .then(r => setKpiRows(r.items))
      .catch(() => setKpiRows([]));
  }, []);

  useEffect(load, [load]);
  useEffect(loadKpi, [loadKpi]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const kpi = useMemo(() => {
    const draft = kpiRows.filter(c => c.status === 'DRAFT').length;
    const scheduled = kpiRows.filter(c => c.status === 'SCHEDULED').length;
    const sent = kpiRows.filter(c => c.status === 'SENT');
    const avg = sent.length === 0
      ? 0
      : Math.floor(sent.reduce((s, c) => s + c.recipientCount, 0) / sent.length);
    return { draft, scheduled, sent: sent.length, avg };
  }, [kpiRows]);

  const onDuplicate = async (c: Campaign) => {
    try {
      await duplicateCampaign(c.id);
      showToast('ok', 'Campaign duplicated.');
      load();
      loadKpi();
    } catch {
      showToast('err', 'Duplicate failed.');
    }
  };

  const onDelete = async (c: Campaign) => {
    if (!confirm(`Delete "${c.subject}"? This can't be undone.`)) return;
    try {
      await deleteCampaign(c.id);
      showToast('ok', 'Campaign deleted.');
      load();
      loadKpi();
    } catch {
      showToast('err', 'Delete failed.');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <KpiTile label="Draft" value={String(kpi.draft)} meta="Not yet scheduled" />
        <KpiTile label="Scheduled" value={String(kpi.scheduled)} meta="Waiting to send" />
        <KpiTile label="Sent" value={String(kpi.sent)} meta="All time" />
        <KpiTile label="Avg. recipients" value={String(kpi.avg)} meta="Mean of sent campaigns" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px]" role="tablist">
          {STATUS_TABS.map(t => {
            const on = t.key === status;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setStatus(t.key)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors ${
                  on
                    ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <SearchBox value={q} onChange={setQ} placeholder="Search subject…" />
        <button
          onClick={() => setSelected('new')}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
        >
          + New campaign
        </button>
      </div>

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

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Subject', 'Status', 'Recipients', 'Scheduled/Sent', ''].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={5}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={5}>
                {debouncedQ ? 'No campaigns match your search.' : 'No campaigns yet — draft one to get started.'}
              </EmptyRow>
            )}
            {rows.map(c => (
              <tr
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} text-[var(--text-primary)] max-w-[280px] truncate`}>
                  {c.subject || <span className="text-[var(--text-faint)]">(no subject)</span>}
                </td>
                <td className={tdCls}><CampaignStatusPill value={c.status} /></td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>
                  {c.recipientCount}
                </td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>
                  {c.sentAt ? fmtDate(c.sentAt) : c.scheduledAt ? fmtDate(c.scheduledAt) : '—'}
                </td>
                <td className={`${tdCls} text-right whitespace-nowrap`} onClick={e => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onDuplicate(c)}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Duplicate
                    </button>
                    <span className="text-[var(--text-faint)]">·</span>
                    <button
                      disabled
                      title={PROVIDER_UNCONNECTED}
                      className="text-[11px] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                    >
                      Send test
                    </button>
                    <span className="text-[var(--text-faint)]">·</span>
                    <button
                      onClick={() => onDelete(c)}
                      className="text-[11px] text-[var(--danger)] hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)]">
          {rows.length} shown
        </div>
      </div>

      {selected && (
        <CampaignDrawer
          key={selected}
          campaignId={selected === 'new' ? null : selected}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); loadKpi(); setSelected(null); }}
          onToast={showToast}
        />
      )}
    </div>
  );
}

const STATUS_COLOR: Record<CampaignStatus, string> = {
  DRAFT:     'var(--text-muted)',
  SCHEDULED: 'var(--warning)',
  SENT:      'var(--success)',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENT: 'Sent',
};

function CampaignStatusPill({ value }: { value: CampaignStatus }) {
  const color = STATUS_COLOR[value];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap"
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABEL[value]}
    </span>
  );
}

function KpiTile({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</span>
      <span className="block font-mono text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)] mt-1.5 [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      <span className="block text-[11px] text-[var(--text-faint)] mt-1">{meta}</span>
    </div>
  );
}
