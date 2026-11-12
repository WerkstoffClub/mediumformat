import { useEffect, useState } from 'react';
import { getVisitorsSummary, type VisitorsSummary } from '../../api/analytics';
import { PageHeader, Stat, Widget } from '../../components/ui/Page';
import { BarChart, ShareList } from '../../components/ui/BarChart';

type Range = 7 | 30 | 90;
const RANGES: Range[] = [7, 30, 90];

const fmt = (v: number) => v.toLocaleString('en-GB');

/** % change vs previous period; null when there is no baseline. */
const pctChange = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const d = pctChange(cur, prev);
  if (d === null) return <span className="text-[var(--text-muted)]">no prior data</span>;
  const good = invert ? d <= 0 : d >= 0;
  return (
    <>
      <span className={`font-mono ${good ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}%</span>
      <span className="text-[var(--text-muted)]">vs previous period</span>
    </>
  );
}

const dayLabel = (iso: string, range: Range) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return range === 7
    ? d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** Weekly buckets for the 90-day view so the chart stays readable. */
function chartPoints(daily: VisitorsSummary['daily'], range: Range) {
  if (range !== 90) return daily.map(d => ({ label: dayLabel(d.day, range), visitors: d.visitors, pageviews: d.pageviews }));
  const weeks: Array<{ label: string; visitors: number; pageviews: number }> = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    weeks.push({
      label: dayLabel(chunk[0].day, 30),
      // ponytail: weekly "visitors" sums daily uniques (a returning visitor counts once per day).
      visitors: chunk.reduce((s, d) => s + d.visitors, 0),
      pageviews: chunk.reduce((s, d) => s + d.pageviews, 0),
    });
  }
  return weeks;
}

export function Visitors() {
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<VisitorsSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    getVisitorsSummary(range).then(setData).catch(() => setError(true));
  }, [range]);

  const cur = data?.current;
  const prev = data?.previous;
  const points = data ? chartPoints(data.daily, range) : [];
  // Show every Nth label on long ranges so dates don't collide.
  const step = points.length > 16 ? Math.ceil(points.length / 10) : 1;

  return (
    <div>
      <PageHeader
        title="Visitors"
        sub={`Storefront traffic · first-party, cookieless${data ? ` · ${fmt(data.liveVisitors)} on site now` : ''}`}
        actions={
          <div className="flex gap-2">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-[13px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                  range === r ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <p className="mb-3.5 text-[12px] text-[var(--danger)]">Couldn’t load visitor analytics. Try again in a moment.</p>
      )}

      <div className="grid grid-cols-4 gap-3 mb-3.5 max-[1200px]:grid-cols-2 max-md:grid-cols-1">
        <Stat label="Unique visitors" value={fmt(cur?.visitors ?? 0)}>
          {cur && prev && <Delta cur={cur.visitors} prev={prev.visitors} />}
        </Stat>
        <Stat label="Page views" value={fmt(cur?.pageviews ?? 0)}>
          {cur && prev && <Delta cur={cur.pageviews} prev={prev.pageviews} />}
        </Stat>
        <Stat label="Pages / session" value={(cur?.pagesPerSession ?? 0).toFixed(1)}>
          <span className="font-mono text-[var(--text-primary)]">{fmt(cur?.sessions ?? 0)}</span>
          <span className="text-[var(--text-muted)]">sessions</span>
        </Stat>
        <Stat label="Bounce rate" value={`${cur?.bounceRate ?? 0}%`}>
          {cur && prev && prev.sessions > 0 ? <Delta cur={cur.bounceRate} prev={prev.bounceRate} invert /> : <span className="text-[var(--text-muted)]">single-page sessions</span>}
        </Stat>
      </div>

      <div className="mb-3.5">
        <Widget title="Analytics" note={range === 90 ? 'weekly · Jakarta time' : 'daily · Jakarta time'}>
          <div className="px-4 pt-4 pb-3.5">
            {!data ? (
              <p className="py-12 text-center text-[11px] text-[var(--text-faint)]">{error ? 'No data.' : 'Loading…'}</p>
            ) : cur?.pageviews === 0 ? (
              <p className="py-12 text-center text-[12px] text-[var(--text-muted)]">
                No visits recorded yet. Tracking starts once this release is live on the storefront.
              </p>
            ) : (
              <BarChart
                height={180}
                labels={points.map(p => p.label)}
                labelEvery={step}
                series={[{ label: 'Visitors', values: points.map(p => p.visitors) }]}
              />
            )}
          </div>
        </Widget>
      </div>

      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3.5 items-start max-[1200px]:grid-cols-1">
        <Widget title="Top pages" note="by views">
          {(data?.topPages ?? []).length === 0 ? (
            <p className="px-4 py-6 text-[11px] text-[var(--text-faint)] text-center">No page views yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Page', 'Views', 'Visitors'].map((h, i) => (
                    <th key={h} className={`text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold px-4 pt-[11px] pb-2.5 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.topPages.map(p => (
                  <tr key={p.path} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2.5 text-[13px] text-[var(--text-primary)] max-w-[360px] truncate">
                      <a href={p.path} target="_blank" rel="noreferrer" className="hover:underline underline-offset-2">{p.path}</a>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-right text-[var(--text-primary)]">{fmt(p.views)}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-right text-[var(--text-secondary)]">{fmt(p.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Widget>
        <Widget title="Sources" note="entry referrer">
          <ShareList rows={(data?.referrers ?? []).map(r => ({ label: r.source, count: r.visitors }))} empty="No visits yet." />
        </Widget>
        <Widget title="Devices" note="visitors">
          <ShareList
            rows={(data?.devices ?? []).map(d => ({ label: d.device[0].toUpperCase() + d.device.slice(1), count: d.visitors }))}
            empty="No visits yet."
          />
        </Widget>
      </div>
    </div>
  );
}
