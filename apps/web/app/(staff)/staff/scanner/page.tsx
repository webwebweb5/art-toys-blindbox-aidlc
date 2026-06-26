'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VoucherValidation {
  valid: boolean;
  voucherId: string;
  figureName: string;
  figureImage: string;
  customerName: string;
  status: string;
  message?: string;
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<VoucherValidation | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);

  const startScanner = async () => {
    setScanResult(null);
    setConfirmed(false);
    setError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await scanner.stop();
          setScanning(false);
          await validateVoucher(decodedText);
        },
        () => {},
      );
    } catch (err) {
      setScanning(false);
      setError('Camera access denied or not available.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch (e) { /* already stopped */ }
    }
    setScanning(false);
  };

  const validateVoucher = async (qrToken: string) => {
    try {
      const res = await apiClient.post<VoucherValidation>('/api/v1/vouchers/validate', { qrToken });
      setScanResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to validate voucher');
    }
  };

  const handleConfirmPickup = async () => {
    if (!scanResult) return;
    setConfirming(true);
    try {
      await apiClient.post(`/api/v1/vouchers/${scanResult.voucherId}/redeem`);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm pickup');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">QR Voucher Scanner</h1>

      {!scanning && !scanResult && (
        <div className="text-center">
          <Button size="lg" onClick={startScanner}>Start Scanning</Button>
        </div>
      )}

      {scanning && (
        <div className="space-y-4">
          <div id="qr-reader" className="rounded-xl overflow-hidden" />
          <Button variant="outline" className="w-full" onClick={stopScanner}>Cancel</Button>
        </div>
      )}

      {error && (
        <Card className="mt-4 border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => setError(null)}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {scanResult && (
        <Card className={cn('mt-4', scanResult.valid ? 'border-green-200' : 'border-red-200')}>
          <CardHeader>
            <CardTitle className={scanResult.valid ? 'text-green-700' : 'text-red-700'}>
              {scanResult.valid ? '✓ Valid Voucher' : '✗ Invalid Voucher'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={scanResult.figureImage || '/placeholder-figure.png'} alt={scanResult.figureName} className="w-20 h-20 rounded-lg object-contain bg-gray-50" />
              <div>
                <p className="font-semibold">{scanResult.figureName}</p>
                <p className="text-sm text-gray-500">Customer: {scanResult.customerName}</p>
                <p className="text-xs text-gray-400">Status: {scanResult.status}</p>
              </div>
            </div>
            {scanResult.valid && !confirmed && (
              <Button className="w-full" size="lg" onClick={handleConfirmPickup} disabled={confirming}>
                {confirming ? 'Confirming...' : 'Confirm Pickup'}
              </Button>
            )}
            {confirmed && (
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-green-700 font-bold text-lg">✓ Pickup Confirmed!</p>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={startScanner}>Scan Another</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
