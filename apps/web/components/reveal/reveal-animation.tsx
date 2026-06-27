'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rarityStyles, type Rarity } from '@/lib/rarity';

interface RevealAnimationProps {
  figure: { name: string; image: string; rarity: Rarity };
  onComplete?: () => void;
}

const fx: Record<Rarity, { glow: string; colors: string[]; rays: boolean; emoji: string }> = {
  COMMON: { glow: 'rgba(148,163,184,0.45)', colors: ['#cbd5e1', '#e2e8f0', '#94a3b8'], rays: false, emoji: '' },
  UNCOMMON: { glow: 'rgba(16,185,129,0.5)', colors: ['#34d399', '#6ee7b7', '#10b981'], rays: false, emoji: '' },
  RARE: { glow: 'rgba(139,92,246,0.6)', colors: ['#a78bfa', '#c4b5fd', '#8b5cf6'], rays: true, emoji: '✦' },
  SECRET: { glow: 'rgba(245,158,11,0.65)', colors: ['#fbbf24', '#fcd34d', '#f59e0b'], rays: true, emoji: '★' },
};

function Particles({ rarity }: { rarity: Rarity }) {
  const conf = fx[rarity];
  const count = rarity === 'SECRET' ? 28 : rarity === 'RARE' ? 22 : 14;
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const dist = 90 + Math.random() * 140;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          color: conf.colors[i % conf.colors.length],
          size: 6 + Math.random() * 8,
          delay: Math.random() * 0.15,
          rot: Math.random() * 360,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rarity],
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: b.size, height: b.size, backgroundColor: b.color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{ x: b.x, y: b.y, opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.6], rotate: b.rot }}
          transition={{ duration: 1.1, delay: b.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function RevealAnimation({ figure, onComplete }: RevealAnimationProps) {
  const [phase, setPhase] = useState<'box' | 'opening' | 'revealed'>('box');
  const conf = fx[figure.rarity];
  const style = rarityStyles[figure.rarity];

  const open = () => {
    setPhase('opening');
    setTimeout(() => {
      setPhase('revealed');
      onComplete?.();
    }, 1300);
  };

  return (
    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'box' && (
          <motion.button
            key="box"
            type="button"
            onClick={open}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -10, 0] }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ opacity: { duration: 0.4 }, y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
            className="group relative cursor-pointer"
          >
            {/* glow */}
            <div className="absolute inset-0 -z-10 rounded-3xl blur-2xl opacity-70"
              style={{ background: conf.glow }} />
            <div className="flex h-60 w-60 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-primary-400 to-accent-500 text-white shadow-2xl transition-transform group-hover:scale-105 group-active:scale-95">
              <span className="text-7xl drop-shadow-lg">🎁</span>
              <span className="mt-2 text-lg font-bold">Tap to open</span>
            </div>
            <motion.span
              className="absolute -right-2 -top-2 text-2xl"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              ✨
            </motion.span>
          </motion.button>
        )}

        {phase === 'opening' && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 0.95, 1.25], rotate: [0, -6, 6, -4, 4, 0], x: [0, -4, 4, -3, 3, 0] }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.3 }}
            className="relative flex h-60 w-60 items-center justify-center rounded-3xl bg-gradient-to-br from-playful-yellow to-playful-pink shadow-2xl"
          >
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={{ boxShadow: [`0 0 0px ${conf.glow}`, `0 0 80px 30px ${conf.glow}`, `0 0 0px ${conf.glow}`] }}
              transition={{ duration: 1.3, repeat: Infinity }}
            />
            <motion.span
              className="text-7xl"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ✨
            </motion.span>
            {/* white flash near the end */}
            <motion.div
              className="absolute inset-0 rounded-3xl bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.9] }}
              transition={{ duration: 1.3, times: [0, 0.75, 1] }}
            />
          </motion.div>
        )}

        {phase === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className="relative flex flex-col items-center"
          >
            {/* radial glow */}
            <div
              className="absolute left-1/2 top-1/3 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: conf.glow }}
            />
            {/* rotating light rays for rare/secret */}
            {conf.rays && (
              <motion.div
                className="absolute left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
                style={{
                  background: `repeating-conic-gradient(${conf.glow} 0deg 8deg, transparent 8deg 22deg)`,
                  maskImage: 'radial-gradient(circle, black 0%, transparent 68%)',
                  WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 68%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              />
            )}

            <Particles rarity={figure.rarity} />

            <motion.div
              className={cn('rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur', style.ring)}
              animate={
                figure.rarity === 'SECRET'
                  ? { scale: [1, 1.02, 1] }
                  : undefined
              }
              transition={{ duration: 2, repeat: Infinity }}
            >
              {figure.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={figure.image} alt={figure.name} className="h-48 w-48 object-contain" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-muted-foreground/40">
                  <ImageOff className="h-16 w-16" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-4 flex flex-col items-center"
            >
              <h3 className="text-xl font-extrabold">{figure.name}</h3>
              <span className={cn('mt-2 rounded-full px-3 py-1 text-sm font-bold', style.badge)}>
                {conf.emoji && <span className="mr-1">{conf.emoji}</span>}
                {style.label}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
