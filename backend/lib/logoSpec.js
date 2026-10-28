// A logo is described as data, not as raw SVG. The AI writes this description, and the server checks every value
// before the page draws it. Nothing from the AI reaches the page as markup.
const ICONS = ['circle', 'square', 'triangle', 'hexagon', 'star', 'diamond', 'bolt', 'leaf', 'shield', 'heart', 'arrow'];
const FONT_KEYS = ['inter', 'montserrat', 'poppins', 'space', 'oswald', 'bebas', 'playfair', 'dmserif'];
const LAYOUTS = ['side', 'stacked', 'wordmark'];
const BACKGROUNDS = ['light', 'dark', 'transparent', 'custom'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtZz0-9 ,.\-]{1,400}$/;
const MAX_SHAPES = 16;

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const coord = (value, fallback = 50) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 10) / 10)) : fallback;
};

// Keeps only shapes that can be drawn safely inside the 100 by 100 icon box.
const cleanShape = (shape) => {
  if (!shape || typeof shape !== 'object') return null;
  switch (shape.type) {
    case 'path':
      return PATH_DATA.test(shape.d || '') ? { type: 'path', d: shape.d } : null;
    case 'circle':
      return { type: 'circle', cx: coord(shape.cx), cy: coord(shape.cy), r: coord(shape.r, 20) };
    case 'ellipse':
      return { type: 'ellipse', cx: coord(shape.cx), cy: coord(shape.cy), rx: coord(shape.rx, 20), ry: coord(shape.ry, 12) };
    case 'rect':
      return { type: 'rect', x: coord(shape.x), y: coord(shape.y), width: coord(shape.width, 20), height: coord(shape.height, 20), rx: coord(shape.rx, 0) };
    case 'polygon': {
      const numbers = String(shape.points || '').match(/-?\d+(\.\d+)?/g) || [];
      if (numbers.length < 6 || numbers.length % 2 !== 0) return null;
      const points = [];
      for (let i = 0; i < numbers.length; i += 2) points.push(`${coord(numbers[i])},${coord(numbers[i + 1])}`);
      return { type: 'polygon', points: points.join(' ') };
    }
    case 'line':
      return { type: 'line', x1: coord(shape.x1), y1: coord(shape.y1), x2: coord(shape.x2), y2: coord(shape.y2) };
    default:
      return null;
  }
};

// Returns a logo that is safe to draw, filling in anything missing or invalid with sensible defaults.
const cleanLogo = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const shapes = (Array.isArray(source.shapes) ? source.shapes : []).slice(0, MAX_SHAPES).map(cleanShape).filter(Boolean);
  const icon = ICONS.includes(source.icon) ? source.icon : shapes.length ? 'custom' : 'circle';
  return {
    name: clip(source.name, 60),
    tagline: clip(source.tagline, 80),
    icon,
    shapes: icon === 'custom' ? shapes : [],
    layout: LAYOUTS.includes(source.layout) ? source.layout : 'side',
    font: FONT_KEYS.includes(source.font) ? source.font : 'inter',
    primary: HEX.test(source.primary) ? source.primary : '#111111',
    accent: HEX.test(source.accent) ? source.accent : '#2563eb',
    background: BACKGROUNDS.includes(source.background) ? source.background : 'light',
    customBackground: HEX.test(source.customBackground) ? source.customBackground : '#ffffff',
    uppercase: source.uppercase === true,
  };
};

module.exports = { cleanLogo, ICONS, FONT_KEYS, LAYOUTS, BACKGROUNDS };
