'use client';

import { PackageOpen } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useFetch } from '@/lib/hooks/use-fetch';
import { SeriesCard } from '@/components/purchase/series-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Series {
  id: string;
  name: string;
  artist: string;
  pricePerBox: number;
  coverImage: string;
  figureCount: number;
  status: string;
}

export default function SeriesCatalogPage() {
  const { data, loading } = useFetch<Series[]>(
    () => apiClient.get<Series[]>('/api/v1/series', { status: 'PUBLISHED' }).then((r) => r.data),
    [],
  );
  const series = data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="bg-gradient-to-r from-primary to-accent-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Series Catalog
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Discover exclusive Art Toys series. Pull a blind box and reveal your figure.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <PackageOpen className="mb-4 h-14 w-14 text-muted-foreground/50" />
          <p className="text-lg font-medium">No series available yet</p>
          <p className="text-sm text-muted-foreground">Check back soon for new drops.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {series.map((s) => (
            <SeriesCard key={s.id} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
