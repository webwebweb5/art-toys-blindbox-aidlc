'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Plus, ImageOff, Save, Send, Archive, GripVertical } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, formatPrice } from '@/lib/utils';
import { type Rarity } from '@/lib/rarity';

type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface FigureInput {
  id?: string;
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
  status: Status;
  pityThreshold: number;
  pityMultiplier: number;
  figures: FigureInput[];
}

const statusVariant: Record<Status, 'secondary' | 'default' | 'destructive'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  ARCHIVED: 'destructive',
};

function normalizeFigures(figs: FigureInput[]) {
  return JSON.stringify(
    [...figs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({ name: f.name, image: f.image, rarity: f.rarity, probability: Number(f.probability) })),
  );
}

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerBox, setPricePerBox] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [pityThreshold, setPityThreshold] = useState(50);
  const [pityMultiplier, setPityMultiplier] = useState(2);
  const [figures, setFigures] = useState<FigureInput[]>([]);

  const load = async () => {
    try {
      const res = await apiClient.get<SeriesDetail>(`/api/v1/series/${params.id}`);
      const s = res.data;
      setSeries(s);
      setName(s.name);
      setArtist(s.artist);
      setDescription(s.description ?? '');
      setPricePerBox(String(s.pricePerBox));
      setCoverImage(s.coverImage ?? '');
      setPityThreshold(Number(s.pityThreshold ?? 50));
      setPityMultiplier(Number(s.pityMultiplier ?? 2));
      setFigures([...s.figures].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      console.error('Failed to load series:', err);
      toast.error('Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const isDraft = series?.status === 'DRAFT';
  const totalProbability = figures.reduce((sum, f) => sum + (Number(f.probability) || 0), 0);
  const probabilityValid = Math.abs(totalProbability - 100) < 0.01;

  const isDirty = series
    ? name !== series.name ||
      artist !== series.artist ||
      (description || '') !== (series.description || '') ||
      parseFloat(pricePerBox) !== series.pricePerBox ||
      (coverImage || '') !== (series.coverImage || '') ||
      pityThreshold !== series.pityThreshold ||
      pityMultiplier !== series.pityMultiplier ||
      (isDraft && normalizeFigures(figures) !== normalizeFigures(series.figures))
    : false;

  const updateFigure = (idx: number, field: keyof FigureInput, value: string | number) =>
    setFigures(figures.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  const addFigure = () =>
    setFigures([...figures, { name: '', image: '', rarity: 'COMMON', probability: 0, sortOrder: figures.length + 1 }]);
  const removeFigure = (idx: number) => setFigures(figures.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (isDraft && !probabilityValid) {
      toast.error('Figure probabilities must sum to 100%');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        artist,
        description: description || undefined,
        pricePerBox: parseFloat(pricePerBox),
        coverImage: coverImage || undefined,
        pityThreshold,
        pityMultiplier,
      };
      if (isDraft) {
        payload.figures = figures.map((f, i) => ({
          name: f.name,
          image: f.image || undefined,
          rarity: f.rarity,
          probability: Number(f.probability),
          sortOrder: i + 1,
        }));
      }
      await apiClient.patch(`/api/v1/admin/series/${params.id}`, payload);
      toast.success('Saved successfully');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      setBusy(false);
    }
  };

  const handlePublish = () =>
    runAction(async () => {
      await apiClient.patch(`/api/v1/admin/series/${params.id}/publish`);
      await load();
      setBusy(false);
    }, 'Series published');

  const handleArchive = () =>
    runAction(async () => {
      await apiClient.patch(`/api/v1/admin/series/${params.id}/archive`);
      await load();
      setBusy(false);
    }, 'Series archived');

  const handleDelete = () =>
    runAction(async () => {
      await apiClient.delete(`/api/v1/admin/series/${params.id}`);
      router.push('/admin/series');
    }, 'Series deleted');

  if (loading || !series) {
    return (
      <div className="max-w-6xl space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/series')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{series.name}</h1>
            <p className="text-sm text-muted-foreground">Edit series</p>
          </div>
        </div>
        <Badge variant={statusVariant[series.status]}>{series.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: form ───────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Series Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist</Label>
                  <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Box ($)</Label>
                  <Input id="price" type="number" step="0.01" value={pricePerBox} onChange={(e) => setPricePerBox(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pity System</CardTitle>
              <CardDescription>
                After this many pulls without a rare/secret, the rare odds get multiplied.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pityThreshold">Pity threshold (pulls)</Label>
                <Input
                  id="pityThreshold"
                  type="number"
                  min={1}
                  value={pityThreshold}
                  onChange={(e) => setPityThreshold(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pityMultiplier">Pity multiplier (×)</Label>
                <Input
                  id="pityMultiplier"
                  type="number"
                  step="0.1"
                  min={1}
                  max={10}
                  value={pityMultiplier}
                  onChange={(e) => setPityMultiplier(parseFloat(e.target.value) || 1)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Figures ({figures.length})</CardTitle>
                {isDraft && (
                  <span className={cn('text-sm font-medium', probabilityValid ? 'text-green-600' : 'text-destructive')}>
                    {totalProbability.toFixed(1)}% / 100%
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      probabilityValid ? 'bg-green-500' : 'bg-destructive',
                    )}
                    style={{ width: `${Math.min(100, totalProbability)}%` }}
                  />
                </div>
              )}

              {!isDraft && (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Figures are locked because this series is {series.status}. Only DRAFT series can edit figures.
                </p>
              )}

              {figures.map((figure, idx) => {
                const borderColor: Record<Rarity, string> = {
                  COMMON: 'border-l-slate-300',
                  UNCOMMON: 'border-l-emerald-400',
                  RARE: 'border-l-violet-400',
                  SECRET: 'border-l-amber-400',
                };
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex flex-wrap items-end gap-3 rounded-lg border border-l-4 bg-card p-3 shadow-sm',
                      borderColor[figure.rarity],
                    )}
                  >
                    {isDraft && (
                      <span className="hidden self-center text-muted-foreground/40 sm:block">
                        <GripVertical className="h-4 w-4" />
                      </span>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Image</Label>
                      {isDraft ? (
                        <ImageUpload compact value={figure.image} onChange={(url) => updateFigure(idx, 'image', url)} />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {figure.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={figure.image} alt={figure.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-[140px] flex-1 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={figure.name} onChange={(e) => updateFigure(idx, 'name', e.target.value)} disabled={!isDraft} />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs">Rarity</Label>
                      <Select value={figure.rarity} onValueChange={(v) => updateFigure(idx, 'rarity', v)} disabled={!isDraft}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMMON">Common</SelectItem>
                          <SelectItem value="UNCOMMON">Uncommon</SelectItem>
                          <SelectItem value="RARE">Rare</SelectItem>
                          <SelectItem value="SECRET">Secret</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Prob %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={figure.probability}
                        onChange={(e) => updateFigure(idx, 'probability', parseFloat(e.target.value) || 0)}
                        disabled={!isDraft}
                      />
                    </div>
                    {isDraft && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFigure(idx)} disabled={figures.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {isDraft && (
                <Button type="button" variant="outline" onClick={addFigure}>
                  <Plus className="h-4 w-4" />
                  Add Figure
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: sticky summary + actions ──────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted to-muted/40">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ImageOff className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Cover image</Label>
                  <ImageUpload value={coverImage} onChange={setCoverImage} />
                </div>

                <Separator className="my-4" />

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Price</dt>
                    <dd className="font-semibold">{formatPrice(parseFloat(pricePerBox) || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Figures</dt>
                    <dd className="font-semibold">{figures.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Probability</dt>
                    <dd className={cn('font-semibold', probabilityValid ? 'text-green-600' : 'text-destructive')}>
                      {totalProbability.toFixed(1)}%
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <Button className="w-full" onClick={handleSave} disabled={saving || busy || !isDirty}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}
                </Button>

                {series.status === 'DRAFT' && (
                  <Button className="w-full" variant="secondary" onClick={handlePublish} disabled={busy || saving}>
                    <Send className="h-4 w-4" />
                    Publish
                  </Button>
                )}

                {series.status !== 'ARCHIVED' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="outline" disabled={busy || saving}>
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive this series?</AlertDialogTitle>
                        <AlertDialogDescription>
                          It will be hidden from the catalog but its data is preserved. You can still view it here.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="destructive" disabled={busy || saving}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this series permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. Series with existing orders or pulls cannot be deleted — archive them instead.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
