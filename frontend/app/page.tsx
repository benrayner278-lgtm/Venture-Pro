'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SpinningGlobe from '../components/SpinningGlobe';
import MakeStrip from '../components/MakeStrip';

const PROMPTS = [
  'A portfolio site for a photography studio',
  'A launch page for a new app',
  'A website for a machining workshop with a gallery',
];

const FEATURES = [
  { title: 'An AI business partner', body: 'Chat through your idea and get clear, specific answers for your situation.' },
  { title: 'Business plans in minutes', body: 'Turn your idea into a structured plan covering market, offer and revenue.' },
  { title: 'Websites, planned for you', body: 'The AI designs each page around your brief, then you style and download it.' },
  { title: 'Legal and email templates', body: 'Start with working drafts for terms, policies and customer emails.' },
];

const STEPS = [
  { n: '01', title: 'Describe it', body: 'Tell us what your business does and what you want to show people.' },
  { n: '02', title: 'Refine it', body: 'Ask for changes in plain language until it reads the way you want.' },
  { n: '03', title: 'Ship it', body: 'Download your site or plan and take it live wherever you host.' },
];

// Keep in step with backend/lib/plans.js.
const PLANS = [
  { name: 'Standard', price: '£29.99', description: 'Your business online, with one live website.', features: ['20 chatbot messages a day', '20 website changes a month', 'Publish 1 live website on your own address', 'AI website design, with fonts, colours and style controls', 'AI logo builder', 'Business plan, email and legal templates'], featured: false },
  { name: 'Premium', price: '£44.99', description: 'Everything in Standard, plus a portfolio to show your work.', features: ['35 chatbot messages a day', '40 website changes a month', 'Publish 1 live website', 'Portfolio maker with photo uploads', 'Online booking and card payments on your website', 'Everything in Standard'], featured: true },
  { name: 'Business', price: '£59.99', description: 'Run up to three live websites.', features: ['45 chatbot messages a day', '60 website changes a month', 'Publish up to 3 live websites', 'Everything in Premium'], featured: false },
  { name: 'Corporate', price: '£179.99', description: 'For teams and brands that need five websites.', features: ['Up to 5 live websites', '100 chatbot messages a day', '150 website changes a month', 'Online booking on every website', 'Everything in Business'], featured: false },
];

const grid = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '72px 72px',
  maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
};

const sans = { fontFamily: "var(--font-inter), system-ui, -apple-system, 'Segoe UI', sans-serif" };

export default function LandingPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [idea, setIdea] = useState('');

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem('token')));
  }, []);

  const startBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(loggedIn ? '/dashboard' : '/signup');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white" style={sans}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px]" style={grid} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

      <nav className="relative z-10 border-b border-white/[0.08] bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/brand/venture-pro-mark-light.svg" width={28} height={28} alt="" className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-tight">Venture-Pro</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {loggedIn ? (
              <Link href="/dashboard" className="rounded-md bg-white px-3.5 py-2 font-medium text-black transition hover:bg-zinc-200">Open app</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 text-zinc-300 transition hover:text-white">Log in</Link>
                <Link href="/signup" className="rounded-md bg-white px-3.5 py-2 font-medium text-black transition hover:bg-zinc-200">Start building</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          AI for founders and small businesses
        </div>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-7xl">
          Build your business,<br />one conversation at a time.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Venture-Pro helps you plan the business, write the copy and build the website, with an AI that designs each page around what you actually do.
        </p>

        <form onSubmit={startBuilding} className="mx-auto mt-12 max-w-2xl rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-left shadow-[0_0_60px_-20px_rgba(255,255,255,0.25)]">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your business or the site you want to build..."
            rows={3}
            className="w-full resize-none bg-transparent px-2 py-1 text-[15px] text-white placeholder-zinc-500 outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">Press start to create your account</span>
            <button type="submit" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
              {loggedIn ? 'Open app' : 'Start building'}
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setIdea(prompt)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/25 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </header>

      <section className="relative z-10 bg-[#f3ede2] py-24 text-[#1d1a16]">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a4a2e]">What you can make</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Ask for it in a sentence.</h2>
          <p className="mt-3 max-w-2xl text-[#4a443c]">Plans, websites, logos, bookings, emails and terms, all started from a plain request.</p>
        </div>
        <div className="mt-12">
          <MakeStrip />
        </div>
      </section>

      <section id="features" className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-medium text-zinc-500">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Everything the early stages need, in one place.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`flex flex-col rounded-2xl border p-8 ${
                  index === 0
                    ? 'border-white bg-white text-black md:col-span-2'
                    : index === 3
                      ? 'border-white/10 bg-zinc-950 md:col-span-2'
                      : 'border-white/10 bg-zinc-950'
                }`}
              >
                <span className={`font-mono text-xs ${index === 0 ? 'text-zinc-500' : 'text-zinc-600'}`}>{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className={`mt-2 max-w-xl leading-relaxed ${index === 0 ? 'text-zinc-700' : 'text-zinc-400'}`}>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reach" className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-zinc-500">Get paid</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Connected to customers all over the world.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-400">
              On Premium and above, your website can take card payments and bookings from customers anywhere. Stripe handles the payments, in the currency your customer pays in.
            </p>
          </div>
          <SpinningGlobe />
        </div>
      </section>

      <section className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span className="font-mono text-sm text-zinc-500">{step.n}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-medium text-zinc-500">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Simple plans, paid monthly.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border p-7 ${plan.featured ? 'border-white/40 bg-white/[0.04]' : 'border-white/10 bg-zinc-950'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  {plan.featured && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-black">Most popular</span>}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-zinc-500">/ month</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={loggedIn ? '/billing' : '/signup'}
                  className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                    plan.featured ? 'bg-white text-black hover:bg-zinc-200' : 'border border-white/10 text-white hover:bg-white/5'
                  }`}
                >
                  {loggedIn ? 'Manage plan' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/[0.08] py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Start with one sentence.</h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">Describe what you are building and let Venture-Pro take it from there.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={loggedIn ? '/dashboard' : '/signup'} className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200">
              {loggedIn ? 'Open app' : 'Start building'}
            </Link>
            <Link href="/login" className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/5">Log in</Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.08] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 md:flex-row">
          <span>© {new Date().getFullYear()} Venture-Pro</span>
          <div className="flex flex-wrap gap-6">
            <Link href="/login" className="transition hover:text-white">Log in</Link>
            <Link href="/signup" className="transition hover:text-white">Sign up</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
            <Link href="/cookies" className="transition hover:text-white">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
