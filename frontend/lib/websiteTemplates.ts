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

export type ContactDetails = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
};

export type PortfolioItem = {
  title: string;
  description: string;
  tag?: string;
  image?: string;
};

export type Portfolio = {
  title: string;
  items: PortfolioItem[];
};

export type WebsiteContent = {
  brand: { name: string; tagline: string };
  nav?: string[];
  sections: WebsiteSection[];
  footer: { note: string };
  design?: { effect?: 'none' | 'reveal' | 'stack'; key?: string };
  // Set by the owner in the builder. The AI never changes these.
  contact?: ContactDetails;
  portfolio?: Portfolio;
};

// Keep in step with MAX_PHOTOS in backend/controllers/sitesController.js.
export const MAX_PHOTOS = 8;

// Ids and names must match backend/lib/designPresets.js. Only the swatch colours are needed here.
export type WebsitePreset = {
  id: string;
  name: string;
  description: string;
  bg: string;
  accent: string;
};

export const WEBSITE_PRESETS: WebsitePreset[] = [
  { id: 'midnight', name: 'Midnight', description: 'Dark with a soft blue glow', bg: '#05070d', accent: '#60a5fa' },
  { id: 'paper', name: 'Paper', description: 'Light and editorial', bg: '#faf7f2', accent: '#1c1917' },
  { id: 'bold', name: 'Bold', description: 'High contrast with large type', bg: '#000000', accent: '#facc15' },
  { id: 'minimal', name: 'Minimal', description: 'Monochrome and clean', bg: '#ffffff', accent: '#111111' },
  { id: 'warm', name: 'Warm', description: 'Earthy and friendly', bg: '#2a1f17', accent: '#f59e0b' },
  { id: 'ink', name: 'Ink', description: 'Pure black with white accents', bg: '#000000', accent: '#ffffff' },
  { id: 'forest', name: 'Forest', description: 'Deep green with mint accents', bg: '#0b1a14', accent: '#34d399' },
  { id: 'blueprint', name: 'Blueprint', description: 'Navy with orange and technical headings', bg: '#0a2540', accent: '#f97316' },
  { id: 'sand', name: 'Sand', description: 'Soft sand with terracotta', bg: '#f3ecdf', accent: '#b45309' },
  { id: 'concrete', name: 'Concrete', description: 'Stark grey with heavy headings', bg: '#e7e5e4', accent: '#1c1917' },
  { id: 'neon', name: 'Neon', description: 'Black with lime highlights', bg: '#0b0b10', accent: '#a3e635' },
  { id: 'ocean', name: 'Ocean', description: 'Airy blue and white', bg: '#f0f9ff', accent: '#0284c7' },
  { id: 'plum', name: 'Plum', description: 'Deep plum with rose accents', bg: '#1a0b1e', accent: '#fb7185' },
  { id: 'rust', name: 'Rust', description: 'Charcoal with copper and bold caps', bg: '#171412', accent: '#d97706' },
];

// Random seed for a new layout. The same seed always gives the same layout for a given preset and content.
export const randomLayoutSeed = () => Math.floor(Math.random() * 2147483646) + 1;
