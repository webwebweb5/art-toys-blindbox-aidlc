'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  vouchersRedeemed: number;
  topSeries: { name: string; revenue: number }[];
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await apiClient.get<DashboardMetrics>('/api/v1/analytics/dashboard');
        setMetrics(res.data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard title="Total Revenue" value={formatPrice(metrics?.totalRevenue ?? 0)} icon="💰" />
        <MetricCard title="Total Orders" value={String(metrics?.totalOrders ?? 0)} icon="📦" />
        <MetricCard title="Active Users" value={String(metrics?.activeUsers ?? 0)} icon="👥" />
        <MetricCard title="Vouchers Redeemed" value={String(metrics?.vouchersRedeemed ?? 0)} icon="✅" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Series by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.topSeries && metrics.topSeries.length > 0 ? (
            <div className="space-y-3">
              {metrics.topSeries.map((series, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-300">#{idx + 1}</span>
                    <span className="font-medium">{series.name}</span>
                  </div>
                  <span className="font-bold text-primary-500">{formatPrice(series.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
