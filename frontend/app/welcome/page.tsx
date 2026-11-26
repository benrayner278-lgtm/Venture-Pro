'use client';

import Link from 'next/link';
import { markWelcomed } from '@/lib/welcome';

const AREAS = [
  { title: 'Plan your idea', body: 'Talk it through with the assistant. It asks the questions a bank or a friend would, and saves a plan you can return to.', href: '/dashboard', cta: 'Open Chat' },
  { title: 'Build your website', body: 'Choose a look, describe your business, then check every section before it goes live on your own address.', href: '/website-builder', cta: 'Build a website' },
  { title: 'Sell and book', body: 'Add products, classes and bookings to one basket. Customers pay you by card, straight to your own bank.', href: '/shop', cta: 'Open your shop' },
  { title: 'Look after it', body: 'Business email, your own domain, contact details and billing, all in one place.', href: '/progress', cta: 'See your progress' },
];

const STEPS = [
  { n: '01', title: 'Describe it', body: 'Tell the assistant what you do, in your own words.' },
  { n: '02', title: 'Check it', body: 'Review the draft. Nothing goes live until you approve it.' },
  { n: '03', title: 'Share it', body: 'Publish, copy your link and send it to customers.' },
];

export default function WelcomePage() {
  const finish = () => markWelcomed();

  return (
    <div className="min-h-screen app-bg px-4 py-14 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-zinc-500">Welcome</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Here is how Venture-Pro works.</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          You do not need to know anything about websites or payments. Start with your idea, and the assistant guides you through the rest.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {AREAS.map((area, index) => (
            <div
              key={area.title}
              className={`flex flex-col rounded-2xl border border-white/10 bg-zinc-950 p-7 ${index === 0 ? 'md:col-span-2' : ''}`}
            >
              <h2 className="text-xl font-semibold tracking-tight">{area.title}</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-zinc-400">{area.body}</p>
              <Link href={area.href} onClick={finish} className="mt-6 self-start text-sm font-medium text-white underline underline-offset-4 hover:text-zinc-300">
                {area.cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 border-t border-white/[0.08] pt-12 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span className="font-mono text-sm text-zinc-500">{step.n}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link href="/dashboard" onClick={finish} className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200">
            Start with my idea
          </Link>
          <Link href="/progress" onClick={finish} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/5">
            Show me my progress
          </Link>
        </div>
      </div>
    </div>
  );
}
