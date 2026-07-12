import { RecordFormat } from '@prisma/client';

export interface DiscogsArtist {
  name: string;
}

export interface DiscogsLabel {
  name?: string;
  catno?: string;
}

export interface DiscogsFormat {
  name?: string;
  qty?: string | number;
  descriptions?: string[];
}

export interface DiscogsTrack {
  position?: string;
  title?: string;
  duration?: string;
}

export interface DiscogsImage {
  type?: string;
  uri?: string;
  uri150?: string;
}

export interface DiscogsRelease {
  id: number | string;
  title?: string;
  year?: number;
  country?: string;
  artists?: DiscogsArtist[];
  labels?: DiscogsLabel[];
  formats?: DiscogsFormat[];
  tracklist?: DiscogsTrack[];
  images?: DiscogsImage[];
}

export interface DiscogsMappedTrack {
  position: string;
  title: string;
  duration?: string;
}

export interface DiscogsMappedImage {
  type: 'primary' | 'secondary';
  uri: string;
  uri150?: string;
}

export interface DiscogsMapped {
  discogsId: string;
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  year?: number;
  country?: string;
  format?: RecordFormat;
  weightGrams: number | null;
  dimensionsMm: null;
  tracks: DiscogsMappedTrack[];
  images: DiscogsMappedImage[];
}

/** Discogs disambiguates duplicate artist names as "Name (2)"; strip that. */
function cleanArtistName(name: string): string {
  return name.replace(/\s*\(\d+\)$/, '').trim();
}

function toQty(qty: string | number | undefined): number {
  if (qty == null) return 1;
  const n = typeof qty === 'number' ? qty : parseInt(qty, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function hasDescription(descriptions: string[] | undefined, needle: RegExp): boolean {
  return (descriptions ?? []).some((d) => needle.test(d));
}

function inferFormat(primary: DiscogsFormat | undefined): RecordFormat | undefined {
  if (!primary) return undefined;
  const name = (primary.name ?? '').toLowerCase();
  const qty = toQty(primary.qty);
  const descriptions = primary.descriptions ?? [];

  if (name === 'vinyl') {
    if (hasDescription(descriptions, /\b12"?\b|\b12\s*inch\b/i)) return RecordFormat.TWELVE_INCH;
    if (hasDescription(descriptions, /\b7"?\b|\b7\s*inch\b/i)) return RecordFormat.SEVEN_INCH;
    if (hasDescription(descriptions, /\blp\b|\balbum\b/i)) {
      if (qty >= 3) return RecordFormat.THREE_LP;
      if (qty === 2) return RecordFormat.TWO_LP;
      return RecordFormat.LP;
    }
    return undefined;
  }

  if (name === 'cd') {
    return qty >= 2 ? RecordFormat.TWO_CD : RecordFormat.CD;
  }

  if (name === 'cassette') {
    return RecordFormat.CASSETTE;
  }

  return undefined;
}

function extractWeightGrams(primary: DiscogsFormat | undefined): number | null {
  if (!primary) return null;
  const descriptions = primary.descriptions ?? [];
  for (const desc of descriptions) {
    const match = desc.match(/(\d{2,4})\s*Gram/i);
    if (match) {
      const grams = parseInt(match[1], 10);
      if (Number.isFinite(grams)) return grams * toQty(primary.qty);
    }
  }
  return null;
}

export function mapDiscogsRelease(release: DiscogsRelease): DiscogsMapped {
  const artist = (release.artists ?? [])
    .map((a) => a.name ?? '')
    .filter(Boolean)
    .map(cleanArtistName)
    .join(', ');

  const firstLabel = release.labels?.[0];
  const primaryFormat = release.formats?.[0];

  const tracks: DiscogsMappedTrack[] = (release.tracklist ?? []).map((t) => ({
    position: t.position ?? '',
    title: t.title ?? '',
    duration: t.duration ? t.duration : undefined,
  }));

  const images: DiscogsMappedImage[] = (release.images ?? [])
    .filter((i) => Boolean(i.uri))
    .map((i) => ({
      type: i.type === 'primary' ? 'primary' : 'secondary',
      uri: i.uri as string,
      uri150: i.uri150,
    }));

  return {
    discogsId: String(release.id),
    artist,
    title: release.title ?? '',
    label: firstLabel?.name,
    catNumber: firstLabel?.catno,
    year: release.year,
    country: release.country,
    format: inferFormat(primaryFormat),
    weightGrams: extractWeightGrams(primaryFormat),
    dimensionsMm: null,
    tracks,
    images,
  };
}
