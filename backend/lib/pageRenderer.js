// Builds a complete page from the AI's markup and styles. The palette and fonts are exposed as CSS variables,
// so the AI's own styles can use them. Anything unsafe is removed first (see pageSanitizer.js).
const { FONTS, googleFontsLink } = require('./styleOptions');
const { contrast } = require('./designBrief');
const { sanitizeBody, sanitizeCss } = require('./pageSanitizer');

const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_PALETTE = { bg: '#ffffff', surface: '#f5f5f5', text: '#111111', muted: '#555555', accent: '#2563eb', accentText: '#ffffff', border: '#e5e5e5' };

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Keeps the palette only if every colour is valid and the text and button colours read clearly.
const cleanPage = (palette) => {
  const colours = palette && typeof palette === 'object' ? palette : {};
  const valid = Object.keys(FALLBACK_PALETTE).every((key) => HEX.test(colours[key]));
  if (!valid || contrast(colours.text, colours.bg) < 4.5 || contrast(colours.accentText, colours.accent) < 3) return FALLBACK_PALETTE;
  return Object.fromEntries(Object.keys(FALLBACK_PALETTE).map((key) => [key, colours[key]]));
};

const cleanFontKey = (key, fallback) => (FONTS[key] ? key : fallback);

// Returns the full HTML document for a page. Input: { brand, palette, fonts, body, css }.
const renderPage = ({ brand, palette, fonts, body, css }) => {
  const colours = cleanPage(palette);
  const headingFont = cleanFontKey(fonts?.heading, 'inter');
  const bodyFont = cleanFontKey(fonts?.body, 'inter');
  const name = escapeHtml(brand?.name || 'Website');
  const variables = Object.entries(colours)
    .map(([key, value]) => `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value};`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
${googleFontsLink({ headingFont, bodyFont })}
<style>
:root{${variables}--font-heading:${FONTS[headingFont].family};--font-body:${FONTS[bodyFont].family}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.55;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--font-heading);line-height:1.1;margin:0 0 .5em}
p{margin:0 0 1em}
a{color:inherit}
img,svg{max-width:100%;height:auto;display:block}
${sanitizeCss(css)}
</style>
</head>
<body>
${sanitizeBody(body)}
</body>
</html>`;
};

module.exports = { renderPage };
