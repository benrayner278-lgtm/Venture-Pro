// Cleans the HTML and CSS the AI writes for a page, so it can be published without scripts or outside requests.
// Pages get no JavaScript, no forms and no external images. Graphics are inline SVG only.
const sanitizeHtml = require('sanitize-html');

const SVG_TAGS = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'pattern', 'clippath', 'use', 'symbol', 'title'];
const PAGE_TAGS = [
  'section', 'header', 'footer', 'nav', 'main', 'article', 'aside', 'div', 'span', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img',
  'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'small', 'br', 'hr', 'blockquote', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'code', 'label', 'time',
];
const SVG_ATTRIBUTES = ['viewbox', 'xmlns', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'points', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'id', 'preserveaspectratio', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'clip-path', 'role', 'aria-hidden', 'focusable'];

// Only in-page links, mail, phone and web addresses are kept. Anything else is removed.
const HREF = /^(#[\w-]*|mailto:[^\s]+|tel:[^\s]+|https?:\/\/[^\s]+)$/i;

const sanitizeBody = (html) => {
  const cleaned = sanitizeHtml(String(html ?? ''), {
    allowedTags: [...PAGE_TAGS, ...SVG_TAGS],
    allowedAttributes: {
      '*': ['class', 'id', 'role', 'aria-label', 'aria-hidden', 'title'],
      a: ['href', 'title'],
      img: ['alt', 'data-image', 'data-stock', 'width', 'height'],
      ...Object.fromEntries(SVG_TAGS.map((tag) => [tag, SVG_ATTRIBUTES])),
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    allowedSchemesAppliedToAttributes: ['href'],
    allowedSchemesByTag: { img: ['data'] },
    allowVulnerableTags: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tag, attribs) => ({ tagName: 'a', attribs: HREF.test(attribs.href || '') ? { ...attribs, ...(attribs.href.startsWith('http') ? { rel: 'noopener', target: '_blank' } : {}) } : { href: '#top' } }),
    },
  });
  // A stray style attribute can carry a url() or an expression, so it is removed with any unsafe value.
  return cleaned.replace(/\sstyle="[^"]*"/gi, '').replace(/\son\w+="[^"]*"/gi, '');
};

// Drops anything in the CSS that can load something or run code. Only inline data images are allowed.
const sanitizeCss = (css) => {
  let text = String(css ?? '').slice(0, 40000);
  text = text.replace(/<\/?style[^>]*>/gi, '');
  text = text.replace(/@import[^;]*;?/gi, '');
  text = text.replace(/url\(\s*(['"]?)(?!data:image\/(?:svg\+xml|png|webp|gif);)[^)]*\)/gi, 'none');
  text = text.replace(/expression\s*\(|behavior\s*:|-moz-binding|javascript\s*:/gi, '');
  return text;
};

module.exports = { sanitizeBody, sanitizeCss };
