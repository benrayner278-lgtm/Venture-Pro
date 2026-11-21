'use client';

import { useState, type ReactNode } from 'react';

// A section that opens and closes. Its title stays visible when closed, so the owner can always reopen it.
export default function Collapsible({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-300 transition"
      >
        <span>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}
