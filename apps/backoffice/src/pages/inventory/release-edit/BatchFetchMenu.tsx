import { useState } from 'react';
import {
  appleSearch,
  spotifySearch,
  youtubeSearch,
} from '../../../api/integrations';
import type { Track } from './types';

type SourceKey = 'apple' | 'spotify' | 'youtube';
const SOURCE_LABEL: Record<SourceKey, string> = {
  apple: 'Apple Music',
  spotify: 'Spotify',
  youtube: 'YouTube',
};

interface Props {
  tracks: Track[];
  artist: string;
  onChange: (nextTracks: Track[]) => void;
}

/**
 * Sequential per-track fetcher. Runs against a chosen source, updates each
 * track's `previews[source]` with the first result, and reports progress
 * inline. Stops on quota / auth errors and surfaces the reason.
 */
export function BatchFetchMenu({ tracks, artist, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<{ i: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFor = async (source: SourceKey) => {
    setOpen(false);
    setError(null);
    if (tracks.length === 0) return;
    // Snapshot so intermediate updates use the freshest list.
    let current = [...tracks];
    for (let i = 0; i < current.length; i++) {
      const t = current[i];
      if (!t.title.trim()) continue;
      setProgress({ i: i + 1, total: current.length, label: t.title });
      try {
        const patch = await fetchOne(source, artist, t.title);
        if (patch) {
          current = current.map((row, j) =>
            j === i ? { ...row, previews: { ...(row.previews ?? {}), ...patch } } : row,
          );
          onChange(current);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 429) {
          setError(`Rate limited by ${SOURCE_LABEL[source]}. Stopped at track ${i + 1}.`);
        } else if (status === 501) {
          setError(`${SOURCE_LABEL[source]} not configured on the server.`);
        } else {
          setError(`${SOURCE_LABEL[source]} search failed on "${t.title}".`);
        }
        break;
      }
    }
    setProgress(null);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={tracks.length === 0 || !!progress}
        className="text-[11px] px-2 py-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 whitespace-nowrap"
      >
        Fetch all previews from… ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,.4)] py-1 min-w-[140px]">
          {(Object.keys(SOURCE_LABEL) as SourceKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => runFor(k)}
              className="block w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            >
              {SOURCE_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {progress && (
        <span className="absolute right-0 top-full mt-1 z-10 text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2 py-1 whitespace-nowrap max-w-[280px] truncate">
          Fetching {progress.i} of {progress.total} — {progress.label}
        </span>
      )}
      {error && !progress && (
        <span className="absolute right-0 top-full mt-1 z-10 text-[11px] text-[var(--danger)] bg-[var(--bg-surface)] border border-[var(--danger)] rounded-[6px] px-2 py-1 whitespace-nowrap max-w-[280px] truncate">
          {error}
        </span>
      )}
    </div>
  );
}

async function fetchOne(source: SourceKey, artist: string, title: string): Promise<Partial<Track['previews']> | null> {
  if (source === 'apple') {
    const res = await appleSearch({ artist, title });
    const first = res.results.find((r) => !!r.previewUrl) ?? res.results[0];
    if (!first?.previewUrl) return null;
    return { apple: first.previewUrl };
  }
  if (source === 'spotify') {
    const res = await spotifySearch({ artist, title });
    const first = res.results[0];
    if (!first) return null;
    return { spotify: { id: first.id, previewUrl: first.previewUrl ?? undefined } };
  }
  if (source === 'youtube') {
    const res = await youtubeSearch({ artist, title });
    const first = res.results[0];
    if (!first) return null;
    return { youtube: { id: first.id, title: first.title } };
  }
  return null;
}
