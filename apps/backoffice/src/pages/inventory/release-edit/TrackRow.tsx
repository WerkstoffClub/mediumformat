import { useRef, useState } from 'react';
import { PreviewSourcePopover } from './PreviewSourcePopover';
import type { Track } from './types';

interface Props {
  track: Track;
  artist: string;
  onChange: (patch: Partial<Track>) => void;
  onRemove: () => void;
  index: number;
}

type SourceKey = 'apple' | 'bandcamp' | 'soundcloud' | 'upload';

const SOURCE_ORDER: SourceKey[] = ['apple', 'upload', 'bandcamp', 'soundcloud'];

const SOURCE_TITLE: Record<SourceKey, string> = {
  apple: 'Apple Music',
  bandcamp: 'Bandcamp',
  soundcloud: 'SoundCloud',
  upload: 'Uploaded audio',
};

function hasSource(previews: Track['previews'] | undefined, key: SourceKey): boolean {
  if (!previews) return false;
  switch (key) {
    case 'apple': return !!previews.apple;
    case 'bandcamp': return !!previews.bandcamp;
    case 'soundcloud': return !!previews.soundcloud;
    case 'upload': return !!previews.upload;
  }
}

/**
 * Pick the best playable preview. Direct-audio URLs (apple/upload) play inline
 * via an <audio> element; embed-based sources (bandcamp/soundcloud) get opened
 * in a new tab so the operator can preview off-page.
 */
function pickPlayable(previews: Track['previews'] | undefined):
  | { kind: 'audio'; url: string; label: string }
  | { kind: 'embed'; url: string; label: string }
  | null {
  if (!previews) return null;
  if (previews.apple) return { kind: 'audio', url: previews.apple, label: 'Apple Music' };
  if (previews.upload) return { kind: 'audio', url: previews.upload, label: 'Uploaded' };
  if (previews.bandcamp) return { kind: 'embed', url: previews.bandcamp, label: 'Bandcamp' };
  if (previews.soundcloud) return { kind: 'embed', url: previews.soundcloud, label: 'SoundCloud' };
  return null;
}

export function TrackRow({ track, artist, onChange, onRemove, index }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playable = pickPlayable(track.previews);

  const play = () => {
    if (!playable) return;
    if (playable.kind === 'embed') {
      window.open(playable.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
    const el = new Audio(playable.url);
    audioRef.current = el;
    el.onended = () => {
      setPlaying(false);
      audioRef.current = null;
    };
    el.onerror = () => {
      setPlaying(false);
      audioRef.current = null;
    };
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  };

  return (
    <div className="border border-[var(--border)] rounded-[6px] flex items-center gap-2 p-1.5">
      <span
        className="w-4 text-[var(--text-faint)] cursor-grab flex-shrink-0 select-none text-center"
        aria-hidden="true"
        title="Reorder (drag not wired yet)"
      >
        ⋮⋮
      </span>
      <input
        className="w-11 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-1.5 py-[7px] text-[11px] font-mono text-center text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
        value={track.position ?? ''}
        onChange={(e) => onChange({ position: e.target.value })}
        placeholder={`${index + 1}`}
        aria-label="Track number"
      />
      <input
        className="flex-1 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-2.5 py-[7px] text-[12.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        value={track.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Track title"
        aria-label="Track title"
      />
      <input
        className="w-[64px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-1.5 py-[7px] text-[11px] font-mono text-center text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
        value={track.duration ?? ''}
        onChange={(e) => onChange({ duration: e.target.value })}
        placeholder="0:00"
        aria-label="Duration"
      />

      <button
        type="button"
        onClick={playing ? stop : play}
        disabled={!playable}
        title={playable ? `Play (${playable.label})` : 'No preview available'}
        aria-label="Play preview"
        className={`w-8 h-8 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors ${
          playable ? 'text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]' : 'text-[var(--text-faint)] cursor-not-allowed'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
          {playing ? (
            <>
              <rect x="7" y="6" width="3" height="12" fill="currentColor" />
              <rect x="14" y="6" width="3" height="12" fill="currentColor" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="9" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
            </>
          )}
        </svg>
      </button>

      <span className="flex items-center gap-0.5 flex-shrink-0" role="list" aria-label="Preview sources">
        {SOURCE_ORDER.map((key) => {
          const on = hasSource(track.previews, key);
          return (
            <span
              key={key}
              role="listitem"
              title={`${SOURCE_TITLE[key]}: ${on ? 'linked' : 'missing'}`}
              className={`w-1.5 h-1.5 rounded-full ${
                on ? 'bg-[var(--text-primary)]' : 'border border-[var(--border)]'
              }`}
            />
          );
        })}
      </span>

      <button
        type="button"
        onClick={() => setPopoverOpen(true)}
        className="text-[11px] px-2 py-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex-shrink-0 whitespace-nowrap"
      >
        Preview source ▾
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove track"
        className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] flex-shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {popoverOpen && (
        <PreviewSourcePopover
          track={track}
          artist={artist}
          onChange={onChange}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </div>
  );
}
