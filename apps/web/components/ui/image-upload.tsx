'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  /** Compact layout for tight rows (e.g. figure lists). */
  compact?: boolean;
  className?: string;
}

export function ImageUpload({ value, onChange, compact = false, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_BASE}/api/v1/admin/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Upload failed');
      }
      const json = await res.json();
      onChange(json.data.url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const size = compact ? 'w-12 h-12' : 'w-24 h-24';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          size,
          'shrink-0 rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center hover:border-primary-500 transition-colors',
        )}
        title="Click to upload an image"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs text-center px-1">
            {uploading ? '...' : 'Upload'}
          </span>
        )}
      </button>

      {!compact && (
        <div className="flex-1 space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-primary-500 hover:underline"
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : value ? 'Change image' : 'Choose image'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="block text-xs text-gray-400 hover:text-red-500"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
