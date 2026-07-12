import { useState } from 'react';
import { discogsLookup, type DiscogsMapped, type DiscogsSearchResult } from '../../../api/integrations';
import { ModalShell } from './ModalShell';
import { inputCls } from './shared';

interface Props {
  seedArtist?: string;
  seedTitle?: string;
  onResolved: (payload: DiscogsMapped) => void;
  onClose: () => void;
}

/**
 * Two ways to identify the target Discogs release:
 *  - direct ID lookup (fastest, no ambiguity)
 *  - search by artist + title (returns up to N candidates, click one to resolve)
 */
export function DiscogsLookupPopover({ seedArtist, seedTitle, onResolved, onClose }: Props) {
  const [mode, setMode] = useState<'id' | 'search'>(seedArtist || seedTitle ? 'search' : 'id');
  const [idValue, setIdValue] = useState('');
  const [artist, setArtist] = useState(seedArtist ?? '');
  const [title, setTitle] = useState(seedTitle ?? '');
  const [results, setResults] = useState<DiscogsSearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runLookup = async (body: { discogsId?: string; artist?: string; title?: string }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await discogsLookup(body);
      if ('results' in res) {
        setResults(res.results);
      } else {
        onResolved(res);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (msg?.status === 501) {
        setError('Discogs integration not configured on the server — set DISCOGS_TOKEN and restart.');
      } else {
        setError(msg?.data?.message ?? 'Discogs lookup failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Look up on Discogs" onClose={onClose}>
      <div className="flex gap-1.5 mb-4">
        {(['id', 'search'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setResults(null);
            }}
            className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
              mode === m
                ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-overlay)]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
            }`}
          >
            {m === 'id' ? 'Discogs ID' : 'Search'}
          </button>
        ))}
      </div>

      {mode === 'id' ? (
        <div>
          <label className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-muted)] block mb-1.5">
            Discogs release ID
          </label>
          <div className="flex gap-2">
            <input
              className={`${inputCls} font-mono`}
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
              placeholder="e.g. 1234567"
            />
            <button
              type="button"
              onClick={() => runLookup({ discogsId: idValue.trim() })}
              disabled={busy || !idValue.trim()}
              className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50 whitespace-nowrap"
            >
              {busy ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Paste the numeric ID from a Discogs release URL (e.g. /release/1234567-…).
          </p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-muted)] block mb-1.5">
                Artist
              </label>
              <input className={inputCls} value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-muted)] block mb-1.5">
                Title
              </label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => runLookup({ artist: artist.trim(), title: title.trim() })}
            disabled={busy || (!artist.trim() && !title.trim())}
            className="mt-3 px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
          >
            {busy ? 'Searching…' : 'Search Discogs'}
          </button>

          {results && results.length === 0 && (
            <p className="text-[12px] text-[var(--text-muted)] mt-3">
              No results — try a different combination.
            </p>
          )}

          {results && results.length > 0 && (
            <ul className="mt-3 space-y-1">
              {results.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => runLookup({ discogsId: r.id })}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-[6px] hover:bg-[var(--bg-overlay)] border border-[var(--border)]"
                  >
                    {r.thumb ? (
                      <img
                        src={r.thumb}
                        alt=""
                        className="w-10 h-10 rounded-[4px] object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] flex-shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-[var(--text-primary)] truncate">
                        {r.title}
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)] truncate">
                        {[r.year, r.country, r.format?.join(', ')].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{r.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="text-[12px] text-[var(--danger)] mt-3 border border-[var(--danger)] rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </ModalShell>
  );
}
