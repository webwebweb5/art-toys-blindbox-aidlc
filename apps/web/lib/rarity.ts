export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';

interface RarityStyle {
  label: string;
  /** badge background + text */
  badge: string;
  /** text color for inline use */
  text: string;
  /** ring/glow for highlighted displays */
  ring: string;
  /** subtle gradient backdrop for cards */
  backdrop: string;
}

export const rarityStyles: Record<Rarity, RarityStyle> = {
  COMMON: {
    label: 'Common',
    badge: 'bg-slate-100 text-slate-600',
    text: 'text-slate-500',
    ring: 'ring-1 ring-slate-200',
    backdrop: 'from-slate-50 to-slate-100',
  },
  UNCOMMON: {
    label: 'Uncommon',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-600',
    ring: 'ring-2 ring-emerald-300',
    backdrop: 'from-emerald-50 to-emerald-100',
  },
  RARE: {
    label: 'Rare',
    badge: 'bg-violet-100 text-violet-700',
    text: 'text-violet-600',
    ring: 'ring-2 ring-violet-400',
    backdrop: 'from-violet-50 to-fuchsia-100',
  },
  SECRET: {
    label: 'Secret',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-600',
    ring: 'ring-2 ring-amber-400',
    backdrop: 'from-amber-50 to-yellow-100',
  },
};
