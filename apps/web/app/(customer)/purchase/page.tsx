'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

export default function PurchasePage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/2" /><div className="h-40 bg-gray-200 rounded" /></div></div>}>
      <PurchaseContent />
    </Suspense>
  );
}

function PurchaseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seriesId = searchParams.get('seriesId');
  const quantity = parseInt(searchParams.get('quantity') || '1', 10);

  const [series, setSeries] = useState<{
    id: string;
    name: string;
    pricePerBox: number;
    coverImage: string;
  } | null>(null);

  useEffect(() => {
    if (!seriesId) return;
    async function fetchSeries() {
      const res = await apiClient.get<any>(`/api/v1/series/${seriesId}`);
      setSeries(res.data);
    }
    fetchSeries();
  }, [seriesId]);

  const handlePurchase = async () => {
    if (!seriesId) return;
    setPurchasing(true);
    setError(null);
    try {
      const endpoint = quantity > 1
        ? '/api/v1/purchase/multi'
        : '/api/v1/purchase/single';
      const res = await apiClient.post<{ orderId: string; paymentIntentClientSecret?: string; mock?: boolean }>(
        endpoint,
        { seriesId, quantity },
      );

      if (res.data.paymentIntentClientSecret && !res.data.mock) {
        // Real Stripe flow: confirm payment client-side with Stripe.js,
        // then the webhook completes the purchase. (Requires Stripe Elements setup.)
        router.push(`/purchase/${res.data.orderId}/pay?cs=${res.data.paymentIntentClientSecret}`);
      } else {
        // Mock/dev mode: purchase already completed server-side → go straight to reveal.
        router.push(`/purchase/${res.data.orderId}/reveal`);
      }
      // Keep the button in its loading state while navigation completes.
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
      setPurchasing(false);
    }
  };

  if (authLoading || !series) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Purchase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <img
              src={series.coverImage || '/placeholder-series.png'}
              alt={series.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold">{series.name}</h3>
              <p className="text-sm text-gray-500">{quantity} box{quantity > 1 ? 'es' : ''}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Price per box</span>
              <span>{formatPrice(series.pricePerBox)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Quantity</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-primary-500">{formatPrice(series.pricePerBox * quantity)}</span>
            </div>
          </div>

          {quantity === 6 && (
            <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              🎉 6-box multi-pull — no duplicate figures guaranteed!
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? 'Processing...' : `Pay ${formatPrice(series.pricePerBox * quantity)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
