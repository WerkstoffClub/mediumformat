import { type ReactNode, useState } from 'react';
import {
  appleSearch,
  bandcampSearch,
  uploadAudio,
  type AppleTrack,
} from '../../../api/integrations';
import { ModalShell } from './ModalShell';
import { inputCls } from './shared';
import type { Track } from './types';

type SourceKey = 'apple' | 'bandcamp' | 'soundcloud' | 'upload';
type SubMode = 'fetch' | 'paste';

const SOURCE_LABEL: Record<SourceKey, string> = {
  apple: 'Apple',
  bandcamp: 'Bandcamp',
  soundcloud: 'SoundCloud',
  upload: 'Upload',
};

interface Props {
  track: Track;
  artist: string;
  onChange: (patch: Partial<Track>) => void;
  onClose: () => void;
}

const NOT_CONFIGURED_MSG =
  'Not configured on the server — set the env variable and restart.';

function withPreview(track: Track, patch: Partial<Track['previews']>): Partial<Track> {
  return { previews: { ...(track.previews ?? {}), ...patch } };
}

export function PreviewSourcePopover({ track, artist, onChange, onClose }: Props) {
  const [tab, setTab] = useState<SourceKey>('apple');
  const [mode, setMode] = useState<SubMode>('fetch');

  return (
    <ModalShell
      title="Preview source"
      subtitle={track.title || 'Untitled track'}
      onClose={onClose}
      widthClass="max-w-[640px]"
    >
      <div className="flex flex-wrap gap-1 mb-3 border-b border-[var(--border-sub)] pb-2">
        {(Object.keys(SOURCE_LABEL) as SourceKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setMode(k === 'upload' ? 'fetch' : 'fetch');
            }}
            className={`text-[12px] px-2.5 py-1 rounded-[5px] border transition-colors ${
              tab === k
                ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-overlay)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {SOURCE_LABEL[k]}
          </button>
        ))}
      </div>

      {tab !== 'upload' && tab !== 'soundcloud' && (
        <div className="flex gap-1.5 mb-3">
          {(['fetch', 'paste'] as SubMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                mode === m
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
              }`}
            >
              {m === 'fetch' ? 'Fetch' : 'Paste link'}
            </button>
          ))}
        </div>
      )}

      {tab === 'apple' && (
        <AppleTab
          mode={mode}
          artist={artist}
          title={track.title}
          onPick={(url) => {
            onChange(withPreview(track, { apple: url }));
            onClose();
          }}
        />
      )}
      {tab === 'bandcamp' && (
        <BandcampTab
          mode={mode}
          artist={artist}
          title={track.title}
          onPick={(url) => {
            onChange(withPreview(track, { bandcamp: url }));
            onClose();
          }}
        />
      )}
      {tab === 'soundcloud' && (
        <SoundcloudTab
          onPick={(url) => {
            onChange(withPreview(track, { soundcloud: url }));
            onClose();
          }}
        />
      )}
      {tab === 'upload' && (
        <UploadTab
          onPick={(url) => {
            onChange(withPreview(track, { upload: url }));
            onClose();
          }}
        />
      )}
    </ModalShell>
  );
}

function TabError({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11.5px] text-[var(--text-muted)] mt-2 italic">{children}</p>
  );
}

function ResultRow({
  onClick,
  disabled,
  thumb,
  primary,
  secondary,
  tail,
}: {
  onClick: () => void;
  disabled?: boolean;
  thumb?: string;
  primary: string;
  secondary?: string;
  tail?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left flex items-center gap-3 p-2 rounded-[6px] hover:bg-[var(--bg-overlay)] border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-10 h-10 rounded-[4px] object-cover flex-shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] flex-shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-[var(--text-primary)] truncate">{primary}</span>
        {secondary && (
          <span className="block text-[11px] text-[var(--text-muted)] truncate">{secondary}</span>
        )}
      </span>
      {tail && (
        <span className="font-mono text-[10px] text-[var(--text-muted)]">{tail}</span>
      )}
    </button>
  );
}

/* ---------- Per-source tab bodies ---------- */

