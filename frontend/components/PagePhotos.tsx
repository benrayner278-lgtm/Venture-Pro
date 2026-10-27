'use client';

import { useRef, useState } from 'react';
import { MAX_PHOTOS } from '@/lib/websiteTemplates';
import { compressPhoto } from '@/lib/imageUpload';

// Keys match the backend (img1 to img8). The AI refers to them when it places photos on the page.
const nextKey = (images: Record<string, string>): string | null => {
  for (let n = 1; n <= MAX_PHOTOS; n++) {
    const key = `img${n}`;
    if (!images[key]) return key;
  }
  return null;
};

export function PagePhotos({
  images,
  onChange,
  onPlace,
  disabled,
}: {
  images: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  onPlace: () => void;
  disabled: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const entries = Object.entries(images).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAdding(true);
    setMessage('');
    let next = { ...images };
    for (const file of Array.from(files)) {
      const key = nextKey(next);
      if (!key) {
        setMessage(`You can add up to ${MAX_PHOTOS} photos. Remove one to add another.`);
        break;
      }
      try {
        next = { ...next, [key]: await compressPhoto(file) };
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not add that photo');
      }
    }
    onChange(next);
    setAdding(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const remove = (key: string) => {
    const next = { ...images };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-white">Your photos</p>
          <p className="text-xs text-gray-500">
            {entries.length} of {MAX_PHOTOS} added. Photos are placed where they fit, and gaps get stock photos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={disabled || adding || entries.length >= MAX_PHOTOS}
            className="px-3.5 py-1.5 rounded-lg border border-white/15 text-sm text-gray-200 transition hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add photos'}
          </button>
          <button
            type="button"
            onClick={onPlace}
            disabled={disabled || entries.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-white text-black text-sm font-medium transition hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Place my photos
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {entries.map(([key, src]) => (
            <div key={key} className="relative aspect-square overflow-hidden rounded-lg bg-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={key} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(key)}
                disabled={disabled}
                aria-label={`Remove ${key}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs leading-none transition hover:bg-black disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-amber-300 mt-3">{message}</p>}
    </div>
  );
}
