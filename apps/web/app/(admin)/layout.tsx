'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Store,
  CalendarClock,
  Boxes,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/series', label: 'Series', icon: Package },
  { href: '/admin/branches', label: 'Branches', icon: Store },
  { href: '/admin/events', label: 'Events', icon: CalendarClock },
  { href: '/admin/stock', label: 'Stock', icon: Boxes },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, authorized } = useRequireRole('ADMIN');
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // While auth is resolving (or redirecting), show a skeleton shell.
  if (isLoading || !authorized) {
    return (
      <div className="min-h-screen flex">
        <aside className="w-64 bg-gray-900 p-4 space-y-3">
          <Skeleton className="h-8 w-40 bg-gray-700" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-gray-800" />
          ))}
        </aside>
        <main className="flex-1 p-8 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  const initials = (user?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6">
          <h2 className="text-lg font-bold">ArtToys Admin</h2>
          <p className="text-xs text-gray-400 mt-1">Management Console</p>
        </div>
        <div className="px-4 pb-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-start border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800 hover:text-white"
          >
            <Link href="/series">
              <Store className="h-4 w-4" />
              Back to store
            </Link>
          </Button>
        </div>
        <Separator className="bg-gray-800" />
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Separator className="bg-gray-800" />
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-gray-800 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/series">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View store
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-muted/30 p-8 overflow-auto">{children}</main>
    </div>
  );
}
