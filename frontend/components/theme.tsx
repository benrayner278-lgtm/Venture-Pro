// Shared look for the signed-in app: a palette, page headers, collapsible sections and form styles.
// Every page uses these, so moving between pages keeps the same feel.
import type { ReactNode } from 'react';

// Text drawn on top of a coloured fill.
export const INK = '#1d1a16';

export const ACCENT = {
  tomato: '#ef6b4a',
  butter: '#f7d25e',
  sage: '#a8d5a2',
  sky: '#8fc1ef',
  lilac: '#c9a0d4',
  peach: '#f6b89a',
} as const;

export type Accent = keyof typeof ACCENT;

// Each area of the app has its own colour. The sidebar and the page header use the same one.
export const NAV_ACCENT: Record<string, Accent> = {
  '/progress': 'butter',
  '/dashboard': 'sky',
  '/website-builder': 'sky',
  '/contact-details': 'sage',
  '/email': 'lilac',
  '/domain': 'peach',
  '/bookings': 'sage',
  '/payments': 'butter',
  '/settings': 'lilac',
  '/shop': 'tomato',
  '/logo-builder': 'tomato',
  '/billing': 'peach',
  '/business-plan': 'butter',
  '/projects': 'sage',
  '/analytics': 'sky',
};

export const inputClass =
  'w-full px-4 py-3 bg-white/[0.05] text-gray-100 rounded-xl border border-white/10 outline-none transition placeholder-gray-500 focus:border-white/50 focus:ring-2 focus:ring-white/20';
export const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2';
export const cardClass = 'rounded-2xl border border-white/10 bg-white/[0.03] p-6';

// A button filled with an area's colour.
export const solidButton = (accent: string) => ({ background: accent, color: INK });

// The top of every signed-in page. Its wash and dot take the page's colour.
export function PageHeader({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: Accent;
  children?: ReactNode;
}) {
  const colour = ACCENT[accent];
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-5 md:px-8"
      style={{ background: `linear-gradient(90deg, ${colour}24 0%, transparent 65%)` }}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colour, boxShadow: `0 0 10px ${colour}` }} />
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-gray-300 md:text-sm">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

// A collapsible, colour-coded section. Native <details> keeps it accessible and needs no state.
export function Section({ title, summary, accent, defaultOpen = false, children }: { title: string; summary: string; accent: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-2xl border" style={{ borderColor: `${accent}59`, background: `${accent}0f` }}>
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: accent }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-0.5 block truncate text-xs" style={{ color: accent }}>
            {summary}
          </span>
        </span>
        <svg className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </summary>
      <div className="space-y-5 border-t px-5 py-5" style={{ borderColor: `${accent}33`, background: '#0b0b0b80' }}>
        {children}
      </div>
    </details>
  );
}

// A selectable card. When picked it takes on the colour.
export function Choice({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col rounded-xl border p-4 text-left transition hover:border-white/40"
      style={active ? { borderColor: accent, background: `${accent}26` } : { borderColor: 'rgba(255,255,255,0.1)' }}
    >
      {children}
    </button>
  );
}
