'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FigureDisplay } from '@/components/purchase/figure-display';
import { cn } from '@/lib/utils';

interface RevealAnimationProps {
  figure: {
    name: string;
    image: string;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';
  };
  onComplete?: () => void;
}

export function RevealAnimation({ figure, onComplete }: RevealAnimationProps) {
  const [phase, setPhase] = useState<'box' | 'opening' | 'revealed'>('box');

  const handleBoxClick = () => {
    setPhase('opening');
    setTimeout(() => {
      setPhase('revealed');
      onComplete?.();
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <AnimatePresence mode="wait">
        {phase === 'box' && (
          <motion.div
            key="box"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0, rotateY: 180 }}
            transition={{ duration: 0.5 }}
            className="cursor-pointer"
            onClick={handleBoxClick}
          >
            <div className="w-64 h-64 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
              <div className="text-center text-white">
                <p className="text-6xl mb-2">🎁</p>
                <p className="font-bold text-lg">Tap to Open!</p>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'opening' && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{
              scale: [1, 1.3, 0.8, 1.5],
              rotate: [0, -10, 10, 0],
            }}
            transition={{ duration: 1.5 }}
            className="w-64 h-64 bg-gradient-to-br from-playful-yellow to-playful-pink rounded-2xl flex items-center justify-center shadow-2xl"
          >
            <p className="text-6xl animate-bounce">✨</p>
          </motion.div>
        )}

        {phase === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className={cn(
              'p-8 rounded-3xl',
              figure.rarity === 'SECRET' && 'bg-gradient-to-br from-yellow-50 to-yellow-100 ring-4 ring-yellow-300',
              figure.rarity === 'RARE' && 'bg-gradient-to-br from-purple-50 to-purple-100 ring-4 ring-purple-300',
              figure.rarity === 'UNCOMMON' && 'bg-gradient-to-br from-green-50 to-green-100',
              figure.rarity === 'COMMON' && 'bg-white',
            )}>
              <FigureDisplay
                name={figure.name}
                image={figure.image}
                rarity={figure.rarity}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
