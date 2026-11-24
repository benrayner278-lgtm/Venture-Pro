'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const COLOURS = ['#f97316', '#22c55e', '#38bdf8', '#facc15', '#f472b6', '#a78bfa'];
const BURST_MS = 5000;

// A short burst of falling confetti, drawn with CSS only. It stops by itself, and the message stays until dismissed.
export default function Celebration({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  // This component is only shown after a publish, in the browser, so the random pieces are made once here.
  const [pieces] = useState(() =>
    Array.from({ length: 80 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      size: 6 + Math.random() * 6,
    })),
  );
  const [bursting, setBursting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBursting(false), BURST_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6">
      <style>{'@keyframes vp-fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(360px) rotate(540deg);opacity:0}}'}</style>
      {bursting &&
        pieces.map((piece, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 rounded-sm"
            style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * 0.4, background: piece.colour, animation: `vp-fall 2.6s ease-in ${piece.delay}s forwards` }}
          />
        ))}
      <h2 className="text-lg font-semibold text-white">Congratulations, your site is live</h2>
      <p className="mt-1 text-sm text-gray-300">
        Your website is at{' '}
        <a href={url} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">
          {url}
        </a>
        . Next, add your shop or bookings so customers can pay you.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/shop" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200">
          Add your shop
        </Link>
        <Link href="/bookings" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200 hover:bg-white/5">
          Set up bookings
        </Link>
        <button type="button" onClick={onDismiss} className="text-xs text-gray-400 hover:text-white">
          Dismiss
        </button>
      </div>
    </div>
  );
}
