import { api } from './client';

export type NewsletterSource = 'STOREFRONT' | 'CHECKOUT' | 'POS' | 'MANUAL' | 'IMPORT';

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: NewsletterSource;
  subscribedAt: string;
  unsubscribedAt: string | null;
  tags: string[];
}

interface SubscriberList {
  items: Subscriber[];
  total: number;
  page: number;
  limit: number;
}

export const listSubscribers = (
  p: { page?: number; limit?: number; q?: string; source?: NewsletterSource; tag?: string } = {},
) => api.get<SubscriberList>('/newsletter/subscribers', { params: p }).then(r => r.data);

export const createSubscriber = (body: Pick<Subscriber, 'email' | 'name' | 'source' | 'tags'>) =>
  api.post<Subscriber>('/newsletter/subscribers', body).then(r => r.data);

export const updateSubscriber = (id: string, body: Partial<Subscriber>) =>
  api.patch<Subscriber>(`/newsletter/subscribers/${id}`, body).then(r => r.data);

export const deleteSubscriber = (id: string) =>
  api.delete(`/newsletter/subscribers/${id}`).then(r => r.data);

export const importSubscribersCsv = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api
    .post<{ added: number; skipped: number }>('/newsletter/subscribers/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);
};

export const exportSubscribersCsvUrl = () => '/api/v1/newsletter/subscribers/export.csv';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT';

export interface Campaign {
  id: string;
  subject: string;
  previewText: string | null;
  body: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CampaignList {
  items: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export const listCampaigns = (p: { page?: number; limit?: number; q?: string; status?: CampaignStatus } = {}) =>
  api.get<CampaignList>('/newsletter/campaigns', { params: p }).then(r => r.data);

export const createCampaign = (body: Pick<Campaign, 'subject' | 'previewText' | 'body' | 'scheduledAt'>) =>
  api.post<Campaign>('/newsletter/campaigns', body).then(r => r.data);

export const updateCampaign = (id: string, body: Partial<Campaign>) =>
  api.patch<Campaign>(`/newsletter/campaigns/${id}`, body).then(r => r.data);

export const duplicateCampaign = (id: string) =>
  api.post<Campaign>(`/newsletter/campaigns/${id}/duplicate`).then(r => r.data);

export const deleteCampaign = (id: string) =>
  api.delete(`/newsletter/campaigns/${id}`).then(r => r.data);
