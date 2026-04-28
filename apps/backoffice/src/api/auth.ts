import { api } from './client';
import type { AuthTokens } from '@mf/shared';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await api.post<AuthTokens>('/auth/login', { email, password });
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}
