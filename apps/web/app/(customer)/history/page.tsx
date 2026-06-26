'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, cn } from '@/lib/utils';

interface PullRecord {
  id: string;
  series: string;
  figure: string;
  image: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';
  date: string;
  voucherStatus: string | null;
}

export default function HistoryPage() {
  useRequireAuth();
  const [pulls, setPulls] = useState<PullRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await apiClient.get<PullRecord[]>('/api/v1/purchase/history');
        setPulls(res.data);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Pull History</h1>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Pull History</h1>
      {pulls.length === 0 ? (
        <p className="text-gray-500 text-center py-16">No pulls yet. Start collecting!</p>
      ) : (
        <div className="space-y-3">
          {pulls.map((pull) => (
            <Card key={pull.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <img
                  src={pull.image || '/placeholder-figure.png'}
                  alt={pull.figure}
                  className="w-14 h-14 rounded-lg object-contain bg-gray-50"
                />
                <div className="flex-1">
                  <p className="font-medium">{pull.figure}</p>
                  <p className="text-sm text-gray-500">{pull.series}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    pull.rarity === 'SECRET' && 'bg-yellow-100 text-yellow-700',
                    pull.rarity === 'RARE' && 'bg-purple-100 text-purple-700',
                    pull.rarity === 'UNCOMMON' && 'bg-green-100 text-green-700',
                    pull.rarity === 'COMMON' && 'bg-gray-100 text-gray-600',
                  )}>
                    {pull.rarity}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(pull.date)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
