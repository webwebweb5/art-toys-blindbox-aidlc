'use client';

import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tierColors = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

export default function ProfilePage() {
  useRequireAuth();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role</span>
              <span className="font-medium">{user.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Current Tier</span>
              <span className={cn('px-3 py-1 rounded-full text-sm font-bold', tierColors[user.tier])}>
                {user.tier}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Progress to next tier</span>
                <span>{user.tierProgress ?? 0}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-accent-500 rounded-full transition-all"
                  style={{ width: `${user.tierProgress ?? 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Share your referral code and earn rewards when friends sign up!
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-100 px-4 py-2 rounded-lg text-sm font-mono">
                {user.referralCode ?? '—'}
              </code>
              <Button
                variant="outline"
                size="sm"
                disabled={!user.referralCode}
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode ?? '');
                  toast.success('Referral code copied');
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
