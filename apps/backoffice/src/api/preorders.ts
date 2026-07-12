import { api } from './client';

// A "preorder" is a Release with preorder=true. Return type matches Release enough for UI use.
export interface PreorderRelease {
  id: string;
  artist: string;
  title: string;
  format: string;
  imageUrl?: string | null;
  priceIdr: number;
  stock: number;
  preorder: true;
  preorderEta: string | null;
  notes?: string | null;
}

export const listPreorders = (p: { q?: string; scope?: 'all' | 'upcoming' | 'overdue' } = {}) =>
  api.get<PreorderRelease[]>('/preorders', { params: p }).then(r => r.data);

export const setPreorder = (releaseId: string, body: { eta: string; notes?: string }) =>
  api.post<PreorderRelease>(`/preorders/${releaseId}`, body).then(r => r.data);

export const unsetPreorder = (releaseId: string) =>
  api.delete(`/preorders/${releaseId}`).then(r => r.data);
