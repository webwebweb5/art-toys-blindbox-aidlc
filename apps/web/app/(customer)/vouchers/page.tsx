'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, cn } from '@/lib/utils';

interface Voucher {
  id: string;
  figureName: string;
  figureImage: string;
  branchName: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
}

export default function VouchersPage() {
  useRequireAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVouchers() {
      try {
        const res = await apiClient.get<Voucher[]>('/api/v1/vouchers');
        setVouchers(res.data);
      } catch (error) {
        console.error('Failed to load vouchers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVouchers();
  }, []);

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700',
    REDEEMED: 'bg-blue-100 text-blue-700',
    EXPIRED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Vouchers</h1>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Vouchers</h1>
      {vouchers.length === 0 ? (
        <p className="text-gray-500 text-center py-16">No vouchers yet.</p>
      ) : (
        <div className="space-y-3">
          {vouchers.map((voucher) => (
            <Link key={voucher.id} href={`/pickup/${voucher.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <img
                    src={voucher.figureImage || '/placeholder-figure.png'}
                    alt={voucher.figureName}
                    className="w-14 h-14 rounded-lg object-contain bg-gray-50"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{voucher.figureName}</p>
                    <p className="text-sm text-gray-500">{voucher.branchName}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn('text-xs px-2 py-1 rounded-full', statusColors[voucher.status])}>
                      {voucher.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      Exp: {formatDateTime(voucher.expiresAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
