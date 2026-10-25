// The design brief the AI writes for each site: its colours, fonts, shape and section layouts.
// Everything is checked here before it is used, so a bad or odd value can never break a page.
const { FONTS, HEADING_CASES } = require('./styleOptions');
const { EFFECTS } = require('./designPresets');

const HEX = /^#[0-9a-fA-F]{6}$/;
const PALETTE_KEYS = ['bg', 'surface', 'text', 'muted', 'accent', 'accentText', 'border'];
const DENSITY_SPACING = { airy: 130, balanced: 100, dense: 75 };
const HEADING_WEIGHTS = [500, 600, 700, 800, 900];

// The layouts each section type can use. The AI picks one per section.
const LAYOUTS = {
  hero: ['centred', 'split', 'editorial'],
  text: ['centred', 'columns'],
  cards: ['grid', 'list', 'numbered'],
  steps: ['timeline', 'columns'],
  gallery: ['grid', 'featured', 'list'],
  pricing: ['cards', 'rows'],
  faq: ['accordion', 'columns'],
  contact: ['centred', 'split'],
  cta: ['banner', 'inline'],
  custom: [],
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

// All seven colours must be present, and the text must read clearly on the background.
const cleanPalette = (palette) => {
  if (!palette || typeof palette !== 'object') return undefined;
  if (!PALETTE_KEYS.every((key) => HEX.test(palette[key]))) return undefined;
  if (contrast(palette.text, palette.bg) < 4.5) return undefined;
  if (contrast(palette.accentText, palette.accent) < 3) return undefined;
  return Object.fromEntries(PALETTE_KEYS.map((key) => [key, palette[key]]));
};

const cleanFonts = (fonts) => {
  if (!fonts || typeof fonts !== 'object') return undefined;
  const heading = FONTS[fonts.heading] ? fonts.heading : null;
  const body = FONTS[fonts.body] ? fonts.body : null;
  if (!heading && !body) return undefined;
  return { heading, body };
};

// Returns a clean brief, or undefined when nothing usable is left.
const sanitizeDesign = (design) => {
  if (!design || typeof design !== 'object') return undefined;
  const brief = {};
  if (EFFECTS.includes(design.effect)) brief.effect = design.effect;
  if (typeof design.mood === 'string' && design.mood.trim()) brief.mood = design.mood.trim().slice(0, 80);
  const palette = cleanPalette(design.palette);
  if (palette) brief.palette = palette;
  const fonts = cleanFonts(design.fonts);
  if (fonts) brief.fonts = fonts;
  if (HEADING_CASES.includes(design.headingCase) && design.headingCase !== 'preset') brief.headingCase = design.headingCase;
  if (HEADING_WEIGHTS.includes(Number(design.headingWeight))) brief.headingWeight = Number(design.headingWeight);
  if (Number.isFinite(Number(design.radius))) brief.radius = Math.min(32, Math.max(0, Math.round(Number(design.radius))));
  if (DENSITY_SPACING[design.density]) brief.density = design.density;
  return Object.keys(brief).length ? brief : undefined;
};

// Drops any layout that does not fit its section type.
const sanitizeSections = (sections) =>
  (Array.isArray(sections) ? sections : []).map((section) => {
    const options = LAYOUTS[section?.type] || [];
    if (options.includes(section.layout)) return section;
    const { layout, ...rest } = section;
    return rest;
  });

// The preset with the brief's colours and weight applied.
const applyBrief = (preset, brief) => {
  if (!brief) return preset;
  return {
    ...preset,
    ...(brief.palette || {}),
    ...(brief.headingWeight ? { headingWeight: brief.headingWeight } : {}),
  };
};

// The style the brief asks for, merged with the owner's own style choices. The owner's choices win.
// Spacing from the owner is a multiplier on the brief's density, so 100 means "as the brief says".
const mergeStyle = (brief, userStyle) => {
  const user = userStyle || {};
  const briefCorners = brief?.radius == null ? null : Math.round(100 - (brief.radius / 32) * 100);
  const briefSpacing = DENSITY_SPACING[brief?.density] ?? 100;
  return {
    headingFont: user.headingFont || brief?.fonts?.heading || null,
    bodyFont: user.bodyFont || brief?.fonts?.body || null,
    headingCase: user.headingCase && user.headingCase !== 'preset' ? user.headingCase : brief?.headingCase || 'preset',
    corners: user.corners ?? briefCorners,
    gradient: user.gradient,
    brightness: user.brightness,
    contrast: user.contrast,
    saturation: user.saturation,
    spacing: Math.round((briefSpacing * (user.spacing ?? 100)) / 100),
  };
};

module.exports = { LAYOUTS, sanitizeDesign, sanitizeSections, applyBrief, mergeStyle, contrast };
