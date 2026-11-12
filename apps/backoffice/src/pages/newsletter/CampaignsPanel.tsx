import { useEffect, useState } from 'react';
import {
  deleteCampaign, duplicateCampaign, listCampaigns,
  type Campaign, type CampaignStatus,
} from '../../api/newsletter';
import { EmptyRow, Paginator, StatusPill, Widget } from '../../components/ui/Page';
import { td, th, type ToastFn } from './shared';

type StatusFilter = 'all' | CampaignStatus;

const LIMIT = 25;

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'SENT',      label: 'Sent' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'DRAFT',     label: 'Draft' },
];

const STATUS_LABEL: Record<CampaignStatus, string> = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENT: 'Sent' };
const META_FALLBACK: Record<CampaignStatus, string> = {
  SENT: 'Broadcast · all subscribers', SCHEDULED: 'Broadcast · scheduled', DRAFT: 'Draft · not sent',
};

const dayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const hourMin = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function sendDate(c: Campaign): string {
  if (c.sentAt) return dayMonth(new Date(c.sentAt));
  if (c.scheduledAt) {
    const d = new Date(c.scheduledAt);
    return `${dayMonth(d)} · ${hourMin(d)}`;
  }
  return '—';
}

interface Props {
  reloadKey: number;
  onOpen: (id: string) => void;
  onChanged: () => void;
  onToast: ToastFn;
}

export function CampaignsPanel({ reloadKey, onOpen, onChanged, onToast }: Props) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listCampaigns({ page, limit: LIMIT, status: status !== 'all' ? status : undefined })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); onToast('err', 'Could not load campaigns.'); })
      .finally(() => setLoading(false));
  }, [page, status, reloadKey, onToast]);

  const pickFilter = (next: StatusFilter) => { setStatus(next); setPage(1); };

  const onDuplicate = async (c: Campaign) => {
    try {
      await duplicateCampaign(c.id);
      onToast('ok', 'Campaign duplicated.');
      onChanged();
    } catch {
      onToast('err', 'Duplicate failed.');
    }
  };

  const onDelete = async (c: Campaign) => {
    if (!confirm(`Delete "${c.subject}"? This can't be undone.`)) return;
    try {
      await deleteCampaign(c.id);
      onToast('ok', 'Campaign deleted.');
      onChanged();
    } catch {
      onToast('err', 'Delete failed.');
    }
  };

  const filterChips = (
    <div role="tablist" className="flex gap-[2px] flex-wrap">
      {FILTERS.map(f => {
        const on = f.key === status;
        return (
          <button
            key={f.key}
            role="tab"
            aria-selected={on}
            onClick={() => pickFilter(f.key)}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-[4px] transition-colors ${
              on
                ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Widget title="Campaigns" actions={filterChips}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Subject</th>
              <th className={`${th} max-md:hidden`}>Sent date</th>
              <th className={`${th} text-right`}>Recipients</th>
              <th className={`${th} text-right max-md:hidden`}>Open %</th>
              <th className={`${th} text-right max-md:hidden`}>Click %</th>
              <th className={th}>Status</th>
              <th className={th}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={7}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={7}>
                {status === 'all' ? 'No campaigns yet — draft one to get started.' : 'No campaigns with this status.'}
              </EmptyRow>
            )}
            {!loading && rows.map(c => (
              <tr key={c.id} onClick={() => onOpen(c.id)} className="cursor-pointer transition-colors hover:[&>td]:bg-[var(--bg-hover)]">
                <td className={`${td} max-w-[340px]`}>
                  <div className="text-[var(--text-primary)] font-medium truncate">
                    {c.subject || <span className="text-[var(--text-faint)]">(no subject)</span>}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{c.previewText || META_FALLBACK[c.status]}</div>
                </td>
                <td className={`${td} text-[12px] text-[var(--text-muted)] whitespace-nowrap max-md:hidden`}>{sendDate(c)}</td>
                <td className={`${td} text-right text-[var(--text-primary)] [font-variant-numeric:tabular-nums]`}>
                  {c.status === 'DRAFT' && c.recipientCount === 0 ? '—' : c.recipientCount.toLocaleString('id-ID')}
                </td>
                <td className={`${td} text-right text-[var(--text-faint)] max-md:hidden`} title="Open tracking starts once an email provider is connected">—</td>
                <td className={`${td} text-right text-[var(--text-faint)] max-md:hidden`} title="Click tracking starts once an email provider is connected">—</td>
                <td className={td}><StatusPill value={STATUS_LABEL[c.status]} /></td>
                <td className={`${td} text-right whitespace-nowrap`} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onDuplicate(c)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Duplicate</button>
                  <span className="text-[var(--text-faint)] mx-1.5">·</span>
                  <button onClick={() => onDelete(c)} className="text-[11px] text-[var(--danger)] hover:opacity-80">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginator page={page} limit={LIMIT} total={total} shown={rows.length} onPage={setPage} />
    </Widget>
  );
}
