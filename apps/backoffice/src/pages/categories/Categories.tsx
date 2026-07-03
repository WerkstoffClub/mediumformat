import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { channelColor, getCatalogSummary, getChannels, type CatalogSummary, type ChannelSummary } from '../../api/ops';
import { PageHeader, Panel } from '../../components/ui/Page';

function GroupList({ rows, linkBase }: { rows: CatalogSummary['formats']; linkBase?: string }) {
  const max = Math.max(...rows.map(r => r.releases), 1);
  return (
    <div className="p-4 space-y-3">
      {rows.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">Nothing here yet.</p>}
      {rows.map(row => (
        <div key={row.name}>
          <div className="flex items-center justify-between mb-1">
            {linkBase ? (
              <Link to={`${linkBase}${encodeURIComponent(row.name)}`} className="text-[12px] text-[var(--text-primary)] hover:underline truncate">{row.name}</Link>
            ) : (
              <span className="text-[12px] text-[var(--text-primary)] truncate">{row.name.replace(/_/g, ' ')}</span>
            )}
            <span className="font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">{row.releases} · {row.units} in stock</span>
          </div>
          <span className="block h-[6px] rounded-full bg-[var(--brand-muted)] overflow-hidden">
            <span className="block h-full rounded-full bg-[var(--text-primary)]" style={{ width: `${(row.releases / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Categories() {
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [channels, setChannels] = useState<ChannelSummary['channels']>([]);

  useEffect(() => {
    getCatalogSummary().then(setCatalog).catch(() => {});
    getChannels().then(r => setChannels(r.channels)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Categories & Tags" sub="How the catalogue and sales are organised — formats, genres, locations and channel tags" />
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Panel title="Formats" note={catalog ? `${catalog.formats.length} formats` : undefined}>
          <GroupList rows={catalog?.formats ?? []} />
        </Panel>
        <Panel title="Store locations">
          <GroupList rows={catalog?.locations ?? []} />
        </Panel>
        <Panel title="Genres" note={catalog ? `${catalog.genres.length} genres` : undefined}>
          <div className="max-h-[380px] overflow-y-auto">
            <GroupList rows={catalog?.genres ?? []} linkBase="/inventory?q=" />
          </div>
        </Panel>
        <Panel title="Channel tags" note="the Tag on every DealPOS invoice">
          <div className="p-4 flex flex-wrap gap-2">
            {channels.map(c => (
              <span key={c.tag} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: channelColor(c.tag) }} />
                {c.tag}
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{c.orders}</span>
              </span>
            ))}
            {channels.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No channel tags yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
