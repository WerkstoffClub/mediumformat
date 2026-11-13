import type { Release, ReleaseTrack } from '../api/storefront';

/**
 * Playable preview URL for a track, whatever shape the back-office stored:
 * - current: `previews: { apple, upload, bandcamp, soundcloud }` (object map)
 * - array:   `previews: [{ url }]`
 * - legacy:  `previewUrl` + `previewSource`
 * Only direct audio files play in <audio>; Bandcamp/SoundCloud links are pages.
 */
export function trackPreviewUrl(track: ReleaseTrack | null | undefined): string | null {
  if (!track) return null;
  const p = track.previews as unknown;
  const ok = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\/|^\//.test(u);

  if (Array.isArray(p)) {
    const hit = p.find(x => ok((x as { url?: unknown })?.url)) as { url: string } | undefined;
    if (hit) return hit.url;
  } else if (p && typeof p === 'object') {
    const map = p as Record<string, unknown>;
    for (const key of ['apple', 'upload']) if (ok(map[key])) return map[key] as string;
  }

  const legacy = track as ReleaseTrack & { previewUrl?: unknown; previewSource?: unknown };
  const source = String(legacy.previewSource ?? '').toLowerCase();
  if (ok(legacy.previewUrl) && !/bandcamp|soundcloud/.test(source)) return legacy.previewUrl;
  return null;
}

export interface PlayableTrack {
  release: Release;
  title: string;
  url: string;
}

/** Every playable track across releases, featured releases first. */
export function playableTracks(releases: Release[]): PlayableTrack[] {
  const ordered = [...releases].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  return ordered.flatMap(release =>
    (release.tracks ?? []).flatMap(t => {
      const url = trackPreviewUrl(t);
      return url ? [{ release, title: t.title, url }] : [];
    }),
  );
}
