// Bandcamp has no public search API. We accept a per-release Bandcamp URL
// (admin pastes it) and embed Bandcamp's official player widget.
//
// Embed URL pattern:
//   https://bandcamp.com/EmbeddedPlayer/album=<ALBUM_ID>/size=small/...
// We resolve album_id by fetching the page HTML and extracting the
// `<meta name="bc-page-properties">` JSON.

export async function resolveBandcampAlbumId(
  pageUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/bc-page-properties[^>]*content="([^"]+)"/);
    if (!m) return null;
    const json = JSON.parse(m[1].replace(/&quot;/g, '"'));
    const id = json?.item_id ?? json?.tralbum_id ?? null;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

export function bandcampEmbedUrl(albumId: string, trackNum?: number): string {
  const t = trackNum ? `/t=${trackNum}` : "";
  return `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=small/bgcol=ffffff/linkcol=0687f5${t}/transparent=true/`;
}
