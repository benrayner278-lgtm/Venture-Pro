// A slow-moving strip of things Venture-Pro makes, each shown as the request that started it and a small preview.
// Pure CSS, so it needs no client-side code. The motion stops for visitors who ask for reduced motion.

type Kind = 'plan' | 'site' | 'logo' | 'bookings' | 'email' | 'terms';
type Tone = { card: string; ink: string };

const TONES: Record<string, Tone> = {
  tomato: { card: '#ef6b4a', ink: '#2a0f08' },
  sage: { card: '#a8d5a2', ink: '#12260f' },
  sky: { card: '#8fc1ef', ink: '#0b1f38' },
  butter: { card: '#f7d25e', ink: '#2b2105' },
  plum: { card: '#6d3f78', ink: '#f8ecf7' },
  ink: { card: '#1f1d1a', ink: '#f3ede2' },
};

type Item = { prompt: string; kind: Kind; tone: keyof typeof TONES };

const ITEMS: Item[] = [
  { prompt: 'Write a business plan for a coffee cart.', kind: 'plan', tone: 'butter' },
  { prompt: 'Build a website for my photography studio.', kind: 'site', tone: 'sky' },
  { prompt: 'Design a logo for a bakery.', kind: 'logo', tone: 'tomato' },
  { prompt: 'Let clients book my pilates classes.', kind: 'bookings', tone: 'sage' },
  { prompt: 'Draft a welcome email for new customers.', kind: 'email', tone: 'plum' },
  { prompt: 'Write terms for my online shop.', kind: 'terms', tone: 'ink' },
];

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`h-2 rounded-full bg-current opacity-25 ${className}`} />
);

const Solid = ({ className = '' }: { className?: string }) => (
  <div className={`h-2 rounded-full bg-current opacity-60 ${className}`} />
);

const Preview = ({ kind }: { kind: Kind }) => {
  if (kind === 'plan') {
    return (
      <div className="space-y-4 p-5">
        <Solid className="h-2.5 w-2/3" />
        {['Market', 'Offer', 'Revenue'].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-16 font-mono text-[10px] uppercase tracking-wide opacity-70">{label}</span>
            <div className="h-2 flex-1 rounded-full bg-current opacity-15">
              <div className="h-2 rounded-full bg-current" style={{ width: `${[72, 55, 88][i]}%` }} />
            </div>
          </div>
        ))}
        <div className="flex h-16 items-end gap-1.5 pt-2">
          {[30, 45, 38, 60, 52, 78, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-current opacity-40" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'site') {
    return (
      <div className="p-3">
        <div className="overflow-hidden rounded-lg border border-current/20 bg-white/40">
          <div className="flex items-center gap-1.5 border-b border-current/15 px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
          </div>
          <div className="space-y-3 p-4">
            <Solid className="h-3 w-3/4" />
            <Bar className="w-full" />
            <Bar className="w-5/6" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="aspect-square rounded bg-current opacity-20" />
              <div className="aspect-square rounded bg-current opacity-20" />
              <div className="aspect-square rounded bg-current opacity-20" />
            </div>
            <div className="mt-3 h-6 w-20 rounded-full bg-current" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'logo') {
    return (
      <div className="flex flex-col items-center gap-5 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-current text-3xl font-semibold">
          <span style={{ color: '#fff7f0' }}>B</span>
        </div>
        <Solid className="h-2.5 w-28" />
        <div className="flex gap-2">
          {['#fff7f0', '#2a0f08', '#f7d25e', '#8fc1ef'].map((c) => (
            <span key={c} className="h-5 w-5 rounded-full border border-current/30" style={{ background: c }} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'bookings') {
    const booked = new Set([3, 7, 8, 14, 19, 21, 26]);
    return (
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <Solid className="h-2.5 w-24" />
          <span className="font-mono text-[10px] opacity-70">Mon–Sun</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded ${booked.has(i) ? 'bg-current' : 'bg-current opacity-15'}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-current/25 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-current" />
          <Bar className="h-2 w-28" />
        </div>
      </div>
    );
  }

  if (kind === 'email') {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-current/20 bg-white/40 p-4">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-full bg-current" />
            <div className="space-y-1.5">
              <Solid className="h-2 w-20" />
              <Bar className="h-1.5 w-14" />
            </div>
          </div>
          <Solid className="mb-3 h-2.5 w-3/4" />
          <Bar className="mb-2 w-full" />
          <Bar className="mb-2 w-11/12" />
          <Bar className="w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="space-y-3 rounded-lg border border-current/20 bg-white/40 p-5">
        <Solid className="h-2.5 w-1/2" />
        <Bar className="w-full" />
        <Bar className="w-full" />
        <Bar className="w-5/6" />
        <Solid className="mt-4 h-2.5 w-2/5" />
        <Bar className="w-full" />
        <Bar className="w-11/12" />
        <Bar className="w-3/4" />
      </div>
    </div>
  );
};

const Card = ({ item }: { item: Item }) => {
  const tone = TONES[item.tone];
  return (
    <div className="w-[280px] shrink-0">
      <div
        className="mb-4 ml-auto w-fit max-w-full rounded-2xl rounded-br-sm bg-[#fffdf8] px-4 py-2.5 text-sm font-medium text-[#1d1a16] shadow-[0_6px_18px_-10px_rgba(29,26,22,0.45)]"
      >
        {item.prompt}
      </div>
      <div className="overflow-hidden rounded-2xl" style={{ background: tone.card, color: tone.ink }}>
        <Preview kind={item.kind} />
      </div>
    </div>
  );
};

export default function MakeStrip() {
  // The list is repeated so the loop joins up seamlessly.
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="make-strip relative overflow-hidden py-2">
      <div className="make-strip-track flex w-max gap-6 pr-6">
        {loop.map((item, index) => (
          <Card key={`${item.kind}-${index}`} item={item} />
        ))}
      </div>
      <style>{`
        .make-strip-track { animation: make-strip-scroll 60s linear infinite; }
        .make-strip:hover .make-strip-track { animation-play-state: paused; }
        @keyframes make-strip-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .make-strip-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
