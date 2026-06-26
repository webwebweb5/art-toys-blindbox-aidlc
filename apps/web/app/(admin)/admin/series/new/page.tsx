'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET';

interface FigureInput {
  name: string;
  rarity: Rarity;
  probability: number;
  image: string;
}

export default function CreateSeriesPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerBox, setPricePerBox] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [figures, setFigures] = useState<FigureInput[]>([
    { name: '', rarity: 'COMMON', probability: 0, image: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const totalProbability = figures.reduce((sum, f) => sum + (Number(f.probability) || 0), 0);
  const probabilityValid = Math.abs(totalProbability - 100) < 0.01;

  const addFigure = () =>
    setFigures([...figures, { name: '', rarity: 'COMMON', probability: 0, image: '' }]);
  const removeFigure = (idx: number) => setFigures(figures.filter((_, i) => i !== idx));
  const updateFigure = (idx: number, field: keyof FigureInput, value: string | number) =>
    setFigures(figures.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probabilityValid) {
      toast.error('Figure probabilities must sum to 100%');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/v1/admin/series', {
        name,
        artist,
        description: description || undefined,
        pricePerBox: parseFloat(pricePerBox),
        coverImage: coverImage || undefined,
        figures: figures.map((f, i) => ({
          name: f.name,
          rarity: f.rarity,
          probability: Number(f.probability),
          image: f.image || undefined,
          sortOrder: i + 1,
        })),
      });
      toast.success('Series created');
      router.push('/admin/series');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create series');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Create Series</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Series Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price per Box ($)</Label>
                <Input id="price" type="number" step="0.01" value={pricePerBox} onChange={(e) => setPricePerBox(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <ImageUpload value={coverImage} onChange={setCoverImage} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Figures</CardTitle>
              <span className={cn('text-sm', probabilityValid ? 'text-green-600' : 'text-destructive')}>
                Total: {totalProbability.toFixed(1)}% {!probabilityValid && '(must = 100%)'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {figures.map((figure, idx) => (
              <div key={idx} className="flex gap-3 items-end border-b pb-3">
                <div className="space-y-1">
                  <Label className="text-xs">Image</Label>
                  <ImageUpload compact value={figure.image} onChange={(url) => updateFigure(idx, 'image', url)} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={figure.name} onChange={(e) => updateFigure(idx, 'name', e.target.value)} required />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Rarity</Label>
                  <Select value={figure.rarity} onValueChange={(v) => updateFigure(idx, 'rarity', v)}>
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
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Prob %</Label>
                  <Input type="number" step="0.1" value={figure.probability} onChange={(e) => updateFigure(idx, 'probability', parseFloat(e.target.value) || 0)} required />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFigure(idx)} disabled={figures.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addFigure}>
              <Plus className="h-4 w-4" />
              Add Figure
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !probabilityValid}>
            {submitting ? 'Creating...' : 'Create Series'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
