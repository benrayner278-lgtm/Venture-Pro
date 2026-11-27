// A slow-moving strip of things Venture-Pro makes, each shown as the request that started it and a small preview.
// Pure CSS, so it needs no client-side code. The motion stops for visitors who ask for reduced motion.

type Item = { prompt: string; kind: 'plan' | 'site' | 'logo' | 'bookings' | 'email' | 'terms' };

const ITEMS: Item[] = [
  { prompt: 'Write a business plan for a coffee cart.', kind: 'plan' },
  { prompt: 'Build a website for my photography studio.', kind: 'site' },
  { prompt: 'Design a logo for a bakery.', kind: 'logo' },
  { prompt: 'Let clients book my pilates classes.', kind: 'bookings' },
  { prompt: 'Draft a welcome email for new customers.', kind: 'email' },
  { prompt: 'Write terms for my online shop.', kind: 'terms' },
];

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`h-2 rounded-full bg-white/15 ${className}`} />
);

const Preview = ({ kind }: { kind: Item['kind'] }) => {
  if (kind === 'plan') {
    return (
      <div className="space-y-4 p-5">
        <Bar className="h-2.5 w-2/3 bg-white/40" />
        {['Market', 'Offer', 'Revenue'].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-16 font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-white/70" style={{ width: `${[72, 55, 88][i]}%` }} />
            </div>
          </div>
        ))}
        <div className="flex h-16 items-end gap-1.5 pt-2">
          {[30, 45, 38, 60, 52, 78, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-white/25" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'site') {
    return (
      <div className="p-3">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
          </div>
          <div className="space-y-3 p-4">
            <Bar className="h-3 w-3/4 bg-white/60" />
            <Bar className="w-full" />
            <Bar className="w-5/6" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="aspect-square rounded bg-white/10" />
              <div className="aspect-square rounded bg-white/10" />
              <div className="aspect-square rounded bg-white/10" />
            </div>
            <div className="mt-3 h-6 w-20 rounded-full bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'logo') {
    return (
      <div className="flex flex-col items-center gap-5 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white text-3xl font-semibold text-black">B</div>
        <Bar className="h-2.5 w-28 bg-white/50" />
        <div className="flex gap-2">
          {['bg-white', 'bg-zinc-500', 'bg-zinc-800', 'bg-zinc-300'].map((c) => (
            <span key={c} className={`h-5 w-5 rounded-full border border-white/10 ${c}`} />
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
          <Bar className="h-2.5 w-24 bg-white/40" />
          <span className="font-mono text-[10px] text-zinc-500">Mon–Sun</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded ${booked.has(i) ? 'bg-white' : 'bg-white/[0.07]'}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-white" />
          <Bar className="h-2 w-28" />
        </div>
      </div>
    );
  }

  if (kind === 'email') {
    return (
      <div className="p-5">
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-full bg-white/80" />
            <div className="space-y-1.5">
              <Bar className="h-2 w-20 bg-white/50" />
              <Bar className="h-1.5 w-14" />
            </div>
          </div>
          <Bar className="mb-3 h-2.5 w-3/4 bg-white/60" />
          <Bar className="mb-2 w-full" />
          <Bar className="mb-2 w-11/12" />
          <Bar className="w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="space-y-3 rounded-lg border border-white/10 bg-zinc-900 p-5">
        <Bar className="h-2.5 w-1/2 bg-white/50" />
        <Bar className="w-full" />
        <Bar className="w-full" />
        <Bar className="w-5/6" />
        <Bar className="mt-4 h-2.5 w-2/5 bg-white/50" />
        <Bar className="w-full" />
        <Bar className="w-11/12" />
        <Bar className="w-3/4" />
      </div>
    </div>
  );
};

const Card = ({ item }: { item: Item }) => (
  <div className="w-[280px] shrink-0">
    <div className="mb-4 ml-auto w-fit max-w-full rounded-2xl rounded-br-sm border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-zinc-200">
      {item.prompt}
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <Preview kind={item.kind} />
    </div>
  </div>
);

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
