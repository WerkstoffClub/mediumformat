import { api } from './client';

export interface DiscogsMapped {
  discogsId: string;
  artist: string;
  title: string;
  label?: string;
  catNumber?: string;
  year?: number;
  country?: string;
  format?: string;
  weightGrams: number | null;
  dimensionsMm: null;
  tracks: { position: string; title: string; duration?: string }[];
  images: { type: 'primary' | 'secondary'; uri: string; uri150?: string }[];
}

export interface DiscogsSearchResult {
  id: string;
  title: string;
  year?: number;
  format?: string[];
  thumb?: string;
  country?: string;
}

export const discogsLookup = (body: { discogsId?: string; artist?: string; title?: string }) =>
  api
    .post<DiscogsMapped | { results: DiscogsSearchResult[] }>('/integrations/discogs/lookup', body)
    .then(r => r.data);

export const discogsRehost = (uris: string[]) =>
  api.post<string[]>('/integrations/discogs/rehost', { uris }).then(r => r.data);

export interface AppleTrack {
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

export const appleSearch = (body: { artist: string; title: string }) =>
  api.post<{ results: AppleTrack[] }>('/integrations/apple/search', body).then(r => r.data);

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  externalUrl: string;
}

export const spotifySearch = (body: { artist: string; title: string }) =>
  api.post<{ results: SpotifyTrack[] }>('/integrations/spotify/search', body).then(r => r.data);

export interface YoutubeVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

export const youtubeSearch = (body: { artist: string; title: string }) =>
  api.post<{ results: YoutubeVideo[] }>('/integrations/youtube/search', body).then(r => r.data);

export const bandcampSearch = (body: { artist: string; title: string }) =>
  api
    .post<{ searchUrl: string; guessedTrackUrl?: string }>('/integrations/bandcamp/search', body)
    .then(r => r.data);

export const uploadAudio = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api
    .post<{ url: string }>('/integrations/upload/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);
};
