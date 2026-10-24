'use client';

import { useRef, useState } from 'react';
import { ContactDetails, MAX_PHOTOS, Portfolio, PortfolioItem } from '@/lib/websiteTemplates';
import { compressPhoto } from '@/lib/imageUpload';

const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500';

const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';

export function ContactEditor({ value, onChange }: { value: ContactDetails; onChange: (next: ContactDetails) => void }) {
  const field = (name: keyof ContactDetails, label: string, placeholder: string) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        value={value[name] || ''}
        onChange={(e) => onChange({ ...value, [name]: e.target.value })}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-white">Contact details</h2>
        <p className="text-sm text-gray-400 mt-1">
          These appear on your contact section and in the footer. Leave a field blank to hide it.
        </p>
      </div>
      {field('email', 'Email', 'hello@yourbusiness.com')}
      {field('phone', 'Phone', '+44 20 1234 5678')}
      {field('address', 'Address', '12 High Street, London')}
      {field('hours', 'Opening hours', 'Mon to Fri, 9am to 5pm')}
    </div>
  );
}

const photoTitle = (fileName: string) => fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80) || 'Photo';

export function PortfolioEditor({ value, onChange }: { value: Portfolio; onChange: (next: Portfolio) => void }) {
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setItems = (items: PortfolioItem[]) => onChange({ ...value, items });

  const updateItem = (index: number, patch: Partial<PortfolioItem>) =>
    setItems(value.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeItem = (index: number) => setItems(value.items.filter((_, i) => i !== index));

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - value.items.length;
    if (room <= 0) {
      setMessage(`You can add up to ${MAX_PHOTOS} photos. Remove one to add another.`);
      return;
    }
    const chosen = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, room);
    if (chosen.length === 0) {
      setMessage('Please choose image files (JPEG, PNG or WebP).');
      return;
    }
    setAdding(true);
    setMessage('');
    const added: PortfolioItem[] = [];
    for (const file of chosen) {
      try {
        const image = await compressPhoto(file);
        added.push({ title: photoTitle(file.name), description: '', tag: 'Project', image });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not add that photo.');
      }
    }
    setAdding(false);
    if (added.length > 0) {
      setItems([...value.items, ...added]);
      if (chosen.length < files.length) {
        setMessage(`Added ${added.length} photo${added.length === 1 ? '' : 's'}. You can add up to ${MAX_PHOTOS} in total.`);
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-white">Portfolio and photos</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add photos of your work, then describe each one. Removing every item hides the portfolio section.
        </p>
      </div>

      <div>
        <label className={labelClass}>Section title</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Our work"
          className={inputClass}
        />
      </div>

      <div
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addPhotos(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] px-6 py-8 text-center transition"
      >
        <p className="text-sm text-gray-200 font-medium">{adding ? 'Adding photos...' : 'Drop photos here, or click to choose them'}</p>
        <p className="text-xs text-gray-500 mt-1">
          JPEG, PNG or WebP. Up to {MAX_PHOTOS} photos. Large photos are resized automatically.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </div>

      {message && <p className="text-sm text-amber-300">{message}</p>}

      <div className="space-y-4">
        {value.items.length === 0 && <p className="text-sm text-gray-500">No portfolio items yet.</p>}
        {value.items.map((item, index) => (
          <div key={index} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="w-24 h-20 shrink-0 overflow-hidden rounded-lg bg-white/[0.06] flex items-center justify-center">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-gray-500 px-2 text-center">No photo</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                placeholder="Project name"
                className={inputClass}
              />
              <textarea
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="What was made, for whom, and anything notable"
                className={`${inputClass} resize-none h-20`}
              />
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={item.tag || ''}
                  onChange={(e) => updateItem(index, { tag: e.target.value })}
                  placeholder="Tag, e.g. Steel"
                  className={`${inputClass} py-2 max-w-[12rem]`}
                />
                <button type="button" onClick={() => removeItem(index)} className="text-xs text-gray-500 hover:text-red-400">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
