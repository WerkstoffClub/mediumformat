import { useEffect, useState } from 'react';
import { fmtDate, getCustomers, type CustomerRow } from '../../api/ops';
import { EmptyRow, PageHeader, Paginator, SearchBox, tdCls, thCls } from '../../components/ui/Page';

export function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCustomers({ q: q || undefined, page, limit: 50 })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [q, page]);

  return (
    <div>
      <PageHeader title="Customers" sub={`${total} customers synced from DealPOS`} />
      <div className="mb-4"><SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search name, email, phone or code…" /></div>
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Name', 'Code', 'Mobile', 'Email', 'Joined'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={5}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && <EmptyRow cols={5}>No customers match.</EmptyRow>}
            {rows.map(c => (
              <tr key={c.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className={`${tdCls} font-medium text-[var(--text-primary)]`}>{c.name}</td>
                <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{c.code ?? '—'}</td>
                <td className={`${tdCls} font-mono`}>{c.mobile ?? '—'}</td>
                <td className={`${tdCls} text-[var(--text-secondary)] max-w-[220px] truncate`}>{c.email ?? '—'}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(c.joinDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}
