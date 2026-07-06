// Enrich a cached Release with metadata, artwork, and tracklist from Discogs.
//
// Lookup order: by discogsId if present, else by extBarcode (barcode search →
// first hit). Release fields are refreshed; the tracklist is upserted by
// position so manually-locked track previews are never clobbered.
//
// Relative imports (not "@/…") so this loads under both Next and the tsx
// worker, which does not resolve tsconfig path aliases.

import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { discogs } from "../integrations/discogs/client";
import { logger } from "../logger";

const log = logger.child({ component: "catalog-enrich" });

type DiscogsImage = { type?: string; uri?: string; uri150?: string };
type DiscogsIdentifier = { type?: string; value?: string };
type DiscogsTrack = { position?: string; title?: string; duration?: string; type_?: string };
type DiscogsRelease = {
  id: number;
  title: string;
  year?: number;
  country?: string;
  artists?: { name: string }[];
  labels?: { name: string; catno?: string }[];
  genres?: string[];
  styles?: string[];
  formats?: unknown[];
  images?: DiscogsImage[];
  identifiers?: DiscogsIdentifier[];
  tracklist?: DiscogsTrack[];
};

export type EnrichResult = "updated" | "skipped" | "not-found";

// "3:47" | "1:02:15" → seconds
function parseDurationSec(d?: string): number | null {
  if (!d) return null;
  const parts = d.split(":").map((p) => parseInt(p, 10));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function pickCover(images?: DiscogsImage[]): string | null {
  if (!images?.length) return null;
  const primary = images.find((i) => i.type === "primary") ?? images[0];
  return primary?.uri ?? primary?.uri150 ?? null;
}

function pickBarcode(ids?: DiscogsIdentifier[]): string | null {
  const bc = ids?.find((i) => (i.type ?? "").toLowerCase() === "barcode");
  return bc?.value ? bc.value.replace(/\s+/g, "") : null;
}

async function fetchDiscogsRelease(
  release: { discogsId: number | null; extBarcode: string | null },
): Promise<DiscogsRelease | null> {
  if (release.discogsId) {
    return (await discogs.getRelease(release.discogsId)) as DiscogsRelease;
  }
  if (release.extBarcode) {
    const search = (await discogs.searchByBarcode(release.extBarcode)) as {
      results?: { id: number }[];
    };
    const first = search.results?.[0];
    if (first?.id) return (await discogs.getRelease(first.id)) as DiscogsRelease;
  }
  return null;
}

export async function enrichReleaseFromDiscogs(
  releaseId: string,
): Promise<EnrichResult> {
  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release) return "not-found";
  // Nothing to look up against.
  if (!release.discogsId && !release.extBarcode) return "skipped";

  const data = await fetchDiscogsRelease(release);
  if (!data) return "skipped";

  await prisma.release.update({
    where: { id: releaseId },
    data: {
      discogsId: release.discogsId ?? data.id,
      title: data.title ?? release.title,
      artistsJson: (data.artists ?? []).map((a) => ({ name: a.name })),
      labelsJson: (data.labels ?? []).map((l) => ({
        name: l.name,
        catno: l.catno ?? null,
      })),
      year: data.year ?? release.year,
      country: data.country ?? release.country,
      genres: data.genres ?? [],
      styles: data.styles ?? [],
      formatsJson: (data.formats ?? []) as Prisma.InputJsonValue,
      catno: data.labels?.[0]?.catno ?? release.catno,
      extBarcode: pickBarcode(data.identifiers) ?? release.extBarcode,
      coverUrl: pickCover(data.images) ?? release.coverUrl,
      rawJson: data as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });

  // Upsert tracks by (releaseId, position). Preserve any resolved/locked
  // previews on existing rows; only refresh title, duration, and order.
  const tracklist = (data.tracklist ?? []).filter((t) => t.position && t.title);
  let sortOrder = 0;
  for (const t of tracklist) {
    sortOrder += 1;
    const existing = await prisma.track.findFirst({
      where: { releaseId, position: t.position! },
    });
    if (existing) {
      await prisma.track.update({
        where: { id: existing.id },
        data: {
          title: t.title!,
          durationSec: parseDurationSec(t.duration) ?? existing.durationSec,
          sortOrder,
        },
      });
    } else {
      await prisma.track.create({
        data: {
          releaseId,
          position: t.position!,
          title: t.title!,
          durationSec: parseDurationSec(t.duration),
          sortOrder,
        },
      });
    }
  }

  log.info({ releaseId, tracks: tracklist.length }, "release enriched");
  return "updated";
}
