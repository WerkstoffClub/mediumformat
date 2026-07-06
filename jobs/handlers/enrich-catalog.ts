// Batch catalog enrichment. For every release that carries a Discogs id or a
// barcode, pull metadata/artwork/tracklist from Discogs, then resolve track
// media (Apple Music first, Bandcamp/YouTube fallback) for anything updated.
//
// Enqueued from the Inventory backoffice; consumed by the discogs-sync worker.

import { prisma } from "../../lib/db";
import { logger } from "../../lib/logger";
import { enrichReleaseFromDiscogs } from "../../lib/catalog/enrich";
import { resolveTracksForRelease } from "./resolve-tracks";

const log = logger.child({ component: "enrich-catalog" });

export interface EnrichCatalogData {
  // Optional subset. Omit to enrich the whole catalog.
  releaseIds?: string[];
}

export async function enrichCatalog(data: EnrichCatalogData = {}) {
  const releases = await prisma.release.findMany({
    where: {
      ...(data.releaseIds?.length ? { id: { in: data.releaseIds } } : {}),
      OR: [{ discogsId: { not: null } }, { extBarcode: { not: null } }],
    },
    select: { id: true },
  });

  log.info({ count: releases.length }, "enrich-catalog start");
  let updated = 0;
  for (const r of releases) {
    try {
      const result = await enrichReleaseFromDiscogs(r.id);
      if (result === "updated") {
        updated += 1;
        // Apple Music (then Bandcamp/YouTube) for track previews / media.
        await resolveTracksForRelease(r.id);
      }
    } catch (err) {
      log.error(
        { releaseId: r.id, err: (err as Error).message },
        "enrich failed",
      );
    }
  }
  log.info({ updated, total: releases.length }, "enrich-catalog done");
  return { updated, total: releases.length };
}
