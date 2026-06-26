'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateBranchPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/branches', {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        operatingHours: {
          monday: { open: '10:00', close: '20:00' },
          tuesday: { open: '10:00', close: '20:00' },
          wednesday: { open: '10:00', close: '20:00' },
          thursday: { open: '10:00', close: '20:00' },
          friday: { open: '10:00', close: '20:00' },
          saturday: { open: '10:00', close: '21:00' },
          sunday: { open: '11:00', close: '19:00' },
        },
      });
      router.push('/admin/branches');
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold mb-8">Create Branch</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Branch Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </CardContent>
        </Card>
        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Branch'}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
