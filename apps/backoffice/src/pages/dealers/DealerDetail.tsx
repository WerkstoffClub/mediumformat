import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDealer, getDealer, listDealerTxns, DEALER_STATUS_LABEL, type DealerDetail as Detail, type DealerTxn } from '../../api/dealers';
import { EmptyRow, Paginator, SearchBox, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnGhost, errMsg, useToast } from '../../components/ui/Drawer';
import { fmtAgo, fmtNum, fmtRp, fmtRpShort, fmtShowTime } from '../../lib/idFormat';
import { DealerDrawer } from './DealerDrawer';

const LIMIT = 50;

function itemsLabel(t: DealerTxn) {
  const first = t.items[0];
  if (!first) return '—';
  const more = t.items.length - 1;
  return `${first.title}${first.qty > 1 ? ` ×${first.qty}` : ''}${more > 0 ? ` + ${more} more` : ''}`;
}

export function DealerDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [dealer, setDealer] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<DealerTxn[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    getDealer(id).then(setDealer).catch(e => setError(errMsg(e, 'Could not load dealer.')));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    const t = setTimeout(() => {
      listDealerTxns(id, { q: q || undefined, page, limit: LIMIT })
        .then(r => { setTxns(r.items); setTotal(r.total); })
        .catch(() => setTxns([]));
    }, 250);
    return () => clearTimeout(t);
  }, [id, q, page]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">{error}</p>;
  if (!dealer) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const fee = Number(dealer.feePct);
  const remove = async () => {
    if (!confirm(`Delete dealer ${dealer.name}?`)) return;
    try { await deleteDealer(dealer.id); nav('/dealers'); } catch (e) { showToast('err', errMsg(e, 'Delete failed.')); }
  };

  return (
    <div>
      <Link to="/dealers" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Dealers</Link>
      <div className="flex items-start justify-between gap-3 mt-2 mb-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">{dealer.name}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
            Dealer{dealer.kind ? ` · ${dealer.kind}` : ''} · {[dealer.area, dealer.city].filter(Boolean).join(', ')} · MF POS + catalog · synced {fmtAgo(dealer.lastSyncAt)}
            <StatusPill value={DEALER_STATUS_LABEL[dealer.status]} />
          </p>
        </div>
        <button className={btnGhost} onClick={() => setEditing(true)}>Edit dealer</button>
      </div>
      {toast}

      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="POS sales · 30D" value={fmtRpShort(dealer.sales30d)}>today {fmtRpShort(dealer.salesToday)} · {fmtNum(dealer.txnsToday)} txn{dealer.txnsToday === 1 ? "" : "s"}</Stat>
        <Stat label="Transactions · 30D" value={fmtNum(dealer.txns30d)}>avg basket {fmtRpShort(dealer.avgBasket)}</Stat>
        <Stat label="Items sold · 30D" value={fmtNum(dealer.items30d)}>paid transactions</Stat>
        <Stat label="MF fee · 30D" value={fmtRpShort(dealer.sales30d * fee / 100)}>{String(fee).replace('.', ',')}% of POS sales</Stat>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4 mb-4 max-lg:grid-cols-1">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search txn # or cashier…" />
          </div>
          <Widget title="POS transactions" note={`${fmtNum(total)} total`}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[720px]">
                <thead><tr>{['Txn', 'Time', 'Items', 'Payment', 'Cashier', 'Amount', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {!txns && <EmptyRow cols={7}>Loading…</EmptyRow>}
                  {txns?.length === 0 && <EmptyRow cols={7}>{q ? 'No transactions match.' : 'No POS transactions synced yet.'}</EmptyRow>}
                  {txns?.map(t => (
                    <tr key={t.id} className="border-b border-[var(--border-sub)]">
                      <td className={`${tdCls} font-mono text-[var(--text-primary)]`}>{t.txnNo}</td>
                      <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtShowTime(t.occurredAt)}</td>
                      <td className={tdCls}>
                        <p className="text-[var(--text-secondary)]">{itemsLabel(t)}</p>
                        <p className="text-[10.5px] text-[var(--text-muted)]">{fmtNum(t.itemCount)} item{t.itemCount === 1 ? '' : 's'}</p>
                      </td>
                      <td className={tdCls}>{t.payment}</td>
                      <td className={`${tdCls} text-[var(--text-secondary)]`}>{t.cashier ?? '—'}</td>
                      <td className={`${tdCls} font-mono text-right`}>{fmtRp(t.amountIdr)}</td>
                      <td className={tdCls}><StatusPill value={t.status === 'PAID' ? 'Paid' : 'Refunded'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={page} limit={LIMIT} total={total} shown={txns?.length ?? 0} onPage={setPage} />
          </Widget>
        </div>
        <div className="space-y-4">
          <Widget title="Payment mix" note="30D">
            <ul className="divide-y divide-[var(--border-sub)]">
              {dealer.paymentMix.length === 0 && <li className="px-4 py-6 text-center text-[11px] text-[var(--text-faint)]">No sales yet.</li>}
              {dealer.paymentMix.map(m => (
                <li key={m.payment} className="px-4 py-2.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{m.payment}</span>
                    <span className="font-mono">{fmtRpShort(m.amount)}</span>
                  </div>
                  <div className="h-1 mt-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                    <div className="h-full bg-[var(--text-primary)]" style={{ width: `${dealer.sales30d ? (m.amount / dealer.sales30d) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Widget>
          <Widget title="Catalog & stock">
            <p className="px-4 py-5 text-[11.5px] text-[var(--text-muted)]">Dealer shelf stock sync is not live yet — transactions arrive from the dealer's POS via <span className="font-mono">POST /dealers/:id/transactions</span>.</p>
          </Widget>
        </div>
      </div>

      {dealer.notes && <p className="mt-2 text-[12px] text-[var(--text-muted)] whitespace-pre-line">{dealer.notes}</p>}
      <button onClick={remove} className="mt-6 text-[11px] text-[var(--text-faint)] hover:text-[var(--danger)]">Delete dealer</button>

      {editing && <DealerDrawer dealer={dealer} onClose={() => setEditing(false)} onToast={showToast} onSaved={load} />}
    </div>
  );
}
