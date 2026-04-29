// Apple iTunes Search API. Free, no auth.
// Returns 30s preview clips for matched songs.
// Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

interface ITunesResult {
  trackName: string;
  artistName: string;
  collectionName: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackId: number;
}

interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesResult[];
}

export interface PreviewMatch {
  source: "APPLE";
  previewUrl: string;
  externalId: string;
  trackTitle: string;
  artist: string;
  durationMs?: number;
}

export async function searchAppleMusic(
  artist: string,
  title: string,
): Promise<ITunesSearchResponse> {
  const term = `${artist} ${title}`.replace(/\s+/g, "+");
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  return res.json();
}

// Pick the best result by fuzzy title match + duration proximity.
export function pickBestMatch(
  candidates: ITunesResult[],
  expectedTitle: string,
  expectedDurationSec?: number,
): PreviewMatch | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(expectedTitle);

  const scored = candidates
    .filter((c) => c.previewUrl)
    .map((c) => {
      const titleScore = norm(c.trackName).includes(target) ? 1 : 0;
      const dur = (c.trackTimeMillis ?? 0) / 1000;
      const durDelta = expectedDurationSec
        ? Math.abs(dur - expectedDurationSec)
        : 0;
      const durScore = expectedDurationSec ? Math.max(0, 1 - durDelta / 10) : 0.5;
      return { c, score: titleScore * 2 + durScore };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 1) return null;
  return {
    source: "APPLE",
    previewUrl: top.c.previewUrl!,
    externalId: String(top.c.trackId),
    trackTitle: top.c.trackName,
    artist: top.c.artistName,
    durationMs: top.c.trackTimeMillis,
  };
}
