'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';

interface StockItem {
  figureId: string;
  figureName: string;
  seriesName: string;
  available: number;
  reserved: number;
  pickedUp: number;
}

export default function StaffStockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await apiClient.get<StockItem[]>('/api/v1/stock/my-branch');
        setStock(res.data);
      } catch (error) {
        console.error('Failed to load stock:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStock();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Branch Stock</h1>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Branch Stock</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Figure</th>
                <th className="text-left px-4 py-3 font-medium">Series</th>
                <th className="text-center px-4 py-3 font-medium">Available</th>
                <th className="text-center px-4 py-3 font-medium">Reserved</th>
                <th className="text-center px-4 py-3 font-medium">Picked Up</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item) => (
                <tr key={item.figureId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.figureName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.seriesName}</td>
                  <td className="px-4 py-3 text-center font-bold text-green-600">{item.available}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{item.reserved}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{item.pickedUp}</td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No stock records found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
