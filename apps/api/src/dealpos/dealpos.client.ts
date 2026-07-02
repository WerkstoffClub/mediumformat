import { Injectable, Logger } from '@nestjs/common';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;
const TOKEN_SAFETY_WINDOW_MS = 60_000;

export interface DealposToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiredat?: string;
}

/**
 * Thin HTTP client for the DealPOS Open API (api/v3).
 * Handles OAuth2 token caching, 401 re-auth, and rate-limit-aware retries.
 */
@Injectable()
export class DealposClient {
  private readonly logger = new Logger(DealposClient.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  get isConfigured(): boolean {
    return Boolean(
      process.env.DEALPOS_SUBDOMAIN &&
      process.env.DEALPOS_CLIENT_ID &&
      process.env.DEALPOS_CLIENT_SECRET,
    );
  }

  private get baseUrl(): string {
    const subdomain = process.env.DEALPOS_SUBDOMAIN;
    if (!subdomain) throw new Error('DEALPOS_SUBDOMAIN is not set');
    return `https://${subdomain}`;
  }

  private async authenticate(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v3/Token/OAuth2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.DEALPOS_CLIENT_ID,
        client_secret: process.env.DEALPOS_CLIENT_SECRET,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DealPOS auth failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as DealposToken;
    this.token = data.access_token;
    this.tokenExpiresAt =
      Date.now() + (data.expires_in ?? 3600) * 1000 - TOKEN_SAFETY_WINDOW_MS;
  }

  private async ensureToken(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
    return this.token as string;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string> } = {},
    attempt = 0,
    reauthed = false,
  ): Promise<T> {
    const token = await this.ensureToken();
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    // Only send Content-Type when there is a body — DealPOS's model binding
    // 500s on bodyless GETs that declare application/json.
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...opts.headers,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      // Network-level failure (DNS, reset socket) — retry like a 5xx
      if (attempt < MAX_RETRIES) {
        const waitMs = BASE_BACKOFF_MS * 2 ** attempt;
        this.logger.warn(`${method} ${path} network error; retry in ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        return this.request<T>(method, path, opts, attempt + 1, reauthed);
      }
      throw err;
    }

    if (res.status === 401 && !reauthed) {
      this.token = null;
      return this.request<T>(method, path, opts, attempt, true);
    }
    if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
      const waitMs = BASE_BACKOFF_MS * 2 ** attempt;
      this.logger.warn(`${method} ${path} → ${res.status}; retry in ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      return this.request<T>(method, path, opts, attempt + 1, reauthed);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DealPOS ${method} ${path} failed (${res.status}): ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  get<T>(path: string, query?: Record<string, unknown>, headers?: Record<string, string>) {
    return this.request<T>('GET', path, { query, headers });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>('POST', path, { body, headers });
  }

  /** Iterate a PageNumber/PageSize-paginated GET endpoint until a short page. */
  async *paginate<T>(
    path: string,
    query: Record<string, unknown> = {},
    pageSize = 100,
    extract: (res: unknown) => T[] = res =>
      Array.isArray(res) ? (res as T[]) : ((res as { Data?: T[] }).Data ?? []),
  ): AsyncGenerator<T[]> {
    for (let page = 1; ; page++) {
      const res = await this.get<unknown>(path, { ...query, PageNumber: page, PageSize: pageSize });
      const rows = extract(res);
      if (rows.length > 0) yield rows;
      if (rows.length < pageSize) return;
    }
  }
}
