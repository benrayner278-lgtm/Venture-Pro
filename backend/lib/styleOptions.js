// Font and style choices the owner can make in the builder. Keys are stored in site content, so keep them stable.
const FONTS = {
  system: { family: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", google: null },
  georgia: { family: "Georgia, 'Times New Roman', serif", google: null },
  inter: { family: "'Inter', system-ui, sans-serif", google: 'Inter', weights: true },
  montserrat: { family: "'Montserrat', system-ui, sans-serif", google: 'Montserrat', weights: true },
  poppins: { family: "'Poppins', system-ui, sans-serif", google: 'Poppins', weights: true },
  nunito: { family: "'Nunito', system-ui, sans-serif", google: 'Nunito', weights: true },
  space: { family: "'Space Grotesk', system-ui, sans-serif", google: 'Space Grotesk', weights: true },
  oswald: { family: "'Oswald', system-ui, sans-serif", google: 'Oswald', weights: true },
  bebas: { family: "'Bebas Neue', system-ui, sans-serif", google: 'Bebas Neue', weights: false },
  playfair: { family: "'Playfair Display', Georgia, serif", google: 'Playfair Display', weights: true },
  lora: { family: "'Lora', Georgia, serif", google: 'Lora', weights: true },
  merriweather: { family: "'Merriweather', Georgia, serif", google: 'Merriweather', weights: true },
  dmserif: { family: "'DM Serif Display', Georgia, serif", google: 'DM Serif Display', weights: false },
  mono: { family: "'Roboto Mono', ui-monospace, monospace", google: 'Roboto Mono', weights: true },
};

const HEADING_CASES = ['preset', 'none', 'uppercase', 'capitalize'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const num = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

// Returns only valid, clamped style values. Anything else falls back to the preset's own design.
const cleanStyle = (style) => {
  if (!style || typeof style !== 'object') return null;
  const gradient = style.gradient && typeof style.gradient === 'object' ? style.gradient : {};
  const fontKey = (value) => (FONTS[value] ? value : null);
  return {
    headingFont: fontKey(style.headingFont),
    bodyFont: fontKey(style.bodyFont),
    headingCase: HEADING_CASES.includes(style.headingCase) ? style.headingCase : 'preset',
    gradient: {
      enabled: gradient.enabled === true && HEX.test(gradient.from) && HEX.test(gradient.to),
      from: HEX.test(gradient.from) ? gradient.from : '#1e3a8a',
      to: HEX.test(gradient.to) ? gradient.to : '#0f172a',
      angle: num(gradient.angle, 0, 360, 135),
    },
    brightness: num(style.brightness, 60, 140, 100),
    contrast: num(style.contrast, 60, 140, 100),
    saturation: num(style.saturation, 0, 200, 100),
    corners: style.corners == null ? null : num(style.corners, 0, 100, 50),
    spacing: num(style.spacing, 60, 160, 100),
  };
};

// Applies the owner's style on top of a preset. The result is what the page renderer uses.
const applyStyle = (preset, style) => {
  const s = cleanStyle(style) || {};
  const gradient = s.gradient || { enabled: false };
  return {
    ...preset,
    font: s.bodyFont ? FONTS[s.bodyFont].family : preset.font,
    headingFont: s.headingFont ? FONTS[s.headingFont].family : preset.headingFont,
    headingTransform: s.headingCase && s.headingCase !== 'preset' ? (s.headingCase === 'none' ? 'none' : s.headingCase) : preset.headingTransform,
    radius: s.corners == null ? preset.radius : `${Math.round(((100 - s.corners) / 100) * 32)}px`,
    filter: `brightness(${(s.brightness ?? 100) / 100}) contrast(${(s.contrast ?? 100) / 100}) saturate(${(s.saturation ?? 100) / 100})`,
    space: (s.spacing ?? 100) / 100,
    heroBackground: gradient.enabled ? `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})` : 'none',
  };
};

// Loads only the Google fonts the owner chose. Returns an empty string when none are needed.
const googleFontsLink = (style) => {
  const s = cleanStyle(style) || {};
  const chosen = [s.headingFont, s.bodyFont].filter(Boolean).map((key) => FONTS[key]).filter((font) => font.google);
  const unique = [...new Map(chosen.map((font) => [font.google, font])).values()];
  if (unique.length === 0) return '';
  const families = unique
    .map((font) => `family=${font.google.replace(/ /g, '+')}${font.weights ? ':wght@400;700' : ''}`)
    .join('&');
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">`;
};

module.exports = { FONTS, HEADING_CASES, cleanStyle, applyStyle, googleFontsLink };
