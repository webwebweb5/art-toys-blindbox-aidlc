import { create } from 'zustand';
import { apiClient, ApiError } from '@/lib/api/client';
import { tokenStore } from '@/lib/api/token-store';

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tier: Tier;
  tierProgress?: number;
  referralCode?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
      email,
      password,
    });
    tokenStore.set(res.data.accessToken, res.data.refreshToken);
    set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    // Hydrate the full profile (referralCode, tierProgress) from /auth/me.
    await get().loadUser();
  },

  register: async (email, password, name) => {
    const res = await apiClient.post<AuthResponse>('/api/v1/auth/register', {
      email,
      password,
      name,
    });
    tokenStore.set(res.data.accessToken, res.data.refreshToken);
    set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    await get().loadUser();
  },

  logout: () => {
    tokenStore.clear();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  /**
   * Hydrate the current user from the stored session. The API client will
   * transparently refresh an expired access token using the refresh token,
   * so this works across reloads for the lifetime of the refresh token.
   */
  loadUser: async () => {
    if (!tokenStore.hasSession()) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const res = await apiClient.get<User>('/api/v1/auth/me');
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      // 401 here means refresh also failed → tokens already cleared by client.
      if (!(error instanceof ApiError)) {
        console.error('Failed to load user:', error);
      }
      tokenStore.clear();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  hasRole: (...roles) => {
    const u = get().user;
    return !!u && roles.includes(u.role);
  },
}));
