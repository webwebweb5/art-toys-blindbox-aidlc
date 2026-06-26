const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/**
 * Centralized token storage (localStorage), SSR-safe.
 * Shared by the API client (for auth headers + refresh) and the auth store.
 */
export const tokenStore = {
  getAccess(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  hasSession(): boolean {
    return !!this.getAccess() || !!this.getRefresh();
  },
};
