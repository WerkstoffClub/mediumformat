import type { ReactNode } from 'react';
import { ReleaseCover } from '../../../components/ui/Cover';
import { PanelHeader } from './PanelHeader';
import { inputCls } from './shared';
import type { SectionProps, Track } from './types';

interface Props extends SectionProps {
  actions?: ReactNode;
  /** Optional slot rendered above the tracklist (batch-fetch menu, etc.). */
  aboveTracks?: ReactNode;
  /** Rendered per track; when omitted, a simple built-in row is used. */
  renderTrack?: (track: Track, index: number, patch: (p: Partial<Track>) => void, remove: () => void) => ReactNode;
}

export function Media({ value, onChange, actions, aboveTracks, renderTrack }: Props) {
  const tracks: Track[] = value.tracks ?? [];
  const gallery: string[] = value.gallery ?? [];

  const patchTrack = (i: number, patch: Partial<Track>) =>
    onChange({ tracks: tracks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const removeTrack = (i: number) =>
    onChange({ tracks: tracks.filter((_, j) => j !== i) });

  const addTrack = () =>
    onChange({ tracks: [...tracks, { position: `${tracks.length + 1}`, title: '' }] });

  const removeGalleryItem = (i: number) =>
    onChange({ gallery: gallery.filter((_, j) => j !== i) });

  return (
    <PanelHeader number={6} title="Media" actions={actions}>
      <div className="grid grid-cols-[128px_1fr] gap-4 max-md:grid-cols-1">
        <div>
          <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5">
            Cover art
          </p>
          <span className="w-[128px] h-[128px] rounded-[8px] block overflow-hidden border border-[var(--border)]">
            <ReleaseCover imageUrl={value.imageUrl} format={value.format} alt="Cover preview" />
          </span>
          <input
            className={`${inputCls} font-mono text-[10.5px] mt-2`}
            value={value.imageUrl ?? ''}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            placeholder="https://…"
            aria-label="Cover art URL"
          />
          <p className="text-[10px] text-[var(--text-faint)] mt-1.5">
            JPG / PNG · square · ≥ 1000px
          </p>

          {gallery.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.04em] text-[var(--text-muted)] mb-1.5">
                Gallery
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {gallery.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative rounded-[5px] overflow-hidden border border-[var(--border)] aspect-square group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(i)}
                      aria-label="Remove gallery image"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5">
            Tracklist
          </p>
          {aboveTracks && <div className="mb-2">{aboveTracks}</div>}

          <div className="space-y-1.5">
            {tracks.map((track, i) =>
              renderTrack ? (
                <div key={i}>
                  {renderTrack(track, i, (p) => patchTrack(i, p), () => removeTrack(i))}
                </div>
              ) : (
                <SimpleTrackEditor
                  key={i}
                  track={track}
                  index={i}
                  onChange={(p) => patchTrack(i, p)}
                  onRemove={() => removeTrack(i)}
                />
              ),
            )}
          </div>

          <button
            type="button"
            onClick={addTrack}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add track
          </button>
        </div>
      </div>
    </PanelHeader>
  );
}

/** Minimal inline track row used when the parent doesn't inject the full TrackRow. */
function SimpleTrackEditor({
  track,
  index,
  onChange,
  onRemove,
}: {
  track: Track;
  index: number;
  onChange: (patch: Partial<Track>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-[var(--border)] rounded-[6px] flex items-center gap-2 p-1.5">
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
        onClick={onRemove}
        aria-label="Remove track"
        className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] flex-shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
