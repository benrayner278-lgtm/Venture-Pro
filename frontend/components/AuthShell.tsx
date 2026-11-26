import type { ReactNode } from 'react';
import Link from 'next/link';

export const authInput =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20';
export const authButton =
  'w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50';

// The shared look for sign in and sign up: the brand and what the product does on the left, the form on the right.
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_400px]">
        <div className="hidden md:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-zinc-950 text-sm font-semibold text-white">VP</span>
            <span className="text-lg font-semibold tracking-tight text-white">Venture-Pro</span>
          </Link>
          <h2 className="mt-10 text-4xl font-semibold tracking-tight text-white">Your business, planned and online in one place.</h2>
          <ul className="mt-8 space-y-4 text-zinc-400">
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />Talk through your idea and save a plan.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />Build a website you check before it goes live.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />Sell products, take bookings and get paid straight to your bank.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-[0_0_60px_-20px_rgba(255,255,255,0.25)]">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
        </div>
      </div>
    </div>
  );
}
