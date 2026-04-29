// Track preview resolver. Tries Apple Music → Bandcamp embed → YouTube.
// Manual entries (previewLocked = true) are never overwritten.

import { prisma } from "../../lib/db";
import { logger } from "../../lib/logger";
import {
  searchAppleMusic,
  pickBestMatch,
} from "../../lib/integrations/itunes/client";
import {
  resolveBandcampAlbumId,
  bandcampEmbedUrl,
} from "../../lib/integrations/bandcamp/embed";
import { searchYouTube } from "../../lib/integrations/youtube/client";

const log = logger.child({ component: "resolve-tracks" });

export async function resolveTracksForRelease(releaseId: string) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { tracks: true },
  });
  if (!release) return;

  const artistsArr = (release.artistsJson as { name: string }[] | null) ?? [];
  const primaryArtist = artistsArr[0]?.name ?? "";

  // Resolve Bandcamp album once if URL is set.
  let bandcampAlbumId: string | null = null;
  if (release.bandcampUrl) {
    bandcampAlbumId = await resolveBandcampAlbumId(release.bandcampUrl);
  }

  for (const track of release.tracks) {
    if (track.previewLocked) continue;
    if (track.previewUrl && track.previewSource && track.previewSource !== "NONE") {
      continue;
    }

    try {
      // 1. Apple Music
      const apple = await searchAppleMusic(primaryArtist, track.title);
      const match = pickBestMatch(
        apple.results,
        track.title,
        track.durationSec ?? undefined,
      );
      if (match) {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            previewSource: "APPLE",
            previewUrl: match.previewUrl,
            previewExternalId: match.externalId,
            lastResolvedAt: new Date(),
          },
        });
        continue;
      }

      // 2. Bandcamp embed (release-level)
      if (bandcampAlbumId) {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            previewSource: "BANDCAMP",
            previewUrl: bandcampEmbedUrl(bandcampAlbumId),
            previewExternalId: bandcampAlbumId,
            lastResolvedAt: new Date(),
          },
        });
        continue;
      }

      // 3. YouTube
      const yt = await searchYouTube(primaryArtist, track.title);
      if (yt) {
        await prisma.track.update({
          where: { id: track.id },
          data: {
            previewSource: "YOUTUBE",
            previewUrl: `https://www.youtube.com/embed/${yt.videoId}`,
            previewExternalId: yt.videoId,
            lastResolvedAt: new Date(),
          },
        });
        continue;
      }

      await prisma.track.update({
        where: { id: track.id },
        data: { previewSource: "NONE", lastResolvedAt: new Date() },
      });
    } catch (err) {
      log.error(
        { trackId: track.id, err: (err as Error).message },
        "resolve failed",
      );
    }
  }
}
