// Visual presets for generated sites. Keep the ids and names in sync with frontend/lib/websiteTemplates.ts.
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const ROUNDED = "'Trebuchet MS', Arial, sans-serif";
const GROTESK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const PRESETS = [
  { id: 'midnight', name: 'Midnight', description: 'Dark with a soft blue glow', bg: '#05070d', surface: '#0d1220', text: '#e5e7eb', muted: '#94a3b8', accent: '#60a5fa', accentText: '#05070d', border: 'rgba(148,163,184,0.18)', font: SANS, headingFont: SANS, radius: '16px', headingWeight: 700, headingTransform: 'none' },
  { id: 'paper', name: 'Paper', description: 'Light and editorial', bg: '#faf7f2', surface: '#ffffff', text: '#1c1917', muted: '#78716c', accent: '#1c1917', accentText: '#faf7f2', border: '#e7e5e4', font: SERIF, headingFont: SERIF, radius: '4px', headingWeight: 600, headingTransform: 'none' },
  { id: 'bold', name: 'Bold', description: 'High contrast with large type', bg: '#000000', surface: '#111111', text: '#ffffff', muted: '#a3a3a3', accent: '#facc15', accentText: '#000000', border: '#262626', font: SANS, headingFont: SANS, radius: '0px', headingWeight: 900, headingTransform: 'uppercase' },
  { id: 'minimal', name: 'Minimal', description: 'Monochrome and clean', bg: '#ffffff', surface: '#fafafa', text: '#111111', muted: '#6b7280', accent: '#111111', accentText: '#ffffff', border: '#e5e7eb', font: SANS, headingFont: SANS, radius: '10px', headingWeight: 600, headingTransform: 'none' },
  { id: 'warm', name: 'Warm', description: 'Earthy and friendly', bg: '#2a1f17', surface: '#3a2b20', text: '#fdf6ec', muted: '#d6c3ab', accent: '#f59e0b', accentText: '#2a1f17', border: 'rgba(253,246,236,0.14)', font: ROUNDED, headingFont: ROUNDED, radius: '20px', headingWeight: 700, headingTransform: 'none' },
  { id: 'ink', name: 'Ink', description: 'Pure black with white accents', bg: '#000000', surface: '#0a0a0a', text: '#ffffff', muted: '#9ca3af', accent: '#ffffff', accentText: '#000000', border: '#1f1f1f', font: SANS, headingFont: SANS, radius: '999px', headingWeight: 600, headingTransform: 'none' },
  { id: 'forest', name: 'Forest', description: 'Deep green with mint accents', bg: '#0b1a14', surface: '#12281f', text: '#e6f4ee', muted: '#9bb8a9', accent: '#34d399', accentText: '#05140e', border: 'rgba(230,244,238,0.12)', font: SANS, headingFont: SERIF, radius: '12px', headingWeight: 600, headingTransform: 'none' },
  { id: 'blueprint', name: 'Blueprint', description: 'Navy with orange and technical headings', bg: '#0a2540', surface: '#0f3057', text: '#e8f1fb', muted: '#9db7d5', accent: '#f97316', accentText: '#1a0f00', border: 'rgba(232,241,251,0.16)', font: SANS, headingFont: MONO, radius: '0px', headingWeight: 700, headingTransform: 'none' },
  { id: 'sand', name: 'Sand', description: 'Soft sand with terracotta', bg: '#f3ecdf', surface: '#fbf7ef', text: '#2b2118', muted: '#7a6a58', accent: '#b45309', accentText: '#fff7ed', border: '#e2d6c2', font: SERIF, headingFont: SERIF, radius: '12px', headingWeight: 600, headingTransform: 'none' },
  { id: 'concrete', name: 'Concrete', description: 'Stark grey with heavy headings', bg: '#e7e5e4', surface: '#d6d3d1', text: '#1c1917', muted: '#57534e', accent: '#1c1917', accentText: '#e7e5e4', border: '#a8a29e', font: GROTESK, headingFont: GROTESK, radius: '0px', headingWeight: 900, headingTransform: 'uppercase' },
  { id: 'neon', name: 'Neon', description: 'Black with lime highlights', bg: '#0b0b10', surface: '#15151d', text: '#f4f4f5', muted: '#a1a1aa', accent: '#a3e635', accentText: '#0b0b10', border: 'rgba(244,244,245,0.12)', font: SANS, headingFont: SANS, radius: '6px', headingWeight: 800, headingTransform: 'none' },
  { id: 'ocean', name: 'Ocean', description: 'Airy blue and white', bg: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e', muted: '#475569', accent: '#0284c7', accentText: '#ffffff', border: '#bae6fd', font: SANS, headingFont: SANS, radius: '18px', headingWeight: 700, headingTransform: 'none' },
  { id: 'plum', name: 'Plum', description: 'Deep plum with rose accents', bg: '#1a0b1e', surface: '#26122c', text: '#f5e9f7', muted: '#c4a5cc', accent: '#fb7185', accentText: '#1a0b1e', border: 'rgba(245,233,247,0.14)', font: ROUNDED, headingFont: ROUNDED, radius: '28px', headingWeight: 700, headingTransform: 'none' },
  { id: 'rust', name: 'Rust', description: 'Charcoal with copper and bold caps', bg: '#171412', surface: '#221d19', text: '#f5efe8', muted: '#a8998a', accent: '#d97706', accentText: '#171412', border: 'rgba(245,239,232,0.12)', font: GROTESK, headingFont: GROTESK, radius: '2px', headingWeight: 800, headingTransform: 'uppercase' },
];

const PRESET_IDS = PRESETS.map((preset) => preset.id);

// Scroll effects. "reveal" fades sections in as they enter the screen. "stack" makes each section overlap the one before it.
const EFFECTS = ['none', 'reveal', 'stack'];

module.exports = { PRESETS, PRESET_IDS, EFFECTS };
