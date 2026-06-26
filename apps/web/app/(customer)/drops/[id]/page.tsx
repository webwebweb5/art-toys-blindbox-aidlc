'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { connectSocket, disconnectSocket, onEvent, emitEvent } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from '@/components/drops/countdown-timer';
import { QueuePosition } from '@/components/drops/queue-position';

interface DropDetail {
  id: string;
  name: string;
  seriesId: string;
  seriesName: string;
  startsAt: string;
  endsAt: string | null;
  totalQuantity: number;
  remainingQuantity: number;
  perPersonLimit: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
}

export default function DropDetailPage() {
  const params = useParams();
  const router = useRouter();
  useRequireAuth();
  const [drop, setDrop] = useState<DropDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inQueue, setInQueue] = useState(false);
  const [position, setPosition] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [purchaseWindowOpen, setPurchaseWindowOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchDrop() {
      try {
        const res = await apiClient.get<DropDetail>(`/api/v1/drop-events/${params.id}`);
        setDrop(res.data);
      } catch (error) {
        console.error('Failed to load drop:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDrop();
  }, [params.id]);

  useEffect(() => {
    if (!drop || drop.status !== 'ACTIVE') return;

    const socket = connectSocket();

    const unsubPosition = onEvent<{ position: number; estimatedWaitSeconds: number }>(
      'queue:position',
      (data) => {
        setPosition(data.position);
        setEstimatedWait(data.estimatedWaitSeconds);
      },
    );

    const unsubWindow = onEvent<{ dropId: string }>(
      'queue:purchase-window',
      (data) => {
        if (data.dropId === drop.id) {
          setPurchaseWindowOpen(true);
        }
      },
    );

    return () => {
      unsubPosition();
      unsubWindow();
      disconnectSocket();
    };
  }, [drop]);

  const handleJoinQueue = async () => {
    if (!drop) return;
    setJoining(true);
    try {
      await apiClient.post(`/api/v1/drop-events/${drop.id}/queue`);
      setInQueue(true);
      emitEvent('queue:join', { dropId: drop.id });
    } catch (error) {
      console.error('Failed to join queue:', error);
    } finally {
      setJoining(false);
    }
  };

  const handlePurchase = () => {
    if (!drop) return;
    router.push(`/purchase?seriesId=${drop.seriesId}&quantity=1&dropId=${drop.id}`);
  };

  if (loading || !drop) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{drop.name}</CardTitle>
          <p className="text-gray-500">{drop.seriesName}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {drop.status === 'SCHEDULED' && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Starts in</p>
              <div className="flex justify-center">
                <CountdownTimer targetDate={drop.startsAt} />
              </div>
            </div>
          )}

          {drop.status === 'ACTIVE' && !inQueue && !purchaseWindowOpen && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-bold text-lg">🔴 Drop is Live!</p>
              <p className="text-sm text-gray-600">
                {drop.remainingQuantity} of {drop.totalQuantity} remaining
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={handleJoinQueue}
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Queue'}
              </Button>
            </div>
          )}

          {drop.status === 'ACTIVE' && inQueue && !purchaseWindowOpen && (
            <div className="space-y-4">
              <QueuePosition position={position} estimatedWaitSeconds={estimatedWait} />
              <p className="text-center text-sm text-gray-500">
                Please keep this page open. You&apos;ll be notified when it&apos;s your turn.
              </p>
            </div>
          )}

          {purchaseWindowOpen && (
            <div className="text-center space-y-4">
              <p className="text-xl font-bold text-green-600">🎉 It&apos;s your turn!</p>
              <p className="text-sm text-gray-600">
                You have a limited time to complete your purchase.
              </p>
              <Button className="w-full" size="lg" onClick={handlePurchase}>
                Purchase Now (max {drop.perPersonLimit})
              </Button>
            </div>
          )}

          {drop.status === 'ENDED' && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🏁</p>
              <p className="text-gray-500 font-medium">This drop has ended.</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total boxes</span>
              <span>{drop.totalQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Per person limit</span>
              <span>{drop.perPersonLimit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining</span>
              <span className="font-bold">{drop.remainingQuantity}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
