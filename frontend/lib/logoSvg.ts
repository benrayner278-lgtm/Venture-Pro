// Draws logos as SVG from simple templates. No AI call is needed, so it is instant and free to use.

export type LogoLayout = 'side' | 'stacked' | 'wordmark';
export type LogoBackground = 'transparent' | 'light' | 'dark';

// A shape the AI drew for a custom icon. Coordinates are inside a 100 by 100 box.
export type LogoShape =
  | { type: 'path'; d: string }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { type: 'polygon'; points: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number };

export type LogoSettings = {
  name: string;
  tagline: string;
  icon: string;
  shapes?: LogoShape[];
  layout: LogoLayout;
  font: string;
  primary: string;
  accent: string;
  background: LogoBackground;
  uppercase: boolean;
};

// Icons are drawn inside a 100 by 100 box.
export const LOGO_ICONS: { key: string; label: string; shape: string }[] = [
  { key: 'circle', label: 'Circle', shape: '<circle cx="50" cy="50" r="46"/>' },
  { key: 'square', label: 'Square', shape: '<rect x="6" y="6" width="88" height="88" rx="14"/>' },
  { key: 'triangle', label: 'Triangle', shape: '<polygon points="50,6 96,90 4,90"/>' },
  { key: 'hexagon', label: 'Hexagon', shape: '<polygon points="50,4 92,27 92,73 50,96 8,73 8,27"/>' },
  { key: 'star', label: 'Star', shape: '<polygon points="50,4 61,36 95,36 68,57 78,90 50,70 22,90 32,57 5,36 39,36"/>' },
  { key: 'diamond', label: 'Diamond', shape: '<polygon points="50,4 96,50 50,96 4,50"/>' },
  { key: 'bolt', label: 'Bolt', shape: '<polygon points="58,4 18,56 46,56 40,96 82,40 54,40 62,4"/>' },
  { key: 'leaf', label: 'Leaf', shape: '<path d="M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z"/>' },
  { key: 'shield', label: 'Shield', shape: '<path d="M50 4 L92 18 L92 50 C92 74 74 90 50 96 C26 90 8 74 8 50 L8 18 Z"/>' },
  { key: 'heart', label: 'Heart', shape: '<path d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z"/>' },
  { key: 'arrow', label: 'Arrow', shape: '<polygon points="50,4 92,50 66,50 66,96 34,96 34,50 8,50"/>' },
];

// The fonts offered for logos. Each is loaded from Google Fonts on the builder page.
export const LOGO_FONTS: { key: string; label: string; family: string; google: string }[] = [
  { key: 'inter', label: 'Inter (clean)', family: 'Inter', google: 'Inter:wght@400;700' },
  { key: 'montserrat', label: 'Montserrat (geometric)', family: 'Montserrat', google: 'Montserrat:wght@400;700' },
  { key: 'poppins', label: 'Poppins (friendly)', family: 'Poppins', google: 'Poppins:wght@400;700' },
  { key: 'space', label: 'Space Grotesk (technical)', family: 'Space Grotesk', google: 'Space+Grotesk:wght@400;700' },
  { key: 'oswald', label: 'Oswald (condensed)', family: 'Oswald', google: 'Oswald:wght@400;700' },
  { key: 'bebas', label: 'Bebas Neue (poster)', family: 'Bebas Neue', google: 'Bebas+Neue' },
  { key: 'playfair', label: 'Playfair Display (elegant)', family: 'Playfair Display', google: 'Playfair+Display:wght@400;700' },
  { key: 'dmserif', label: 'DM Serif Display (bold serif)', family: 'DM Serif Display', google: 'DM+Serif+Display' },
];

// Colour pairs to start from. The user can change either colour afterwards.
export const LOGO_PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: 'Ink and blue', primary: '#111111', accent: '#2563eb' },
  { name: 'Forest', primary: '#14532d', accent: '#34d399' },
  { name: 'Sunset', primary: '#7c2d12', accent: '#f97316' },
  { name: 'Plum', primary: '#4a044e', accent: '#fb7185' },
  { name: 'Slate', primary: '#1f2937', accent: '#94a3b8' },
  { name: 'Gold', primary: '#18181b', accent: '#eab308' },
];

export const DEFAULT_LOGO: LogoSettings = {
  name: '',
  tagline: '',
  icon: 'circle',
  layout: 'side',
  font: 'inter',
  primary: '#111111',
  accent: '#2563eb',
  background: 'light',
  uppercase: false,
};

export const LOGO_WIDTH = 800;
export const LOGO_HEIGHT = 400;

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shapeMarkup = (shape: LogoShape, accent: string) => {
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
  }
};

// Shrinks the text so a long name still fits in the space for it.
const fitSize = (text: string, maxSize: number, maxWidth: number) => {
  const width = Math.max(text.length, 1) * maxSize * 0.62;
  return width > maxWidth ? Math.max(24, Math.floor((maxWidth / (Math.max(text.length, 1) * 0.62)))) : maxSize;
};

export function buildLogoSvg(settings: LogoSettings): string {
  const icon = LOGO_ICONS.find((item) => item.key === settings.icon);
  const hasMark = settings.icon === 'custom' ? Boolean(settings.shapes?.length) : Boolean(icon);
  const font = LOGO_FONTS.find((item) => item.key === settings.font) || LOGO_FONTS[0];
  const name = settings.uppercase ? settings.name.toUpperCase() : settings.name;
  const shownName = name || 'Your name';
  const tagline = settings.tagline;

  const background =
    settings.background === 'light'
      ? `<rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="#ffffff"/>`
      : settings.background === 'dark'
        ? `<rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="#0b0b10"/>`
        : '';

  const iconSvg = (x: number, y: number, size: number) => {
    const inner = settings.icon === 'custom' && settings.shapes?.length
      ? settings.shapes.map((shape) => shapeMarkup(shape, settings.accent)).join('')
      : icon?.shape ?? '';
    return inner ? `<g transform="translate(${x} ${y}) scale(${size / 100})" fill="${settings.accent}">${inner}</g>` : '';
  };

  let body = '';
  if (settings.layout === 'side') {
    const iconX = 110;
    const textX = hasMark ? 320 : 110;
    const size = fitSize(shownName, 84, LOGO_WIDTH - textX - 40);
    const nameY = tagline ? 190 : 225;
    body += iconSvg(iconX, 110, 160);
    body += `<text x="${textX}" y="${nameY}" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<text x="${textX}" y="${nameY + 48}" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  } else if (settings.layout === 'stacked') {
    const size = fitSize(shownName, 80, LOGO_WIDTH - 80);
    body += iconSvg(325, 30, 150);
    body += `<text x="400" y="${tagline ? 268 : 300}" text-anchor="middle" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<text x="400" y="${268 + 50}" text-anchor="middle" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  } else {
    const size = fitSize(shownName, 92, LOGO_WIDTH - 80);
    body += `<text x="400" y="${tagline ? 200 : 230}" text-anchor="middle" font-family="${font.family}" font-weight="700" font-size="${size}" fill="${settings.primary}">${escapeXml(shownName)}</text>`;
    if (tagline) {
      body += `<rect x="340" y="232" width="120" height="4" fill="${settings.accent}"/>`;
      body += `<text x="400" y="290" text-anchor="middle" font-family="${font.family}" font-size="28" fill="${settings.primary}" opacity="0.7">${escapeXml(tagline)}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}">${background}${body}</svg>`;
}

export const logoDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
