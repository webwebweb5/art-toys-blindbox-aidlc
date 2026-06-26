'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { RevealAnimation } from '@/components/reveal/reveal-animation';
import { Button } from '@/components/ui/button';

interface PullResult {
  id: string;
  figure: {
    id: string;
    name: string;
    image: string;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';
  };
  revealedAt: string | null;
}

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  useRequireAuth();
  const [pulls, setPulls] = useState<PullResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    async function fetchPulls() {
      try {
        const res = await apiClient.get<{
          pulls: Array<{
            pullRecordId: string;
            figure: { name: string; image: string; rarity: PullResult['figure']['rarity'] };
          }>;
        }>(`/api/v1/purchase/${params.orderId}/reveal`);
        setPulls(
          res.data.pulls.map((p) => ({
            id: p.pullRecordId,
            figure: {
              id: p.pullRecordId,
              name: p.figure.name,
              image: p.figure.image,
              rarity: p.figure.rarity,
            },
            revealedAt: null,
          })),
        );
      } catch (error) {
        console.error('Failed to load pull results:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPulls();
  }, [params.orderId]);

  const handleRevealComplete = () => {
    if (currentIndex < pulls.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 2000);
    } else {
      setAllRevealed(true);
    }
  };

  const handleSelectBranch = () => {
    router.push('/pickup');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-center">
          <p className="text-xl text-gray-400">Loading your reveal...</p>
        </div>
      </div>
    );
  }

  if (pulls.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">No pulls found for this order.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">
        {allRevealed ? '🎉 All Revealed!' : `Reveal ${currentIndex + 1} of ${pulls.length}`}
      </h1>

      {!allRevealed && (
        <RevealAnimation
          key={currentIndex}
          figure={pulls[currentIndex].figure}
          onComplete={handleRevealComplete}
        />
      )}

      {allRevealed && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {pulls.map((pull) => (
              <div key={pull.id} className="text-center p-3 rounded-xl bg-white shadow-sm">
                <img
                  src={pull.figure.image || '/placeholder-figure.png'}
                  alt={pull.figure.name}
                  className="w-20 h-20 mx-auto object-contain"
                />
                <p className="text-sm font-medium mt-2">{pull.figure.name}</p>
                <p className="text-xs text-gray-500">{pull.figure.rarity}</p>
              </div>
            ))}
          </div>

          <Button size="lg" className="w-full" onClick={handleSelectBranch}>
            Select Branch for Pickup
          </Button>
        </div>
      )}
    </div>
  );
}
