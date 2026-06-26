'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { CountdownTimer } from '@/components/drops/countdown-timer';
import { formatDateTime, cn } from '@/lib/utils';

interface DropEvent {
  id: string;
  name: string;
  seriesName: string;
  startsAt: string;
  endsAt: string | null;
  totalQuantity: number;
  remainingQuantity: number;
  perPersonLimit: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
}

export default function DropsPage() {
  const [drops, setDrops] = useState<DropEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDrops() {
      try {
        const res = await apiClient.get<DropEvent[]>('/api/v1/drop-events');
        setDrops(res.data);
      } catch (error) {
        console.error('Failed to load drops:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDrops();
  }, []);

  const activeDrops = drops.filter((d) => d.status === 'ACTIVE');
  const upcomingDrops = drops.filter((d) => d.status === 'SCHEDULED');

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Drop Events</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Drop Events</h1>

      {activeDrops.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-green-600 mb-4">🔴 Live Now</h2>
          <div className="space-y-3">
            {activeDrops.map((drop) => (
              <Link key={drop.id} href={`/drops/${drop.id}`}>
                <Card className="border-green-200 bg-green-50 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{drop.name}</h3>
                        <p className="text-sm text-gray-600">{drop.seriesName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Limit: {drop.perPersonLimit} per person
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-700">
                          {drop.remainingQuantity}/{drop.totalQuantity} left
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcomingDrops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">⏰ Upcoming</h2>
          <div className="space-y-3">
            {upcomingDrops.map((drop) => (
              <Link key={drop.id} href={`/drops/${drop.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{drop.name}</h3>
                        <p className="text-sm text-gray-500">{drop.seriesName}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {drop.totalQuantity} boxes · Max {drop.perPersonLimit}/person
                        </p>
                      </div>
                      <CountdownTimer targetDate={drop.startsAt} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {drops.length === 0 && (
        <p className="text-gray-500 text-center py-16">No drop events right now. Check back soon!</p>
      )}
    </div>
  );
}
