type Item = { title: string; description: string };

export type WebsiteSection =
  | { type: 'hero'; eyebrow?: string; headline: string; subheadline: string; primaryCta: string; secondaryCta?: string }
  | { type: 'text'; title: string; paragraphs: string[] }
  | { type: 'cards'; title: string; intro?: string; items: Item[] }
  | { type: 'steps'; title: string; items: Item[] }
  | { type: 'gallery'; title: string; intro?: string; items: (Item & { tag?: string })[] }
  | { type: 'pricing'; title: string; tiers: { name: string; price: string; description: string; features: string[] }[] }
  | { type: 'faq'; title: string; items: { question: string; answer: string }[] }
  | { type: 'contact'; title: string; body: string; email?: string; phone?: string }
  | { type: 'cta'; headline: string; body?: string; button: string }
  | { type: 'custom'; title?: string; paragraphs: string[] };

export type WebsiteContent = {
  brand: { name: string; tagline: string };
  nav?: string[];
  sections: WebsiteSection[];
  footer: { note: string };
};

export type WebsiteTheme = {
  id: string;
  name: string;
  description: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  font: string;
  radius: string;
  headingWeight: number;
  headingTransform: 'none' | 'uppercase';
};

const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const WEBSITE_THEMES: WebsiteTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark with a soft blue glow',
    bg: '#05070d',
    surface: '#0d1220',
    text: '#e5e7eb',
    muted: '#94a3b8',
    accent: '#60a5fa',
    accentText: '#05070d',
    border: 'rgba(148,163,184,0.18)',
    font: SANS,
    radius: '16px',
    headingWeight: 700,
    headingTransform: 'none',
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Light and editorial',
    bg: '#faf7f2',
    surface: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
    accent: '#1c1917',
    accentText: '#faf7f2',
    border: '#e7e5e4',
    font: SERIF,
    radius: '4px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast with large type',
    bg: '#000000',
    surface: '#111111',
    text: '#ffffff',
    muted: '#a3a3a3',
    accent: '#facc15',
    accentText: '#000000',
    border: '#262626',
    font: SANS,
    radius: '0px',
    headingWeight: 900,
    headingTransform: 'uppercase',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Monochrome and clean',
    bg: '#ffffff',
    surface: '#fafafa',
    text: '#111111',
    muted: '#6b7280',
    accent: '#111111',
    accentText: '#ffffff',
    border: '#e5e7eb',
    font: SANS,
    radius: '10px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Earthy and friendly',
    bg: '#2a1f17',
    surface: '#3a2b20',
    text: '#fdf6ec',
    muted: '#d6c3ab',
    accent: '#f59e0b',
    accentText: '#2a1f17',
    border: 'rgba(253,246,236,0.14)',
    font: "'Trebuchet MS', Arial, sans-serif",
    radius: '20px',
    headingWeight: 700,
    headingTransform: 'none',
  },
];

