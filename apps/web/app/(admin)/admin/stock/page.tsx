'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StockRecord {
  branchId: string;
  branchName: string;
  figureId: string;
  figureName: string;
  seriesName: string;
  available: number;
  reserved: number;
  pickedUp: number;
}

interface Branch { id: string; name: string; }

export default function AdminStockPage() {
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferFigureId, setTransferFigureId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stockRes, branchRes] = await Promise.all([
          apiClient.get<StockRecord[]>('/api/v1/stock', { branchId: selectedBranch || undefined }),
          apiClient.get<Branch[]>('/api/v1/branches'),
        ]);
        setStock(stockRes.data);
        setBranches(branchRes.data);
      } catch (error) {
        console.error('Failed to load stock:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedBranch]);

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      await apiClient.post('/api/v1/stock/transfer', {
        fromBranchId: transferFrom,
        toBranchId: transferTo,
        figureId: transferFigureId,
        quantity: parseInt(transferQty),
      });
      setShowTransfer(false);
      const res = await apiClient.get<StockRecord[]>('/api/v1/stock', { branchId: selectedBranch || undefined });
      setStock(res.data);
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Stock Management</h1>
        <Button onClick={() => setShowTransfer(!showTransfer)}>{showTransfer ? 'Cancel' : 'Transfer Stock'}</Button>
      </div>

      {showTransfer && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Transfer Stock</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Branch</label>
                <select className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm" value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}>
                  <option value="">Select...</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Branch</label>
                <select className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                  <option value="">Select...</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Figure ID</label>
                <Input value={transferFigureId} onChange={(e) => setTransferFigureId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleTransfer} disabled={transferring}>{transferring ? 'Transferring...' : 'Execute Transfer'}</Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <select className="h-10 rounded-lg border border-gray-300 px-3 text-sm" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="text-left px-4 py-3">Branch</th><th className="text-left px-4 py-3">Figure</th><th className="text-left px-4 py-3">Series</th><th className="text-center px-4 py-3">Available</th><th className="text-center px-4 py-3">Reserved</th><th className="text-center px-4 py-3">Picked Up</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No stock records.</td></tr>
              ) : (
                stock.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{item.branchName}</td>
                    <td className="px-4 py-3 font-medium">{item.figureName}</td>
                    <td className="px-4 py-3 text-gray-500">{item.seriesName}</td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">{item.available}</td>
                    <td className="px-4 py-3 text-center text-yellow-600">{item.reserved}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{item.pickedUp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
