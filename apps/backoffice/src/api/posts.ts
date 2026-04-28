import { api } from './client';

export type PostCategory = 'STAFF_PICKS' | 'HIGHLIGHTS' | 'NEWS' | 'INTERVIEW';
export type PostStatus   = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  category: PostCategory;
  status: PostStatus;
  publishedAt: string | null;
  authorId: string;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface PostListResponse {
  data: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface PostFilter {
  category?: PostCategory;
  status?: PostStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getPosts(filter: PostFilter = {}): Promise<PostListResponse> {
  const res = await api.get<PostListResponse>('/posts', { params: filter });
  return res.data;
}

export async function getPost(id: string): Promise<Post> {
  const res = await api.get<Post>(`/posts/${id}`);
  return res.data;
}

export async function createPost(data: Partial<Post>): Promise<Post> {
  const res = await api.post<Post>('/posts', data);
  return res.data;
}

export async function updatePost(id: string, data: Partial<Post>): Promise<Post> {
  const res = await api.patch<Post>(`/posts/${id}`, data);
  return res.data;
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/posts/${id}`);
}
