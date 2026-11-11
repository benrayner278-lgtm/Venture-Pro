import Link from 'next/link';
import type { ReactNode } from 'react';

export const LEGAL_UPDATED = '11 November 2026';

// Shared frame for the privacy, terms and cookie pages.
export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="border-b border-white/[0.08] px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-semibold text-white">Venture-Pro</Link>
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-7">{children}</div>
      </main>

      <footer className="border-t border-white/[0.08] px-6 py-8 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
          <Link href="/terms" className="transition hover:text-white">Terms</Link>
          <Link href="/cookies" className="transition hover:text-white">Cookies</Link>
          <span className="ml-auto">Venture-Pro is run by Benjamin Rayner, sole trader</span>
        </div>
      </footer>
    </div>
  );
}

export const LegalSection = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <section className="space-y-3 pt-4">
    <h2 className="text-lg font-semibold text-white">{heading}</h2>
    {children}
  </section>
);
