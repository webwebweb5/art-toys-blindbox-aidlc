'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, cn } from '@/lib/utils';

interface DropEvent {
  id: string;
  name: string;
  seriesName: string;
  startsAt: string;
  totalQuantity: number;
  remainingQuantity: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<DropEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await apiClient.get<DropEvent[]>('/api/v1/drop-events');
        setEvents(res.data);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const statusColors = { SCHEDULED: 'bg-blue-100 text-blue-700', ACTIVE: 'bg-green-100 text-green-700', ENDED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Drop Events</h1>
        <Link href="/admin/events/new"><Button>Create Event</Button></Link>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Series</th><th className="text-center px-4 py-3">Start</th><th className="text-center px-4 py-3">Stock</th><th className="text-center px-4 py-3">Status</th></tr></thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{event.name}</td>
                    <td className="px-4 py-3 text-gray-500">{event.seriesName}</td>
                    <td className="px-4 py-3 text-center text-xs">{formatDateTime(event.startsAt)}</td>
                    <td className="px-4 py-3 text-center">{event.remainingQuantity}/{event.totalQuantity}</td>
                    <td className="px-4 py-3 text-center"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[event.status])}>{event.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
