'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Access the auth store. Initial hydration is handled once by AuthProvider,
 * so this hook has no side effects of its own.
 */
export function useAuth() {
  return useAuthStore();
}

/**
 * Require an authenticated user. Redirects to login (preserving the current
 * path as `redirect`) once auth has resolved and the user is not authenticated.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  return { isAuthenticated, isLoading };
}

/**
 * Require a specific role. Unauthenticated users go to login (with redirect),
 * wrong-role users go back to the store front.
 */
export function useRequireRole(role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    } else if (user && user.role !== role) {
      router.replace('/');
    }
  }, [user, isLoading, isAuthenticated, role, pathname, router]);

  const authorized = !isLoading && isAuthenticated && user?.role === role;
  return { user, isLoading, authorized };
}
