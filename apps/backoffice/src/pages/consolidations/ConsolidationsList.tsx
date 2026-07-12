import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createConsolidation, getConsolidations, type ConsolidationRow } from '../../api/consolidations';
import { fmtDate, fmtIdr } from '../../api/ops';
import { EmptyRow, PageHeader, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { apiErrorMessage, CONSOLIDATION_STATUS_LABEL, Field, inputCls } from './shared';

/** Inline creation form — a lighter-weight alternative to a full drawer/page,
 *  since a consolidation only needs a forwarder name (+ optional tracking
 *  numbers) to be created; everything else is added on the detail page. */
function NewConsolidationForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [forwarderName, setForwarderName] = useState('');
  const [trackingRaw, setTrackingRaw] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    if (!forwarderName.trim()) { setError('Forwarder name is required.'); return; }
    setError(null);
    setCreating(true);
    try {
      const result = await createConsolidation({
        forwarderName: forwarderName.trim(),
        trackingRaw: trackingRaw.trim() || undefined,
      });
      onCreated(result.id);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create consolidation. Try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 mb-3">
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <Field label="Forwarder name" required>
          <input
            className={inputCls}
            value={forwarderName}
            onChange={e => setForwarderName(e.target.value)}
            placeholder="e.g. DHL Global Forwarding"
            autoFocus
          />
        </Field>
        <Field label="Tracking (optional)">
          <input
            className={inputCls}
            value={trackingRaw}
            onChange={e => setTrackingRaw(e.target.value)}
            placeholder="Tracking numbers, one per line or comma-separated"
          />
        </Field>
      </div>
      {error && <p className="text-[11px] text-[var(--danger)] mt-2">{error}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onCreate}
          disabled={creating}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          disabled={creating}
          className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ConsolidationsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConsolidationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getConsolidations()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <div>
      <PageHeader
        title="Forwarder Consolidations"
        sub="Group international orders by freight forwarder, then split the forwarder invoice across lines by weight."
        actions={(
          <button
            onClick={() => setShowNew(v => !v)}
            className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            + New consolidation
          </button>
        )}
      />

      {showNew && (
        <NewConsolidationForm
          onCancel={() => setShowNew(false)}
          onCreated={id => navigate(`/consolidations/${id}`)}
        />
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Consolidation #', 'Forwarder', 'Orders', 'Forwarder invoice', 'Status', 'Created'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={6}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={6}>No consolidations yet — create one to start grouping international orders.</EmptyRow>
            )}
            {rows.map(row => (
              <tr
                key={row.id}
                onClick={() => navigate(`/consolidations/${row.id}`)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)] whitespace-nowrap`}>{row.number}</td>
                <td className={`${tdCls} max-w-[240px] truncate`}>{row.forwarderName || <span className="text-[var(--text-faint)]">—</span>}</td>
                <td className={`${tdCls} font-mono text-right`}>{row._count?.orders ?? 0}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(row.forwarderInvoiceIdr)}</td>
                <td className={tdCls}><StatusPill value={CONSOLIDATION_STATUS_LABEL[row.status]} /></td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
