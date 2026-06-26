'use client';

import { ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { rarityStyles, type Rarity } from '@/lib/rarity';

interface FigurePreviewProps {
  name: string;
  image: string;
  rarity: Rarity;
  probability: number;
}

export function FigurePreview({ name, image, rarity, probability }: FigurePreviewProps) {
  const style = rarityStyles[rarity];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={cn(
            'group cursor-pointer overflow-hidden transition-shadow hover:shadow-md',
            style.ring,
          )}
        >
          <div className={cn('relative aspect-square bg-gradient-to-br p-3', style.backdrop)}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
            <span
              className={cn(
                'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                style.badge,
              )}
            >
              {style.label}
            </span>
            {/* hover hint */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground">
                View
              </span>
            </div>
          </div>
          <CardContent className="p-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, probability)}%` }}
                />
              </div>
              <span className={cn('text-xs font-semibold tabular-nums', style.text)}>
                {probability}%
              </span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className={cn('flex items-center justify-center bg-gradient-to-br p-8', style.backdrop)}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} className="max-h-[60vh] w-auto object-contain" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-muted-foreground/50">
              <ImageOff className="h-16 w-16" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-lg font-bold">{name}</h3>
            <span
              className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', style.badge)}
            >
              {style.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pull rate</p>
            <p className={cn('text-2xl font-extrabold tabular-nums', style.text)}>{probability}%</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
