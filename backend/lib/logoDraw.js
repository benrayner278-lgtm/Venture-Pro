// Draws a logo as SVG from its settings. This is a port of frontend/lib/logoSvg.ts, so the server can preview a logo
// exactly as the builder shows it. Keep the two in step when either changes.
const fs = require('fs');
const path = require('path');

const LOGO_WIDTH = 800;
const LOGO_HEIGHT = 400;

// Icons are drawn inside a 100 by 100 box.
const ICON_SHAPES = {
  circle: '<circle cx="50" cy="50" r="46"/>',
  square: '<rect x="6" y="6" width="88" height="88" rx="14"/>',
  triangle: '<polygon points="50,6 96,90 4,90"/>',
  hexagon: '<polygon points="50,4 92,27 92,73 50,96 8,73 8,27"/>',
  star: '<polygon points="50,4 61,36 95,36 68,57 78,90 50,70 22,90 32,57 5,36 39,36"/>',
  diamond: '<polygon points="50,4 96,50 50,96 4,50"/>',
  bolt: '<polygon points="58,4 18,56 46,56 40,96 82,40 54,40 62,4"/>',
  leaf: '<path d="M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z"/>',
  shield: '<path d="M50 4 L92 18 L92 50 C92 74 74 90 50 96 C26 90 8 74 8 50 L8 18 Z"/>',
  heart: '<path d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z"/>',
  arrow: '<polygon points="50,4 92,50 66,50 66,96 34,96 34,50 8,50"/>',
};

// Each font names its family for the SVG and the font files used to draw it. Bold falls back to regular where
// a weight is not in the package.
const FONT_PACKAGES = {
  inter: { family: 'Inter', dir: 'inter', regular: 'Inter_400Regular.ttf', bold: 'Inter_700Bold.ttf' },
  montserrat: { family: 'Montserrat', dir: 'montserrat', regular: 'Montserrat_400Regular.ttf', bold: 'Montserrat_700Bold.ttf' },
  poppins: { family: 'Poppins', dir: 'poppins', regular: 'Poppins_400Regular.ttf', bold: 'Poppins_700Bold.ttf' },
  space: { family: 'Space Grotesk', dir: 'space-grotesk', regular: 'SpaceGrotesk_400Regular.ttf', bold: 'SpaceGrotesk_700Bold.ttf' },
  oswald: { family: 'Oswald', dir: 'oswald', regular: 'Oswald_400Regular.ttf', bold: 'Oswald_700Bold.ttf' },
  bebas: { family: 'Bebas Neue', dir: 'bebas-neue', regular: 'BebasNeue_400Regular.ttf', bold: 'BebasNeue_400Regular.ttf' },
  playfair: { family: 'Playfair Display', dir: 'playfair-display', regular: 'PlayfairDisplay_400Regular.ttf', bold: 'PlayfairDisplay_700Bold.ttf' },
  dmserif: { family: 'DM Serif Display', dir: 'dm-serif-display', regular: 'DMSerifDisplay_400Regular.ttf', bold: 'DMSerifDisplay_400Regular.ttf' },
};

// The font files the renderer needs, found in the installed @expo-google-fonts packages.
const fontFiles = () => {
  const files = [];
  for (const font of Object.values(FONT_PACKAGES)) {
    const folder = path.dirname(require.resolve(`@expo-google-fonts/${font.dir}/package.json`));
    const weights = [font.regular, font.bold];
    for (const file of weights) {
      const found = fs.readdirSync(folder, { recursive: true }).find((name) => String(name).endsWith(file));
      if (found) files.push(path.join(folder, found));
    }
  }
  return [...new Set(files)];
};

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shapeMarkup = (shape, accent) => {
  switch (shape.type) {
    case 'path':
      return `<path d="${escapeXml(shape.d)}" fill="${accent}"/>`;
    case 'circle':
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${accent}"/>`;
    case 'ellipse':
      return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" fill="${accent}"/>`;
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx}" fill="${accent}"/>`;
    case 'polygon':
      return `<polygon points="${escapeXml(shape.points)}" fill="${accent}"/>`;
    case 'line':
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>`;
    default:
      return '';
  }
};

// Shrinks the text so a long name still fits in the space for it.
const fitSize = (text, maxSize, maxWidth) => {
  const width = Math.max(text.length, 1) * maxSize * 0.62;
  return width > maxWidth ? Math.max(24, Math.floor(maxWidth / (Math.max(text.length, 1) * 0.62))) : maxSize;
};

const buildLogoSvg = (settings) => {
  const hasCustom = settings.icon === 'custom' && Array.isArray(settings.shapes) && settings.shapes.length > 0;
  const hasMark = hasCustom || (settings.icon !== 'custom' && Boolean(ICON_SHAPES[settings.icon]));
  const font = FONT_PACKAGES[settings.font] || FONT_PACKAGES.inter;
  const name = settings.uppercase ? settings.name.toUpperCase() : settings.name;
  const shownName = name || 'Your name';
  const tagline = settings.tagline;

  const background =
    settings.background === 'light'
      ? `<rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="#ffffff"/>`
      : settings.background === 'dark'
        ? `<rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="#0b0b10"/>`
        : settings.background === 'custom'
          ? `<rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="${settings.customBackground || '#ffffff'}"/>`
          : '';

  const iconSvg = (x, y, size) => {
    const inner = hasCustom
      ? settings.shapes.map((shape) => shapeMarkup(shape, settings.accent)).join('')
      : ICON_SHAPES[settings.icon] || '';
    return inner ? `<g transform="translate(${x} ${y}) scale(${size / 100})" fill="${settings.accent}">${inner}</g>` : '';
  };

  let body = '';
  if (settings.layout === 'stacked') {
    const size = fitSize(shownName, 80, LOGO_WIDTH - 80);
    body += iconSvg(325, 30, 150);
    body += `<text x="400" y="${tagline ? 268 : 300}" text-anchor="middle" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<text x="400" y="318" text-anchor="middle" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  } else if (settings.layout === 'wordmark') {
    const size = fitSize(shownName, 92, LOGO_WIDTH - 80);
    body += `<text x="400" y="${tagline ? 200 : 230}" text-anchor="middle" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<rect x="340" y="232" width="120" height="4" fill="${settings.accent}"/>`;
      body += `<text x="400" y="290" text-anchor="middle" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  } else {
    const iconX = 110;
    const textX = hasMark ? 320 : 110;
    const size = fitSize(shownName, 84, LOGO_WIDTH - textX - 40);
    const nameY = tagline ? 190 : 225;
    body += iconSvg(iconX, 110, 160);
    body += `<text x="${textX}" y="${nameY}" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<text x="${textX}" y="${nameY + 48}" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}">${background}${body}</svg>`;
};

module.exports = { buildLogoSvg, fontFiles, LOGO_WIDTH, LOGO_HEIGHT };
