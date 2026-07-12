import { useState } from 'react';
import { discogsLookup, type DiscogsMapped } from '../../../api/integrations';
import { ApplyFromDiscogsModal } from './ApplyFromDiscogsModal';
import { DiscogsLookupPopover } from './DiscogsLookupPopover';
import type { ReleaseFormState } from './types';

interface Props {
  discogsId?: string | null;
  artist?: string;
  title?: string;
  onApply: (patch: Partial<ReleaseFormState>) => void;
}

/**
 * "Get details" button — the entry point for the Discogs metadata flow.
 * If we already know the Discogs ID, jumps straight to fetch. Otherwise the
 * lookup popover lets the operator paste an ID or search by artist+title.
 */
export function GetDetailsButton({ discogsId, artist, title, onApply }: Props) {
  const [payload, setPayload] = useState<DiscogsMapped | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    if (discogsId) {
      setBusy(true);
      try {
        const res = await discogsLookup({ discogsId });
        if ('results' in res) {
          setShowLookup(true); // ID search fell through — let user pick
        } else {
          setPayload(res);
        }
      } catch (err: unknown) {
        const r = (err as { response?: { status?: number } })?.response;
        if (r?.status === 501) {
          setError('Discogs integration not configured on the server.');
        } else {
          setError('Discogs lookup failed.');
        }
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
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 010 18M3 12h18" />
        </svg>
        {busy ? 'Fetching…' : 'Get details'}
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
            setPayload(p);
          }}
          onClose={() => setShowLookup(false)}
        />
      )}

      {payload && (
        <ApplyFromDiscogsModal
          payload={payload}
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
