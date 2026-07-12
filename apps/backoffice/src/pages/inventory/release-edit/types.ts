import type { Release } from '@mf/shared';

/**
 * Per-track preview shape (the new convention introduced with the Get media flow).
 * A track may have zero or more populated sources; the play button picks the best.
 */
export interface TrackPreviews {
  apple?: string; // 30s preview URL
  bandcamp?: string; // track URL
  soundcloud?: string; // track URL
  upload?: string; // our storage URL
}

export interface Track {
  position: string;
  title: string;
  duration?: string;
  previews?: TrackPreviews;
}

export interface SizeRow {
  size: string;
  chest?: string;
  length?: string;
}

/**
 * The form's internal shape. `Release.tracks` on the shared type uses the legacy
 * `{ no, previewUrl, previewSource }` shape — we normalise to `Track` on load and
 * write back a compatible shape on save.
 *
 * `gallery` lives on the Prisma schema but isn't in the shared type yet; it's
 * carried through here and persisted via the DTO (see backend addition).
 *
 * `weightGrams` and `dimensionsMm` are UI-only for now — the Release model does
 * not have columns for them yet, so they are ephemeral.
 */
export interface ReleaseFormState
  extends Omit<Partial<Release>, 'tracks' | 'sizing' | 'channelListings'> {
  tracks?: Track[];
  sizing?: SizeRow[];
  channelListings?: string[];
  gallery?: string[];
  weightGrams?: number | null;
  dimensionsMm?: { l?: string; w?: string; h?: string } | null;
}

export type PatchFn = (patch: Partial<ReleaseFormState>) => void;

export interface SectionProps {
  value: ReleaseFormState;
  onChange: PatchFn;
}
