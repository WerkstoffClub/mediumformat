import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDealers, DEALER_STATUS_LABEL, type DealerRow } from '../../api/dealers';
import { EmptyRow, PageHeader, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnPrimary, useToast } from '../../components/ui/Drawer';
import { fmtAgo, fmtNum, fmtRpShort } from '../../lib/idFormat';
import { DealerDrawer } from './DealerDrawer';

export function Dealers() {
  const nav = useNavigate();
  const [rows, setRows] = useState<DealerRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    listDealers().then(r => { setRows(r); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const kpi = useMemo(() => {
    const r = rows ?? [];
    const sales = r.reduce((n, d) => n + d.sales30d, 0);
    const txns = r.reduce((n, d) => n + d.txns30d, 0);
    const fee = r.reduce((n, d) => n + d.sales30d * Number(d.feePct) / 100, 0);
    return {
      live: r.filter(d => d.status === 'LIVE').length,
      pipeline: r.filter(d => d.status === 'ONBOARDING' || d.status === 'PROSPECT').length,
      sales, txns, fee, basket: txns ? sales / txns : 0,
    };
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Dealers · Record shops"
        sub="Independent shops selling physical releases on the Medium Format POS & catalog — POS transactions"
        actions={<button className={btnPrimary} onClick={() => setAdding(true)}>Add dealer</button>}
      />
      {toast}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="Live dealers" value={fmtNum(kpi.live)}>{fmtNum(kpi.pipeline)} onboarding / prospect</Stat>
        <Stat label="POS sales · 30D" value={fmtRpShort(kpi.sales)}>MF fee {fmtRpShort(kpi.fee)}</Stat>
        <Stat label="Transactions · 30D" value={fmtNum(kpi.txns)}>avg basket {fmtRpShort(kpi.basket)}</Stat>
        <Stat label="Dealers" value={fmtNum(rows?.length ?? 0)}>all statuses</Stat>
      </div>

      <Widget title="Dealers">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead><tr>{['Dealer', 'Type', 'POS sales · 30D', 'Txns', 'Last sync', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {failed && <EmptyRow cols={6}>Could not load dealers.</EmptyRow>}
              {!failed && !rows && <EmptyRow cols={6}>Loading…</EmptyRow>}
              {rows?.length === 0 && <EmptyRow cols={6}>No dealers yet — add the first record shop running the MF POS.</EmptyRow>}
              {rows?.map(d => (
                <tr key={d.id} onClick={() => nav(`/dealers/${d.id}`)} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer">
                  <td className={tdCls}>
                    <p className="font-medium text-[var(--text-primary)]">{d.name}</p>
                    <p className="text-[10.5px] text-[var(--text-muted)]">{[d.area, d.city].filter(Boolean).join(', ')}</p>
                  </td>
                  <td className={`${tdCls} text-[var(--text-secondary)]`}>{d.kind ?? '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{d.sales30d ? fmtRpShort(d.sales30d) : '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{d.txns30d ? fmtNum(d.txns30d) : '—'}</td>
                  <td className={`${tdCls} text-[var(--text-muted)]`}>{fmtAgo(d.lastSyncAt)}</td>
                  <td className={tdCls}><StatusPill value={DEALER_STATUS_LABEL[d.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Widget>

      {adding && <DealerDrawer dealer={null} onClose={() => setAdding(false)} onToast={showToast} onSaved={d => nav(`/dealers/${d.id}`)} />}
    </div>
  );
}
