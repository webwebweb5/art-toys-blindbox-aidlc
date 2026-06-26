'use client';

import Link from 'next/link';
import { useRequireRole } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireRole('STAFF');
  const logout = useAuthStore((s) => s.logout);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b bg-white">
        <nav className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-primary-500">Staff</span>
            <Link href="/staff/scanner" className="text-sm hover:text-primary-500">
              Scanner
            </Link>
            <Link href="/staff/stock" className="text-sm hover:text-primary-500">
              Stock
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
