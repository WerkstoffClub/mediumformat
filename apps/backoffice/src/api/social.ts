import { api } from './client';

export interface SocialSettings {
  waPhone: string | null;
  waTemplate: string;
  igUsername: string | null;
  fbPageUrl: string | null;
  storefrontUrlBase: string | null;
  feedEnabled: boolean;
  feedPath: string | null;
}

export interface ListingRow {
  releaseId: string;
  title: string;
  priceIdr: number;
  stock: number;
  condition: string;
  imageUrl: string | null;
  waPreviewUrl: string | null;
  warnings: string[];
}

export interface ListingsResponse {
  items: ListingRow[];
  exportedCount: number;
}

export type SocialSettingsUpdate = Partial<
  Pick<SocialSettings, 'waPhone' | 'waTemplate' | 'igUsername' | 'fbPageUrl' | 'storefrontUrlBase' | 'feedEnabled'>
>;

export async function getSocialSettings(): Promise<SocialSettings> {
  const res = await api.get<SocialSettings>('/social/settings');
  return res.data;
}

export async function updateSocialSettings(data: SocialSettingsUpdate): Promise<SocialSettings> {
  const res = await api.patch<SocialSettings>('/social/settings', data);
  return res.data;
}

export async function getListings(): Promise<ListingsResponse> {
  const res = await api.get<ListingsResponse>('/social/listings');
  return res.data;
}
