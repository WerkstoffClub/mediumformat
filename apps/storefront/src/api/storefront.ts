import axios, { AxiosError } from 'axios';

/**
 * Storefront API client — read-only calls against the public
 * /api/v1/storefront/* endpoints. No auth headers required.
 */

const BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ---------------------------------------------------------------------------
// Types (loose — mirror the API shape without importing Prisma types)
// ---------------------------------------------------------------------------

export type RecordFormat =
  | 'LP'
  | 'TWO_LP'
  | 'THREE_LP'
  | 'TWELVE_INCH'
  | 'SEVEN_INCH'
  | 'CD'
  | 'TWO_CD'
  | 'CASSETTE'
  | 'MERCH';

export type RecordCondition =
  | 'M'
  | 'NM'
  | 'VG_PLUS'
  | 'VG'
  | 'G_PLUS'
  | 'G'
  | 'F'
  | 'P';

export interface TrackPreview {
  provider?: string;
  url: string;
  durationSec?: number;
}

export interface ReleaseTrack {
  position?: string;
  title: string;
  durationSec?: number;
  duration?: string;
  previews?: TrackPreview[];
}

export interface Release {
  id: string;
  slug: string | null;
  artist: string;
  title: string;
  label: string | null;
  catNumber: string | null;
  year: number | null;
  format: RecordFormat;
  genre: string | null;
  condition: RecordCondition;
  priceIdr: number;
  stock: number;
  imageUrl: string | null;
  gallery: unknown;
  notes: string | null;
  tracks?: ReleaseTrack[] | null;
  featured?: boolean;
  preorder?: boolean;
  preorderEta?: string | null;
  onSale?: boolean;
  compareAtIdr?: number | null;
  mediaGrade?: RecordCondition | null;
  sleeveGrade?: RecordCondition | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  category: string;
  status: string;
  publishedAt: string | null;
  authorId: string;
}

export interface NewsletterResult {
  email?: string;
  already?: boolean;
  id?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const unwrap = (err: unknown, fallback: string): never => {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { message?: string } | undefined;
    throw new ApiError(status, data?.message ?? err.message ?? fallback);
  }
  if (err instanceof Error) throw new ApiError(0, err.message);
  throw new ApiError(0, fallback);
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export interface ReleaseListParams {
  page?: number;
  limit?: number;
  format?: RecordFormat | '';
  q?: string;
}

export async function listReleases(params: ReleaseListParams = {}): Promise<Release[]> {
  try {
    const res = await api.get<Release[]>('/storefront/releases', {
      params: {
        page: params.page,
        limit: params.limit,
        format: params.format || undefined,
        q: params.q || undefined,
      },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    return unwrap(err, 'Failed to load releases');
  }
}

export async function getRelease(slug: string): Promise<Release | null> {
  try {
    const res = await api.get<Release>(`/storefront/releases/${encodeURIComponent(slug)}`);
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    return unwrap(err, 'Failed to load release');
  }
}

export async function listPreorders(): Promise<Release[]> {
  try {
    const res = await api.get<Release[]>('/storefront/preorders');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    return unwrap(err, 'Failed to load preorders');
  }
}

export async function listPosts(limit?: number): Promise<Post[]> {
  try {
    const res = await api.get<Post[]>('/storefront/posts');
    const posts = Array.isArray(res.data) ? res.data : [];
    return typeof limit === 'number' ? posts.slice(0, limit) : posts;
  } catch (err) {
    return unwrap(err, 'Failed to load posts');
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await api.get<Post>(`/storefront/posts/${encodeURIComponent(slug)}`);
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    return unwrap(err, 'Failed to load post');
  }
}

export async function subscribeNewsletter(email: string): Promise<NewsletterResult> {
  try {
    const res = await api.post<NewsletterResult>('/storefront/newsletter/subscribe', {
      email,
      source: 'STOREFRONT',
    });
    return res.data;
  } catch (err) {
    return unwrap(err, 'Subscription failed');
  }
}
