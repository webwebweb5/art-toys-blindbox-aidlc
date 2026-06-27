'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, History, ImageOff, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { RevealAnimation } from '@/components/reveal/reveal-animation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { rarityStyles, type Rarity } from '@/lib/rarity';

interface PullResult {
  id: string;
  figure: { id: string; name: string; image: string; rarity: Rarity };
}

const rarityRank: Record<Rarity, number> = { COMMON: 0, UNCOMMON: 1, RARE: 2, SECRET: 3 };

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 60 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.6,
        color: ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'][Math.floor(Math.random() * 5)],
        size: 6 + Math.random() * 7,
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute top-[-5%] rounded-sm"
          style={{ left: `${b.left}%`, width: b.size, height: b.size, backgroundColor: b.color }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: b.rot + 360 }}
          transition={{ duration: b.dur, delay: b.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  useRequireAuth();
  const [pulls, setPulls] = useState<PullResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [revealedCurrent, setRevealedCurrent] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchPulls() {
      try {
        const res = await apiClient.get<{
          pulls: Array<{ pullRecordId: string; figure: { name: string; image: string; rarity: Rarity } }>;
        }>(`/api/v1/purchase/${params.orderId}/reveal`);
        if (!active) return;
        setPulls(
          res.data.pulls.map((p) => ({
            id: p.pullRecordId,
            figure: { id: p.pullRecordId, name: p.figure.name, image: p.figure.image, rarity: p.figure.rarity },
          })),
        );
      } catch (error) {
        console.error('Failed to load pull results:', error);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchPulls();
    return () => {
      active = false;
    };
  }, [params.orderId]);

  // When the current box finishes revealing, wait for the user to continue —
  // do NOT auto-advance to the next box.
  const handleRevealComplete = () => {
    setRevealedCurrent(true);
  };

  const goNext = () => {
    if (currentIndex < pulls.length - 1) {
      setCurrentIndex((i) => i + 1);
      setRevealedCurrent(false);
    } else {
      setAllRevealed(true);
    }
  };

  const bestRarity = useMemo<Rarity | null>(() => {
    if (pulls.length === 0) return null;
    return pulls.reduce<Rarity>(
      (best, p) => (rarityRank[p.figure.rarity] > rarityRank[best] ? p.figure.rarity : best),
      'COMMON',
    );
  }, [pulls]);

  const celebrate = allRevealed && bestRarity && rarityRank[bestRarity] >= rarityRank.RARE;

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-4">
        <Skeleton className="h-60 w-60 rounded-3xl" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  if (pulls.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">No pulls found for this order.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {celebrate && <Confetti />}

      {/* Dramatic reveal stage */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-white">
        <div className="mb-4 text-center">
          <p className="text-sm font-medium text-white/60">
            {allRevealed ? 'Complete' : `Opening ${currentIndex + 1} of ${pulls.length}`}
          </p>
        </div>

        {/* progress dots */}
        {pulls.length > 1 && !allRevealed && (
          <div className="mb-2 flex justify-center gap-1.5">
            {pulls.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i < currentIndex ? 'w-4 bg-white/70' : i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/25',
                )}
              />
            ))}
          </div>
        )}

        {!allRevealed ? (
          <>
            <RevealAnimation
              key={currentIndex}
              figure={pulls[currentIndex].figure}
              onComplete={handleRevealComplete}
            />

            <motion.div
              className="mt-2 flex justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={revealedCurrent ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
            >
              {revealedCurrent && (
                <Button
                  size="lg"
                  onClick={goNext}
                  className="bg-white text-slate-900 hover:bg-white/90"
                >
                  {currentIndex < pulls.length - 1 ? (
                    <>
                      Open next box
                      <span className="ml-1 opacity-60">({currentIndex + 2}/{pulls.length})</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    'See results'
                  )}
                </Button>
              )}
            </motion.div>
          </>
        ) : (
          <div className="py-6 text-center">
            <motion.h2
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="text-3xl font-extrabold"
            >
              🎉 All revealed!
            </motion.h2>
            {bestRarity && (
              <p className="mt-1 text-white/70">
                Best pull:{' '}
                <span className={cn('rounded-full px-2 py-0.5 text-sm font-bold', rarityStyles[bestRarity].badge)}>
                  {rarityStyles[bestRarity].label}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary grid + actions */}
      {allRevealed && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className={cn('grid gap-3', pulls.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1')}>
            {pulls.map((pull) => {
              const s = rarityStyles[pull.figure.rarity];
              return (
                <div key={pull.id} className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', s.ring)}>
                  <div className={cn('flex aspect-square items-center justify-center bg-gradient-to-br p-3', s.backdrop)}>
                    {pull.figure.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pull.figure.image} alt={pull.figure.name} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="p-2 text-center">
                    <p className="truncate text-sm font-medium">{pull.figure.name}</p>
                    <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', s.badge)}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={() => router.push('/pickup')}>
              <MapPin className="h-4 w-4" />
              Select Branch for Pickup
            </Button>
            <Button size="lg" variant="outline" className="flex-1" onClick={() => router.push('/history')}>
              <History className="h-4 w-4" />
              View Collection
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
