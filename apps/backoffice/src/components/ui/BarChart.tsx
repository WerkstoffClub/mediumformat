/** Monochrome stacked bar chart (SVG, no deps). Series are stacked bottom-up in
 *  order; the first series is drawn strongest. Used by Customers + Visitors analytics. */
export interface BarSeries { label: string; values: number[]; }

const SHADES = ['var(--text-primary)', 'var(--text-muted)', 'var(--text-faint)'];

export function BarChart({ labels, series, height = 160, labelEvery = 1, format = (v: number) => v.toLocaleString('en-GB') }: {
  labels: string[];
  labelEvery?: number;
  series: BarSeries[];
  height?: number;
  format?: (v: number) => string;
}) {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div>
      <div className="flex items-end gap-[6px]" style={{ height }} role="img" aria-label={series.map(s => s.label).join(' and ') + ' per period'}>
        {labels.map((label, i) => (
          <div key={i} className="flex-1 h-full flex flex-col-reverse min-w-0" title={`${label} · ${series.map(s => `${s.label} ${format(s.values[i] ?? 0)}`).join(' · ')}`}>
            {series.map((s, si) => {
              const v = s.values[i] ?? 0;
              return v > 0 ? (
                <span key={s.label} className="block w-full first:rounded-b-[2px] last:rounded-t-[2px]" style={{ height: `${(v / max) * 100}%`, background: SHADES[si] ?? SHADES[2] }} />
              ) : null;
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-[6px] mt-2">
        {labels.map((label, i) => (
          <span key={i} className="flex-1 min-w-0 text-center font-mono text-[10px] text-[var(--text-muted)] whitespace-nowrap overflow-visible">{i % labelEvery === 0 ? label : ''}</span>
        ))}
      </div>
      {series.length > 1 && (
        <div className="flex gap-4 mt-3">
          {series.map((s, si) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-[2px]" style={{ background: SHADES[si] ?? SHADES[2] }} />{s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal share bars — label, count, proportional bar. */
export function ShareList({ rows, empty = 'No data yet.' }: { rows: Array<{ label: string; count: number }>; empty?: string }) {
  const max = Math.max(...rows.map(r => r.count), 1);
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) return <p className="px-4 py-6 text-[11px] text-[var(--text-faint)] text-center">{empty}</p>;
  return (
    <div>
      {rows.map(r => (
        <div key={r.label} className="px-4 py-3 border-t border-[var(--border)] first:border-t-0">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[12px] text-[var(--text-secondary)] truncate">{r.label}</span>
            <span className="font-mono text-[12px] text-[var(--text-primary)] whitespace-nowrap">
              {r.count.toLocaleString('en-GB')} <span className="text-[var(--text-muted)]">· {Math.round((r.count / total) * 100)}%</span>
            </span>
          </div>
          <span className="block h-[5px] rounded-full bg-[var(--neutral-t)] overflow-hidden">
            <span className="block h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
