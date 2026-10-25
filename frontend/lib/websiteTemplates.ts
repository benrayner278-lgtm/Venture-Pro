type Item = { title: string; description: string };

type SectionShape =
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

// The layout the AI chose for this section. It is one of the layouts for the section's type.
export type WebsiteSection = SectionShape & { layout?: string };

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

export type StyleSettings = {
  headingFont?: string | null;
  bodyFont?: string | null;
  headingCase?: 'preset' | 'none' | 'uppercase' | 'capitalize';
  gradient?: { enabled: boolean; from: string; to: string; angle: number };
  brightness?: number;
  contrast?: number;
  saturation?: number;
  // 0 is very rounded, 100 is square-cornered. Null keeps the preset's corners.
  corners?: number | null;
  // Space between sections, as a percentage of the preset's spacing.
  spacing?: number;
};

export type DesignBrief = {
  effect?: 'none' | 'reveal' | 'stack';
  key?: string;
  mood?: string;
  palette?: { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string; border: string };
  fonts?: { heading: string | null; body: string | null };
  headingCase?: 'none' | 'uppercase' | 'capitalize';
  headingWeight?: number;
  radius?: number;
  density?: 'airy' | 'balanced' | 'dense';
};

export type WebsiteContent = {
  brand: { name: string; tagline: string };
  nav?: string[];
  sections: WebsiteSection[];
  footer: { note: string };
  // The AI's design brief. Palette and fonts are cleared when the owner picks a preset instead.
  design?: DesignBrief;
  // Set by the owner in the builder. The AI never changes these.
  contact?: ContactDetails;
  portfolio?: Portfolio;
  style?: StyleSettings;
};

// Keep in step with MAX_PHOTOS in backend/controllers/sitesController.js.
export const MAX_PHOTOS = 8;

// Keys must match FONTS in backend/lib/styleOptions.js. Null means the preset's own font.
export const FONT_OPTIONS: { key: string; label: string }[] = [
  { key: 'system', label: 'System default' },
  { key: 'georgia', label: 'Georgia (classic serif)' },
  { key: 'inter', label: 'Inter (clean sans)' },
  { key: 'montserrat', label: 'Montserrat (geometric)' },
  { key: 'poppins', label: 'Poppins (friendly)' },
  { key: 'nunito', label: 'Nunito (rounded)' },
  { key: 'space', label: 'Space Grotesk (technical)' },
  { key: 'oswald', label: 'Oswald (condensed)' },
  { key: 'bebas', label: 'Bebas Neue (poster)' },
  { key: 'playfair', label: 'Playfair Display (elegant serif)' },
  { key: 'lora', label: 'Lora (book serif)' },
  { key: 'merriweather', label: 'Merriweather (readable serif)' },
  { key: 'dmserif', label: 'DM Serif Display (bold serif)' },
  { key: 'mono', label: 'Roboto Mono (monospace)' },
];

export const HEADING_CASE_OPTIONS: { value: StyleSettings['headingCase']; label: string }[] = [
  { value: 'preset', label: 'Preset default' },
  { value: 'none', label: 'Normal' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'capitalize', label: 'Capitalise Each Word' },
];

export const DEFAULT_STYLE: StyleSettings = {
  headingFont: null,
  bodyFont: null,
  headingCase: 'preset',
  gradient: { enabled: false, from: '#1e3a8a', to: '#0f172a', angle: 135 },
  brightness: 100,
  contrast: 100,
  saturation: 100,
  corners: null,
  spacing: 100,
};

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
