// YouTube Data API v3 search (for track preview fallback).
// Docs: https://developers.google.com/youtube/v3/docs/search/list

const BASE = "https://www.googleapis.com/youtube/v3";

interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
  };
}

export interface YouTubeMatch {
  source: "YOUTUBE";
  videoId: string;
  title: string;
  channel: string;
}

export async function searchYouTube(
  artist: string,
  title: string,
): Promise<YouTubeMatch | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const q = encodeURIComponent(`${artist} ${title}`);
  const url = `${BASE}/search?part=snippet&type=video&maxResults=5&q=${q}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: YTSearchItem[] };
  const item = data.items?.[0];
  if (!item) return null;
  return {
    source: "YOUTUBE",
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
  };
}
