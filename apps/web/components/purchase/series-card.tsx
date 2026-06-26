'use client';

import Link from 'next/link';
import { ImageOff, Boxes } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface SeriesCardProps {
  id: string;
  name: string;
  artist: string;
  pricePerBox: number;
  coverImage: string;
  figureCount: number;
  status: string;
}

export function SeriesCard({ id, name, artist, pricePerBox, coverImage, figureCount }: SeriesCardProps) {
  return (
    <Link href={`/series/${id}`} className="group block">
      <Card className="overflow-hidden border-transparent shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-10 w-10" />
            </div>
          )}

          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />

          {/* figure count badge */}
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 gap-1 bg-white/90 text-foreground backdrop-blur"
          >
            <Boxes className="h-3 w-3" />
            {figureCount}
          </Badge>

          {/* name + artist over image */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="truncate text-lg font-bold drop-shadow">{name}</h3>
            <p className="truncate text-sm text-white/80">{artist}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Price per box</span>
          <span className="text-lg font-bold text-primary">{formatPrice(pricePerBox)}</span>
        </div>
      </Card>
    </Link>
  );
}
