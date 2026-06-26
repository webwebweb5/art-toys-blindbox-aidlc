'use client';

import { cn } from '@/lib/utils';

interface FigureDisplayProps {
  name: string;
  image: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';
  className?: string;
}

const rarityConfig = {
  COMMON: { label: 'Common', color: 'bg-gray-100 text-gray-700', glow: '' },
  UNCOMMON: { label: 'Uncommon', color: 'bg-green-100 text-green-700', glow: '' },
  RARE: { label: 'Rare', color: 'bg-purple-100 text-purple-700', glow: 'ring-2 ring-purple-400 animate-shimmer' },
  SECRET: { label: 'Secret', color: 'bg-yellow-100 text-yellow-700', glow: 'ring-2 ring-yellow-400 animate-sparkle' },
};

export function FigureDisplay({ name, image, rarity, className }: FigureDisplayProps) {
  const config = rarityConfig[rarity];

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('rounded-2xl overflow-hidden bg-white p-4', config.glow)}>
        <img
          src={image || '/placeholder-figure.png'}
          alt={name}
          className="w-48 h-48 object-contain"
        />
      </div>
      <h3 className="mt-3 font-bold text-lg">{name}</h3>
      <span className={cn('mt-1 px-3 py-1 rounded-full text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  );
}
