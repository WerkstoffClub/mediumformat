import { api } from './client';

export interface VisitorTotals {
  pageviews: number;
  visitors: number;
  sessions: number;
  pagesPerSession: number;
  bounceRate: number; // %
}

export interface VisitorsSummary {
  days: number;
  liveVisitors: number;
  current: VisitorTotals;
  previous: VisitorTotals;
  daily: Array<{ day: string; visitors: number; pageviews: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  referrers: Array<{ source: string; visitors: number }>;
  devices: Array<{ device: string; visitors: number }>;
}

export async function getVisitorsSummary(days: 7 | 30 | 90): Promise<VisitorsSummary> {
  const res = await api.get<VisitorsSummary>('/visitors-summary', { params: { days } });
  return res.data;
}
