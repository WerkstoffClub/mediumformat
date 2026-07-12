import { ReleaseCover } from '../../../components/ui/Cover';
import { BatchFetchMenu } from './BatchFetchMenu';
import { GetMediaButton } from './GetMediaButton';
import { PanelHeader } from './PanelHeader';
import { inputCls } from './shared';
import { TrackRow } from './TrackRow';
import type { SectionProps, Track } from './types';

export function Media({ value, onChange }: SectionProps) {
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

  const actions = (
    <GetMediaButton
      discogsId={value.discogsId}
      artist={value.artist}
      title={value.title}
      onApply={(patch) => onChange(patch)}
      onDiscogsResolved={(p) => onChange({ discogsId: p.discogsId })}
    />
  );

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
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]">
              Tracklist
            </p>
            <BatchFetchMenu
              tracks={tracks}
              artist={value.artist ?? ''}
              onChange={(nextTracks) => onChange({ tracks: nextTracks })}
            />
          </div>

          <div className="space-y-1.5">
            {tracks.map((track, i) => (
              <TrackRow
                key={i}
                index={i}
                track={track}
                artist={value.artist ?? ''}
                onChange={(patch) => patchTrack(i, patch)}
                onRemove={() => removeTrack(i)}
              />
            ))}
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
