'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Branch {
  id: string;
  name: string;
  address: string;
  availableStock: number;
}

export default function PickupPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /></div></div>}>
      <PickupContent />
    </Suspense>
  );
}

function PickupContent() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const figureId = searchParams.get('figureId');
  const pullRecordId = searchParams.get('pullRecordId');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await apiClient.get<Branch[]>('/api/v1/branches/available', {
          figureId: figureId || undefined,
        });
        setBranches(res.data);
      } catch (error) {
        console.error('Failed to load branches:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, [figureId]);

  const handleSelectBranch = async (branchId: string) => {
    setSelecting(branchId);
    try {
      const res = await apiClient.post<{ voucherId: string }>('/api/v1/vouchers', {
        pullRecordId,
        branchId,
      });
      router.push(`/pickup/${res.data.voucherId}`);
    } catch (error) {
      console.error('Failed to create voucher:', error);
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Select Pickup Branch</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Select Pickup Branch</h1>
      {branches.length === 0 ? (
        <p className="text-gray-500 text-center py-16">
          No branches with available stock for this figure.
        </p>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">{branch.name}</h3>
                  <p className="text-sm text-gray-500">{branch.address}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {branch.availableStock} in stock
                  </p>
                </div>
                <Button
                  onClick={() => handleSelectBranch(branch.id)}
                  disabled={selecting === branch.id}
                >
                  {selecting === branch.id ? 'Selecting...' : 'Select'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