function AppleTab({
  mode,
  artist,
  title,
  onPick,
}: {
  mode: SubMode;
  artist: string;
  title: string;
  onPick: (url: string) => void;
}) {
  const [results, setResults] = useState<AppleTrack[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fetch = async () => {
    setBusy(true);
    setNotConfigured(false);
    try {
      const res = await appleSearch({ artist, title });
      setResults(res.results);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 501) setNotConfigured(true);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'paste') {
    return (
      <div>
        <input
          className={inputCls}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="https://music.apple.com/…"
        />
        {pasteError && <TabError>{pasteError}</TabError>}
        <button
          type="button"
          onClick={() => {
            if (!/apple\.com|itunes\.apple\.com/.test(pasted)) {
              setPasteError('Expected an apple.com URL.');
              return;
            }
            onPick(pasted.trim());
          }}
          disabled={!pasted.trim()}
          className="mt-2 px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
        >
          Save link
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={fetch}
        disabled={busy || !title.trim()}
        className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
      >
        {busy ? 'Searching…' : 'Search Apple Music'}
      </button>
      {notConfigured && <TabError>{NOT_CONFIGURED_MSG}</TabError>}
      {results && results.length === 0 && <TabError>No matches.</TabError>}
      {results && results.length > 0 && (
        <ul className="mt-3 space-y-1">
          {results.slice(0, 8).map((r, i) => (
            <li key={`${r.trackName}-${i}`}>
              <ResultRow
                onClick={() => r.previewUrl && onPick(r.previewUrl)}
                disabled={!r.previewUrl}
                thumb={r.artworkUrl100}
                primary={r.trackName}
                secondary={`${r.artistName}${r.collectionName ? ` · ${r.collectionName}` : ''}`}
                tail={r.previewUrl ? '30s' : 'no preview'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BandcampTab({
  mode,
  artist,
  title,
  onPick,
}: {
  mode: SubMode;
  artist: string;
  title: string;
  onPick: (url: string) => void;
}) {
  const [state, setState] = useState<{ searchUrl?: string; guessed?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fetch = async () => {
    setBusy(true);
    setNotConfigured(false);
    try {
      const res = await bandcampSearch({ artist, title });
      setState({ searchUrl: res.searchUrl, guessed: res.guessedTrackUrl });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 501) setNotConfigured(true);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'paste') {
    return (
      <div>
        <input
          className={inputCls}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="https://artist.bandcamp.com/track/…"
        />
        {pasteError && <TabError>{pasteError}</TabError>}
        <button
          type="button"
          onClick={() => {
            if (!/bandcamp\.com/.test(pasted)) {
              setPasteError('Expected a bandcamp.com URL.');
              return;
            }
            onPick(pasted.trim());
          }}
          disabled={!pasted.trim()}
          className="mt-2 px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
        >
          Save link
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={fetch}
        disabled={busy || !title.trim()}
        className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
      >
        {busy ? 'Searching…' : 'Search Bandcamp'}
      </button>
      {notConfigured && <TabError>{NOT_CONFIGURED_MSG}</TabError>}
      {state && (
        <div className="mt-3 space-y-2">
          {state.guessed && (
            <div className="p-2 rounded-[6px] border border-[var(--border)] flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--text-secondary)] flex-1 truncate font-mono">
                {state.guessed}
              </span>
              <button
                type="button"
                onClick={() => state.guessed && onPick(state.guessed)}
                className="px-2.5 py-1 rounded-[5px] bg-[var(--accent)] text-[var(--accent-text)] text-[11.5px] font-semibold hover:opacity-[.88]"
              >
                Use guessed
              </button>
            </div>
          )}
          {state.searchUrl && (
            <a
              href={state.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
            >
              Open Bandcamp search ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SoundcloudTab({ onPick }: { onPick: (url: string) => void }) {
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  return (
    <div>
      <p className="text-[11.5px] text-[var(--text-muted)] mb-2">
        No auto-search — paste a SoundCloud link.
      </p>
      <input
        className={inputCls}
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="https://soundcloud.com/…"
      />
      {pasteError && <TabError>{pasteError}</TabError>}
      <button
        type="button"
        onClick={() => {
          if (!/soundcloud\.com/.test(pasted)) {
            setPasteError('Expected a soundcloud.com URL.');
            return;
          }
          onPick(pasted.trim());
        }}
        disabled={!pasted.trim()}
        className="mt-2 px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
      >
        Save link
      </button>
    </div>
  );
}

function UploadTab({ onPick }: { onPick: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadAudio(file);
      onPick(res.url);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 501 ? NOT_CONFIGURED_MSG : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block border-2 border-dashed border-[var(--border)] rounded-[8px] p-6 text-center cursor-pointer hover:border-[var(--text-muted)]">
        <input
          type="file"
          accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="sr-only"
          disabled={busy}
        />
        <p className="text-[12.5px] text-[var(--text-secondary)]">
          {busy ? 'Uploading…' : 'Click to choose an MP3 or M4A file'}
        </p>
        <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">Max ~30s preview clip.</p>
      </label>
      {error && <TabError>{error}</TabError>}
    </div>
  );
}
