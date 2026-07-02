import { api } from './client';
import type { Release } from '@mf/shared';

export interface ReleaseListResponse {
  data: Release[];
  total: number;
  page: number;
  limit: number;
}

export interface ReleaseFilter {
  q?: string;
  artist?: string;
  title?: string;
  format?: string;
  condition?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function getReleases(filter: ReleaseFilter = {}): Promise<ReleaseListResponse> {
  const res = await api.get<ReleaseListResponse>('/inventory', { params: filter });
  return res.data;
}

export async function getRelease(id: string): Promise<Release> {
  const res = await api.get<Release>(`/inventory/${id}`);
  return res.data;
}

export async function createRelease(data: Partial<Release>): Promise<Release> {
  const res = await api.post<Release>('/inventory', data);
  return res.data;
}

export async function updateRelease(id: string, data: Partial<Release>): Promise<Release> {
  const res = await api.patch<Release>(`/inventory/${id}`, data);
  return res.data;
}

export async function deleteRelease(id: string): Promise<void> {
  await api.delete(`/inventory/${id}`);
}
