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
  /** Array, or the back-office's `{ apple, upload, bandcamp, soundcloud }` map. Read via lib/preview. */
  previews?: TrackPreview[] | Partial<Record<'apple' | 'upload' | 'bandcamp' | 'soundcloud', string>>;
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

// ---------------------------------------------------------------------------
// Category pages (public, published only)
// ---------------------------------------------------------------------------

export type CategoryPageTemplate = 'FULL_HERO' | 'HALF_HERO';
export type CategoryPageStatus   = 'DRAFT' | 'PUBLISHED';
export type CategoryPageKind = 'PRODUCT_PAGE' | 'NEWS_CATEGORY';

export interface CategoryPage {
  id: string;
  slug: string;
  title: string;
  formatFilter: RecordFormat | null;
  template: CategoryPageTemplate;
  kind: CategoryPageKind;
  newsCategoryKey: string | null;
  posts?: Post[];          // present only for NEWS_CATEGORY pages (embedded by the resolver)
  kicker: string | null;
  headline: string | null;
  salesCopy: string | null;
  heroImageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: CategoryPageStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getCategoryPage(slug: string): Promise<CategoryPage | null> {
  try {
    const res = await api.get<CategoryPage>(
      `/storefront/category-pages/${encodeURIComponent(slug)}`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    return unwrap(err, 'Failed to load page');
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

// ---------------------------------------------------------------------------
// Checkout — POST /storefront/orders (prices + stock resolved server-side)
// ---------------------------------------------------------------------------

export interface PlaceOrderInput {
  customerName: string;
  email: string;
  phone: string;
  fulfilment: 'PICKUP' | 'DELIVERY';
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  voucherCode?: string;
  lines: Array<{ releaseId: string; qty: number }>;
}

export interface PlacedOrder {
  number: string;
  status: string;
  customerName: string;
  fulfilment: 'PICKUP' | 'DELIVERY';
  subtotalIdr: number;
  discountIdr: number;
  totalIdr: number;
  voucherCode: string | null;
  createdAt: string;
  lines: Array<{ releaseId: string; artist: string; title: string; format: string; unitPriceIdr: number; qty: number }>;
}

/** Turns an API error into one sentence a shopper can act on. */
export function checkoutErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.response?.status === 429) return 'Too many attempts. Wait a minute, then place the order again.';
    // Only 400/409 carry messages written for shoppers (validation, stock, voucher).
    const status = err.response?.status;
    const msg = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (status === 400 && Array.isArray(msg)) return 'Check your details: ' + msg.join('; ') + '.';
    if ((status === 400 || status === 409) && typeof msg === 'string') return msg;
    if (!err.response) return 'Could not reach the shop. Check your connection and try again.';
  }
  return 'Something went wrong placing your order. Please try again.';
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const res = await api.post<PlacedOrder>('/storefront/orders', input);
  return res.data;
}

export async function checkVoucher(code: string, subtotalIdr: number) {
  const res = await api.post<{ valid: boolean; discountIdr: number; reason?: string }>(
    '/storefront/vouchers/validate', { code, subtotalIdr },
  );
  return res.data;
}
