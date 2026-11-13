import { api } from './client';

export type VenueStatus = 'ONBOARDING' | 'LIVE' | 'PAUSED';
export type EventStatus = 'DRAFT' | 'SCHEDULED' | 'ON_SALE' | 'SOLD_OUT' | 'ENDED' | 'CANCELLED';
export type TicketChannel = 'BOX_OFFICE' | 'ONLINE' | 'COMP';
export type TicketPayment = 'CASH' | 'QRIS' | 'EDC' | 'XENDIT' | 'NONE';
export type ScanResult = 'VALID' | 'ALREADY' | 'WRONG_EVENT' | 'VOID' | 'NOT_FOUND';

export interface Venue {
  id: string; slug: string; name: string; kind: string | null; area: string | null; city: string;
  capacity: number | null; status: VenueStatus; feePct: string; contact: string | null; notes: string | null;
  sold30d: number; revenue30d: number;
}
export interface VenueRow extends Venue {
  upcomingCount: number;
  nextShow: { id: string; title: string; startsAt: string } | null;
}
export type VenueInput = Partial<Omit<Venue, 'id' | 'slug' | 'sold30d' | 'revenue30d' | 'feePct'>> & { feePct?: number };

export interface EventRow {
  id: string; slug: string; title: string; lineup: string | null; venueId: string;
  venue: { id: string; name: string; area: string | null };
  startsAt: string; doorsAt: string | null; endsAt: string | null; status: EventStatus; notes: string | null;
  tierCount: number; priceFrom: number | null; quota: number; sold: number; revenue: number;
}
export interface Tier {
  id: string; name: string; priceIdr: number; quota: number; salesStart: string | null; salesEnd: string | null;
  sortOrder: number; sold: number; revenue: number; checkedIn: number;
}
export interface EventDetail extends Omit<EventRow, 'venue' | 'tierCount' | 'priceFrom'> {
  venue: Venue; tiers: Tier[]; checkedIn: number;
  byChannel: { channel: TicketChannel; payment: TicketPayment; tickets: number; revenue: number }[];
}
export interface EventInput {
  title?: string; venueId?: string; startsAt?: string; doorsAt?: string | null; endsAt?: string | null;
  lineup?: string | null; status?: EventStatus; notes?: string | null;
}
export interface TierInput { name?: string; priceIdr?: number; quota?: number; salesStart?: string | null; salesEnd?: string | null; sortOrder?: number; }

export interface Ticket {
  id: string; code: string; eventId: string; tierId: string; tier: { name: string };
  holderName: string | null; holderEmail: string | null; channel: TicketChannel; payment: TicketPayment;
  priceIdr: number; status: 'VALID' | 'VOID'; checkedInAt: string | null; gate: string | null; createdAt: string;
}
interface Page<T> { items: T[]; total: number; page: number; limit: number; }

export interface CheckinStats {
  sold: number; checkedIn: number; syncedAt: string;
  tiers: { id: string; name: string; priceIdr: number; sold: number; checkedIn: number }[];
  gates: { gate: string; count: number }[];
  recent: Ticket[];
}
export interface ScanResponse { result: ScanResult; code: string; ticket: (Ticket & { event: { title: string } }) | null; }

export interface PeersSummary {
  days: number; tickets: number; revenue: number; checkinRate: number | null; upcoming: number;
  series: { date: string; tickets: number; revenue: number }[];
  byVenue: { name: string; tickets: number; revenue: number }[];
}

const d = <T,>(p: Promise<{ data: T }>) => p.then(r => r.data);

export const listVenues = () => d(api.get<VenueRow[]>('/venues'));
export const getVenue = (id: string) => d(api.get<Venue>(`/venues/${id}`));
export const createVenue = (b: VenueInput) => d(api.post<Venue>('/venues', b));
export const updateVenue = (id: string, b: VenueInput) => d(api.patch<Venue>(`/venues/${id}`, b));
export const deleteVenue = (id: string) => d(api.delete(`/venues/${id}`));

export const listEvents = (p: { q?: string; venueId?: string; status?: string; scope?: 'upcoming' | 'past' | 'all'; page?: number; limit?: number } = {}) =>
  d(api.get<Page<EventRow>>('/events', { params: p }));
export const getEvent = (id: string) => d(api.get<EventDetail>(`/events/${id}`));
export const createEvent = (b: EventInput) => d(api.post<EventRow>('/events', b));
export const updateEvent = (id: string, b: EventInput) => d(api.patch<EventRow>(`/events/${id}`, b));
export const deleteEvent = (id: string) => d(api.delete(`/events/${id}`));
export const peersSummary = (days = 30) => d(api.get<PeersSummary>('/events/summary', { params: { days } }));

export const addTier = (eventId: string, b: TierInput) => d(api.post<Tier>(`/events/${eventId}/tiers`, b));
export const updateTier = (id: string, b: TierInput) => d(api.patch<Tier>(`/tiers/${id}`, b));
export const deleteTier = (id: string) => d(api.delete(`/tiers/${id}`));

export const listTickets = (eventId: string, p: { q?: string; page?: number; limit?: number } = {}) =>
  d(api.get<Page<Ticket>>(`/events/${eventId}/tickets`, { params: p }));
export const sellTickets = (eventId: string, b: { tierId: string; qty: number; holderName?: string; holderEmail?: string; channel: 'BOX_OFFICE' | 'COMP'; payment: TicketPayment }) =>
  d(api.post<Ticket[]>(`/events/${eventId}/tickets`, b));
export const voidTicket = (id: string) => d(api.post<Ticket>(`/tickets/${id}/void`));

export const checkinStats = (eventId: string) => d(api.get<CheckinStats>(`/events/${eventId}/checkin`));
export const checkin = (eventId: string, code: string, gate?: string) =>
  d(api.post<ScanResponse>(`/events/${eventId}/checkin`, { code, gate }));

export const VENUE_STATUS_LABEL: Record<VenueStatus, string> = { ONBOARDING: 'Onboarding', LIVE: 'Live', PAUSED: 'Paused' };
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', ON_SALE: 'On sale', SOLD_OUT: 'Sold out', ENDED: 'Ended', CANCELLED: 'Cancelled',
};
export const PAYMENT_LABEL: Record<TicketPayment, string> = { CASH: 'Cash', QRIS: 'QRIS', EDC: 'EDC', XENDIT: 'Xendit', NONE: '—' };
export const CHANNEL_LABEL: Record<TicketChannel, string> = { BOX_OFFICE: 'Box office', ONLINE: 'Online', COMP: 'Comp' };
