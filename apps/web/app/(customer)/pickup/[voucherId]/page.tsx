'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, cn } from '@/lib/utils';

interface VoucherDetail {
  id: string;
  qrToken: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  figureName: string;
  figureImage: string;
  branchName: string;
  branchAddress: string;
}

export default function VoucherDetailPage() {
  const params = useParams();
  useRequireAuth();
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVoucher() {
      try {
        const res = await apiClient.get<VoucherDetail>(
          `/api/v1/vouchers/${params.voucherId}`,
        );
        setVoucher(res.data);
      } catch (error) {
        console.error('Failed to load voucher:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVoucher();
  }, [params.voucherId]);

  if (loading || !voucher) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700',
    REDEEMED: 'bg-blue-100 text-blue-700',
    EXPIRED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Pickup Voucher</CardTitle>
          <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium', statusColors[voucher.status])}>
            {voucher.status}
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center">
            <img
              src={voucher.figureImage || '/placeholder-figure.png'}
              alt={voucher.figureName}
              className="w-24 h-24 object-contain"
            />
            <p className="font-semibold mt-2">{voucher.figureName}</p>
          </div>

          {voucher.status === 'ACTIVE' && (
            <div className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl">
              <div className="w-48 h-48 mx-auto bg-gray-100 flex items-center justify-center rounded-lg">
                {/* QR Code display — in production, generate from qrToken */}
                <div className="text-center">
                  <p className="text-4xl mb-2">📱</p>
                  <p className="text-xs text-gray-500 break-all px-2">
                    {voucher.qrToken.substring(0, 20)}...
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Show this QR code to staff at pickup
              </p>
            </div>
          )}

          <div className="text-left space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Branch</span>
              <span className="text-sm font-medium">{voucher.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Address</span>
              <span className="text-sm">{voucher.branchAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Expires</span>
              <span className="text-sm">{formatDateTime(voucher.expiresAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
