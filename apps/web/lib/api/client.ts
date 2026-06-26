import { tokenStore } from './token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  data: T;
  error: null | { code?: string; message?: string };
  meta?: Record<string, unknown>;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Handler invoked when the session can no longer be recovered (refresh failed).
// Registered by AuthProvider to reset the auth store.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

// Shared in-flight refresh so concurrent 401s trigger only ONE refresh call.
let refreshPromise: Promise<boolean> | null = null;

// Dedup identical concurrent GET requests (e.g. React StrictMode double-invoke,
// or multiple components requesting the same resource) into a single network call.
const inFlightGets = new Map<string, Promise<ApiResponse<unknown>>>();

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private isAuthPath(path: string): boolean {
    return (
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/social')
    );
  }

  private async parseError(response: Response) {
    const data = await response.json().catch(() => null);
    const message =
      data?.error?.message ||
      data?.message ||
      `Request failed (${response.status})`;
    const code = data?.error?.code as string | undefined;
    return { message, code, data };
  }

  /** Attempt to refresh tokens. Deduped across concurrent callers. */
  private async refreshTokens(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return false;

    refreshPromise = fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = await res.json().catch(() => null);
        if (json?.data?.accessToken) {
          tokenStore.set(json.data.accessToken, json.data.refreshToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  private async doFetch<T>(
    path: string,
    options: RequestOptions,
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const { body, params, headers: customHeaders, ...rest } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    const token = tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Access token expired → try a single refresh + retry (skip auth endpoints).
    if (response.status === 401 && !isRetry && !this.isAuthPath(path)) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        return this.doFetch<T>(path, options, true);
      }
      // Refresh failed → session is dead.
      tokenStore.clear();
      onUnauthorized?.();
      const err = await this.parseError(response);
      throw new ApiError(401, err.message, err.code, err.data);
    }

    if (!response.ok) {
      const err = await this.parseError(response);
      throw new ApiError(response.status, err.message, err.code, err.data);
    }

    // 204 No Content
    if (response.status === 204) {
      return { data: undefined as T, error: null };
    }

    return response.json();
  }

  request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.doFetch<T>(path, options);
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    const key = `GET ${url}`;
    const existing = inFlightGets.get(key);
    if (existing) return existing as Promise<ApiResponse<T>>;

    const p = this.doFetch<T>(path, { method: 'GET', params }).finally(() => {
      inFlightGets.delete(key);
    });
    inFlightGets.set(key, p as Promise<ApiResponse<unknown>>);
    return p;
  }

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.doFetch<T>(path, { method: 'POST', body });
  }

  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.doFetch<T>(path, { method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.doFetch<T>(path, { method: 'PATCH', body });
  }

  delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.doFetch<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
