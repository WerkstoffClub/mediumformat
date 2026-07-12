import { useState } from 'react';
import { discogsRehost } from '../../../api/integrations';
import { ModalShell } from './ModalShell';

interface DiscogsImage {
  type: 'primary' | 'secondary';
  uri: string;
  uri150?: string;
}

interface Props {
  images: DiscogsImage[];
  onApply: (patch: { imageUrl?: string; gallery?: string[] }) => void;
  onCancel: () => void;
}

/**
 * Pick a cover + gallery from the Discogs images. On apply, ask the server to
 * re-host the chosen images so the storefront doesn't hotlink Discogs (which
 * blocks external referrers).
 */
export function GetMediaModal({ images, onApply, onCancel }: Props) {
  const primaryIdx = images.findIndex((img) => img.type === 'primary');
  const [coverIdx, setCoverIdx] = useState<number>(primaryIdx >= 0 ? primaryIdx : 0);
  const [galleryIdx, setGalleryIdx] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGallery = (i: number) => {
    setGalleryIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const applyChoice = async () => {
    if (images.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const orderedGallery = Array.from(galleryIdx).sort((a, b) => a - b);
      const uris = [images[coverIdx].uri, ...orderedGallery.map((i) => images[i].uri)];
      const rehosted = await discogsRehost(uris);
      onApply({
        imageUrl: rehosted[0],
        gallery: rehosted.slice(1),
      });
    } catch (err: unknown) {
      const r = (err as { response?: { status?: number } })?.response;
      if (r?.status === 501) {
        setError('Rehost target not configured on the server — set the storage env vars and restart.');
      } else {
        setError('Rehost failed. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Get media from Discogs"
      subtitle={`${images.length} image${images.length === 1 ? '' : 's'} available`}
      onClose={onCancel}
      widthClass="max-w-[720px]"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-[9px] rounded-[6px] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyChoice}
            disabled={busy || images.length === 0}
            className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88] disabled:opacity-50"
          >
            {busy ? 'Rehosting…' : `Apply (${1 + galleryIdx.size})`}
          </button>
        </>
      }
    >
      <p className="text-[11.5px] text-[var(--text-muted)] mb-3">
        Pick one image as cover, add any to the gallery. Selected images are re-hosted on our
        storage on apply.
      </p>

      {images.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-secondary)]">
          Discogs returned no images for this release.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
          {images.map((img, i) => {
            const src = img.uri150 ?? img.uri;
            const isCover = coverIdx === i;
            const inGallery = galleryIdx.has(i);
            return (
              <div
                key={`${img.uri}-${i}`}
                className={`relative rounded-[8px] overflow-hidden border ${
                  isCover ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'
                }`}
              >
                <div className="aspect-square bg-[var(--bg-overlay)]">
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                {img.type === 'primary' && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 text-white uppercase tracking-[0.05em]">
                    Primary
                  </span>
                )}
                <div className="flex flex-col gap-1 px-2 py-2 bg-[var(--bg-surface)] text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="cover-select"
                      checked={isCover}
                      onChange={() => setCoverIdx(i)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[var(--text-secondary)]">Cover</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inGallery}
                      onChange={() => toggleGallery(i)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[var(--text-secondary)]">Gallery</span>
                  </label>
                </div>
              </div>
            );
          })}
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
