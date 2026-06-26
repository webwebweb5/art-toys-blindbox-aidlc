'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SeriesOption { id: string; name: string; }

export default function CreateEventPage() {
  const router = useRouter();
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
  const [seriesId, setSeriesId] = useState('');
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [perPersonLimit, setPerPersonLimit] = useState('2');
  const [earlyAccessMinutes, setEarlyAccessMinutes] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchSeries() {
      try {
        const res = await apiClient.get<SeriesOption[]>('/api/v1/series');
        setSeriesList(res.data);
      } catch (error) {
        console.error('Failed to load series:', error);
      }
    }
    fetchSeries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/drop-events', {
        name,
        seriesId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        totalQuantity: parseInt(totalQuantity),
        perPersonLimit: parseInt(perPersonLimit),
        earlyAccessMinutes: parseInt(earlyAccessMinutes),
      });
      router.push('/admin/events');
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold mb-8">Create Drop Event</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Series</label>
              <select className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} required>
                <option value="">Select series...</option>
                {seriesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Starts At</label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ends At (optional)</label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Qty</label>
                <Input type="number" value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Per Person</label>
                <Input type="number" value={perPersonLimit} onChange={(e) => setPerPersonLimit(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Early Access (min)</label>
                <Input type="number" value={earlyAccessMinutes} onChange={(e) => setEarlyAccessMinutes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Event'}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
