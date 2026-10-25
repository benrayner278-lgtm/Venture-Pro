'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const EXAMPLES = [
  { label: 'Studio portfolio', bg: '#05070d', fg: '#60a5fa', text: '#e5e7eb' },
  { label: 'SaaS launch page', bg: '#faf7f2', fg: '#1c1917', text: '#1c1917' },
  { label: 'Engineering firm', bg: '#000000', fg: '#facc15', text: '#ffffff' },
  { label: 'Consultancy', bg: '#ffffff', fg: '#111111', text: '#111111' },
  { label: 'Coffee shop', bg: '#2a1f17', fg: '#f59e0b', text: '#fdf6ec' },
  { label: 'Workshop booking', bg: '#0b1020', fg: '#a78bfa', text: '#e5e7eb' },
];

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

const PLANS = [
  { name: 'Standard', price: '£30', description: 'For a single business with its own website.', features: ['100 chatbot messages a day', 'Hosting for 1 website', 'Website editing tools'], featured: false },
  { name: 'Premium', price: '£45', description: 'For founders who want to show their work.', features: ['500 chatbot messages a day', 'Portfolio maker', 'Hosting for 1 website'], featured: true },
  { name: 'Business', price: '£60', description: 'For growing businesses that take bookings.', features: ['1,000 chatbot messages a day', 'Everything in Premium', 'Hosting for 3 websites', 'Custom booking system (coming soon)'], featured: false },
  { name: 'Corporate', price: '£179.99', description: 'For teams running several sites.', features: ['Up to 5 websites', 'Everything in Business', 'Custom booking system (coming soon)'], featured: false },
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
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-white via-zinc-300 to-zinc-500 shadow-[0_0_20px_-4px_rgba(255,255,255,0.5)]">
              <span className="h-2.5 w-2.5 rounded-full bg-black" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Venture-Pro</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#examples" className="transition hover:text-white">Examples</a>
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

      <section id="examples" className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-medium text-zinc-500">Examples</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Made in a few minutes. Styled your way.</h2>
          <p className="mt-3 max-w-2xl text-zinc-400">Every site starts from your brief, then you choose from five looks and shuffle the layout until it feels right.</p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLES.map((example) => (
              <div key={example.label} className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-950 transition hover:border-white/25">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                  <span className="h-2 w-2 rounded-full bg-zinc-700" />
                </div>
                <div className="p-5" style={{ background: example.bg, color: example.text, minHeight: 220 }}>
                  <div className="h-2.5 w-14 rounded-full" style={{ background: example.fg }} />
                  <div className="mt-6 h-5 w-3/4 rounded" style={{ background: example.text, opacity: 0.9 }} />
                  <div className="mt-2 h-5 w-1/2 rounded" style={{ background: example.text, opacity: 0.9 }} />
                  <div className="mt-5 h-2 w-full rounded" style={{ background: example.text, opacity: 0.25 }} />
                  <div className="mt-2 h-2 w-5/6 rounded" style={{ background: example.text, opacity: 0.25 }} />
                  <div className="mt-6 flex gap-2">
                    <div className="h-8 w-24 rounded-md" style={{ background: example.fg }} />
                    <div className="h-8 w-20 rounded-md border" style={{ borderColor: example.text, opacity: 0.4 }} />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm text-zinc-400">
                  <span>{example.label}</span>
                  <span className="text-zinc-600 transition group-hover:text-white">View</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 border-t border-white/[0.08] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-medium text-zinc-500">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Everything the early stages need, in one place.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-black p-8">
                <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{feature.body}</p>
              </div>
            ))}
          </div>
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
          <div className="flex gap-6">
            <Link href="/login" className="transition hover:text-white">Log in</Link>
            <Link href="/signup" className="transition hover:text-white">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
