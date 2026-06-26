'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Minus, Plus, Sparkles, ImageOff, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useFetch } from '@/lib/hooks/use-fetch';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, cn } from '@/lib/utils';
import { type Rarity } from '@/lib/rarity';
import { FigurePreview } from '@/components/purchase/figure-preview';

interface Figure {
  id: string;
  name: string;
  image: string;
  rarity: Rarity;
  probability: number;
  sortOrder: number;
}

interface SeriesDetail {
  id: string;
  name: string;
  artist: string;
  description: string | null;
  pricePerBox: number;
  figureCount: number;
  coverImage: string;
  status: string;
  figures: Figure[];
}

const MAX_QTY = 6;

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);

  const { data: series, loading } = useFetch<SeriesDetail>(
    () => apiClient.get<SeriesDetail>(`/api/v1/series/${params.id}`).then((r) => r.data),
    [params.id],
  );

  const handleBuy = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/series/${params.id}`)}`);
      return;
    }
    router.push(`/purchase?seriesId=${series?.id}&quantity=${quantity}`);
  };

  if (loading || !series) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const sortedFigures = [...series.figures].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/series')}>
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Cover */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/40">
          {series.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={series.coverImage} alt={series.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Details + buy panel */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">{series.name}</h1>
          <p className="mt-1 text-muted-foreground">by {series.artist}</p>
          {series.description && (
            <p className="mt-4 leading-relaxed text-muted-foreground">{series.description}</p>
          )}

          <div className="mt-6 flex items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Price / box</p>
              <p className="text-3xl font-extrabold text-primary">{formatPrice(series.pricePerBox)}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Figures</p>
              <p className="text-3xl font-extrabold">{series.figureCount}</p>
            </div>
          </div>

          {/* Buy panel */}
          <Card className="mt-8">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-lg font-bold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(MAX_QTY, quantity + 1))}
                    disabled={quantity >= MAX_QTY}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {quantity === MAX_QTY && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  6-box pull — no duplicate figures guaranteed!
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold">{formatPrice(series.pricePerBox * quantity)}</span>
              </div>

              <Button className="w-full" size="lg" onClick={handleBuy}>
                {isAuthenticated ? `Buy ${quantity} Box${quantity > 1 ? 'es' : ''}` : 'Sign in to buy'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Possible figures */}
      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Possible Figures</h2>
          <span className="text-sm text-muted-foreground">{sortedFigures.length} in this series</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sortedFigures.map((figure) => (
            <FigurePreview
              key={figure.id}
              name={figure.name}
              image={figure.image}
              rarity={figure.rarity}
              probability={figure.probability}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
