import { useState } from 'react';
import { discogsLookup, type DiscogsMapped } from '../../../api/integrations';
import { DiscogsLookupPopover } from './DiscogsLookupPopover';
import { GetMediaModal } from './GetMediaModal';

interface Props {
  discogsId?: string | null;
  artist?: string;
  title?: string;
  onApply: (patch: { imageUrl?: string; gallery?: string[] }) => void;
  /** Called when a Discogs payload is resolved during this flow — the parent
      may want to stamp `discogsId` so future lookups skip the popover. */
  onDiscogsResolved?: (payload: DiscogsMapped) => void;
}

export function GetMediaButton({
  discogsId,
  artist,
  title,
  onApply,
  onDiscogsResolved,
}: Props) {
  const [payload, setPayload] = useState<DiscogsMapped | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePayload = (p: DiscogsMapped) => {
    onDiscogsResolved?.(p);
    setPayload(p);
  };

  const start = async () => {
    setError(null);
    if (discogsId) {
      setBusy(true);
      try {
        const res = await discogsLookup({ discogsId });
        if ('results' in res) setShowLookup(true);
        else resolvePayload(res);
      } catch (err: unknown) {
        const r = (err as { response?: { status?: number } })?.response;
        setError(r?.status === 501 ? 'Discogs integration not configured on the server.' : 'Discogs lookup failed.');
      } finally {
        setBusy(false);
      }
    } else {
      setShowLookup(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--accent-text)] bg-[var(--accent-text)]/10 text-[var(--accent-text)] hover:bg-[var(--accent-text)]/20 disabled:opacity-50 text-[11px] px-2 py-1"
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5-9 9" />
        </svg>
        {busy ? 'Fetching…' : 'Get media'}
      </button>

      {error && (
        <span className="text-[10px] text-[var(--danger)] ml-2">{error}</span>
      )}

      {showLookup && (
        <DiscogsLookupPopover
          seedArtist={artist}
          seedTitle={title}
          onResolved={(p) => {
            setShowLookup(false);
            resolvePayload(p);
          }}
          onClose={() => setShowLookup(false)}
        />
      )}

      {payload && (
        <GetMediaModal
          images={payload.images}
          onApply={(patch) => {
            onApply(patch);
            setPayload(null);
          }}
          onCancel={() => setPayload(null)}
        />
      )}
    </>
  );
}
