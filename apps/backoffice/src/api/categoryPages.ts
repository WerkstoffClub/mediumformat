import { api } from './client';

export type CategoryPageTemplate = 'FULL_HERO' | 'HALF_HERO';
export type CategoryPageStatus   = 'DRAFT' | 'PUBLISHED';

export type RecordFormat =
  | 'LP' | 'TWO_LP' | 'THREE_LP' | 'TWELVE_INCH' | 'SEVEN_INCH'
  | 'CD' | 'TWO_CD' | 'CASSETTE' | 'MERCH';

export interface CategoryPage {
  id: string;
  slug: string;
  title: string;
  formatFilter?: RecordFormat | null;
  template: CategoryPageTemplate;
  kicker?: string | null;
  headline?: string | null;
  salesCopy?: string | null;
  heroImageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status: CategoryPageStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPageListResponse {
  data: CategoryPage[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryPageFilter {
  status?: CategoryPageStatus;
  template?: CategoryPageTemplate;
  search?: string;
  page?: number;
  limit?: number;
}

export type CreateCategoryPageInput = Omit<
  CategoryPage,
  'id' | 'createdAt' | 'updatedAt' | 'publishedAt'
>;

export async function listCategoryPages(
  filter: CategoryPageFilter = {},
): Promise<CategoryPageListResponse> {
  const res = await api.get<CategoryPageListResponse>('/category-pages', {
    params: filter,
  });
  return res.data;
}

export async function getCategoryPage(id: string): Promise<CategoryPage> {
  const res = await api.get<CategoryPage>(`/category-pages/${id}`);
  return res.data;
}

export async function createCategoryPage(
  body: CreateCategoryPageInput,
): Promise<CategoryPage> {
  const res = await api.post<CategoryPage>('/category-pages', body);
  return res.data;
}

export async function updateCategoryPage(
  id: string,
  body: Partial<CategoryPage>,
): Promise<CategoryPage> {
  const res = await api.patch<CategoryPage>(`/category-pages/${id}`, body);
  return res.data;
}

export async function deleteCategoryPage(id: string): Promise<void> {
  await api.delete(`/category-pages/${id}`);
}
