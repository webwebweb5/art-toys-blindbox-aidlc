'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { setUnauthorizedHandler } from '@/lib/api/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hydrate session once on mount.
    useAuthStore.getState().loadUser();

    // When the API client exhausts token refresh, reset auth state.
    // Route guards (useRequireAuth / useRequireRole) handle any redirect.
    setUnauthorizedHandler(() => {
      useAuthStore.getState().logout();
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  return <>{children}</>;
}
