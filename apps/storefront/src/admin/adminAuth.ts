import axios from 'axios';

/** Same key the back-office writes (apps/backoffice/src/api/client.ts) — shared
 *  origin means the storefront can reuse an existing admin session. */
export const TOKEN_KEY = 'mf-access-token';

export type AdminRole = 'ADMIN' | 'MANAGER' | 'SHOPKEEPER' | 'WHOLESALER' | 'CUSTOMER';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

/** Only admins and managers may edit storefront content (mirrors the API's
 *  @Roles(ADMIN, MANAGER) mutation guards). */
export function isEditor(role: AdminRole | undefined | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Authed axios instance for admin mutations — separate from the public
 *  storefront client so anonymous reads never carry a token. */
export const adminApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

adminApi.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

export async function login(email: string, password: string): Promise<AdminUser> {
  const res = await adminApi.post<AuthTokens>('/auth/login', { email, password });
  setToken(res.data.accessToken);
  return res.data.user;
}

export async function fetchMe(): Promise<AdminUser> {
  const res = await adminApi.get<AdminUser>('/auth/me');
  return res.data;
}
