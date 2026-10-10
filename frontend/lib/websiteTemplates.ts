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

export type WebsiteContent = {
  brand: { name: string; tagline: string };
  nav?: string[];
  sections: WebsiteSection[];
  footer: { note: string };
};

export type WebsiteTheme = {
  id: string;
  name: string;
  description: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  font: string;
  radius: string;
  headingWeight: number;
  headingTransform: 'none' | 'uppercase';
};

const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const WEBSITE_THEMES: WebsiteTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark with a soft blue glow',
    bg: '#05070d',
    surface: '#0d1220',
    text: '#e5e7eb',
    muted: '#94a3b8',
    accent: '#60a5fa',
    accentText: '#05070d',
    border: 'rgba(148,163,184,0.18)',
    font: SANS,
    radius: '16px',
    headingWeight: 700,
    headingTransform: 'none',
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Light and editorial',
    bg: '#faf7f2',
    surface: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
    accent: '#1c1917',
    accentText: '#faf7f2',
    border: '#e7e5e4',
    font: SERIF,
    radius: '4px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast with large type',
    bg: '#000000',
    surface: '#111111',
    text: '#ffffff',
    muted: '#a3a3a3',
    accent: '#facc15',
    accentText: '#000000',
    border: '#262626',
    font: SANS,
    radius: '0px',
    headingWeight: 900,
    headingTransform: 'uppercase',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Monochrome and clean',
    bg: '#ffffff',
    surface: '#fafafa',
    text: '#111111',
    muted: '#6b7280',
    accent: '#111111',
    accentText: '#ffffff',
    border: '#e5e7eb',
    font: SANS,
    radius: '10px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Earthy and friendly',
    bg: '#2a1f17',
    surface: '#3a2b20',
    text: '#fdf6ec',
    muted: '#d6c3ab',
    accent: '#f59e0b',
    accentText: '#2a1f17',
    border: 'rgba(253,246,236,0.14)',
    font: "'Trebuchet MS', Arial, sans-serif",
    radius: '20px',
    headingWeight: 700,
    headingTransform: 'none',
  },
];

const escapeHtml = (text: string | undefined) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pick = (options: string[], index: number) => options[((index % options.length) + options.length) % options.length];

const ctaButtons = (primary: string, secondary?: string) =>
  `<div class="actions"><a class="btn btn-primary" href="#get-started">${escapeHtml(primary)}</a>${
    secondary ? `<a class="btn btn-secondary" href="#s1">${escapeHtml(secondary)}</a>` : ''
  }</div>`;

const itemsGrid = (items: Item[]) =>
  items.map((item) => `<div class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('');

const renderHero = (s: Extract<WebsiteSection, { type: 'hero' }>, variant: string, brand: string) => {
  const eyebrow = s.eyebrow ? `<p class="eyebrow">${escapeHtml(s.eyebrow)}</p>` : '';
  if (variant === 'split') {
    const initials = escapeHtml(brand.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase());
    return `<header class="hero hero-split"><div class="wrap split">
      <div>${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub left">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta).replace('class="actions"', 'class="actions left"')}</div>
      <div class="visual"><span>${initials}</span></div>
    </div></header>`;
  }
  if (variant === 'editorial') {
    return `<header class="hero hero-editorial"><div class="wrap">${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub left">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta).replace('class="actions"', 'class="actions left"')}</div></header>`;
  }
  return `<header class="hero hero-centred"><div class="wrap centre">${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta)}</div></header>`;
};

const renderSection = (section: WebsiteSection, index: number, variantSeed: number, brand: string): string => {
  const v = (options: string[]) => pick(options, variantSeed + index);
  const title = (text: string) => `<h2>${escapeHtml(text)}</h2>`;
  switch (section.type) {
    case 'hero':
      return renderHero(section, v(['centred', 'split', 'editorial']), brand);

    case 'text': {
      const body = section.paragraphs.map((p) => `<p class="lead">${escapeHtml(p)}</p>`).join('');
      if (v(['centred', 'columns']) === 'columns') {
        return `<section><div class="wrap text-cols"><div>${title(section.title)}</div><div>${section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}${body}</div></section>`;
    }

    case 'cards': {
      const intro = section.intro ? `<p class="lead">${escapeHtml(section.intro)}</p>` : '';
      const variant = v(['grid', 'list', 'numbered']);
      let items: string;
      if (variant === 'list') {
        items = `<div class="rows">${section.items.map((item) => `<div class="row"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div>`;
      } else if (variant === 'numbered') {
        items = `<div class="numbered">${section.items.map((item, i) => `<div class="num"><span>${String(i + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div>`;
      } else {
        items = `<div class="grid">${itemsGrid(section.items)}</div>`;
      }
      return `<section><div class="wrap ${variant === 'list' ? '' : 'centre'}">${title(section.title)}${intro}${items}</div></section>`;
    }

    case 'steps': {
      if (v(['timeline', 'columns']) === 'columns') {
        return `<section><div class="wrap">${title(section.title)}<div class="grid">${section.items.map((item, i) => `<div class="card"><span class="step-no">Step ${i + 1}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap narrow">${title(section.title)}<ol class="timeline">${section.items.map((item) => `<li><span class="dot"></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></li>`).join('')}</ol></div></section>`;
    }

    case 'gallery': {
      const intro = section.intro ? `<p class="lead">${escapeHtml(section.intro)}</p>` : '';
      const tile = (item: Item & { tag?: string }, i: number, wide = false) =>
        `<div class="tile${wide ? ' wide' : ''}"><div class="thumb thumb-${i % 3}"><span class="tag">${escapeHtml(item.tag || 'Project')}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`;
      const variant = v(['grid', 'featured', 'list']);
      if (variant === 'featured' && section.items.length > 1) {
        const [first, ...rest] = section.items;
        return `<section><div class="wrap">${title(section.title)}${intro}<div class="gallery">${tile(first, 0, true)}${rest.map((item, i) => tile(item, i + 1)).join('')}</div></div></section>`;
      }
      if (variant === 'list') {
        return `<section><div class="wrap narrow">${title(section.title)}${intro}<div class="rows">${section.items.map((item) => `<div class="row"><span class="tag">${escapeHtml(item.tag || 'Project')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap">${title(section.title)}${intro}<div class="gallery">${section.items.map((item, i) => tile(item, i)).join('')}</div></div></section>`;
    }

    case 'pricing': {
      if (v(['cards', 'rows']) === 'rows') {
        return `<section><div class="wrap narrow">${title(section.title)}<div class="rows">${section.tiers.map((tier) => `<div class="row"><h3>${escapeHtml(tier.name)}</h3><p>${escapeHtml(tier.description)}</p><span class="price">${escapeHtml(tier.price)}</span></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}<div class="grid">${section.tiers.map((tier) => `<div class="card price-card"><h3>${escapeHtml(tier.name)}</h3><div class="price">${escapeHtml(tier.price)}</div><p>${escapeHtml(tier.description)}</p><ul>${tier.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>`).join('')}</div></div></section>`;
    }

    case 'faq': {
      if (v(['accordion', 'columns']) === 'columns') {
        return `<section><div class="wrap">${title(section.title)}<div class="grid">${section.items.map((item) => `<div class="card"><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap narrow">${title(section.title)}${section.items.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</div></section>`;
    }

    case 'contact': {
      const details = [
        section.email ? `<a href="mailto:${escapeHtml(section.email)}">${escapeHtml(section.email)}</a>` : '',
        section.phone ? `<span>${escapeHtml(section.phone)}</span>` : '',
      ].filter(Boolean).join('');
      if (v(['centred', 'split']) === 'split') {
        return `<section><div class="wrap text-cols"><div>${title(section.title)}<p class="lead">${escapeHtml(section.body)}</p></div><div class="card contact-card">${details}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}<p class="lead">${escapeHtml(section.body)}</p><div class="contact-line">${details}</div></div></section>`;
    }

    case 'cta': {
      const body = section.body ? `<p class="lead">${escapeHtml(section.body)}</p>` : '';
      if (v(['banner', 'inline']) === 'banner') {
        return `<section class="cta-banner" id="get-started"><div class="wrap centre"><h2>${escapeHtml(section.headline)}</h2>${body}<div class="actions"><a class="btn btn-primary" href="#">${escapeHtml(section.button)}</a></div></div></section>`;
      }
      return `<section id="get-started"><div class="wrap centre"><h2>${escapeHtml(section.headline)}</h2>${body}<div class="actions"><a class="btn btn-primary" href="#">${escapeHtml(section.button)}</a></div></div></section>`;
    }

    case 'custom': {
      const heading = section.title ? title(section.title) : '';
      return `<section><div class="wrap narrow">${heading}${section.paragraphs.map((p) => `<p class="lead">${escapeHtml(p)}</p>`).join('')}</div></section>`;
    }
  }
};

const themeCss = (t: WebsiteTheme) => `
:root{--bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--accent-text:${t.accentText};--border:${t.border};--radius:${t.radius}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:${t.font};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.narrow{max-width:760px}
nav{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px 0;flex-wrap:wrap}
nav .links{display:flex;gap:24px;font-size:14px;color:var(--muted)}
.brand{font-weight:700;letter-spacing:-0.01em;font-size:18px}
.btn{display:inline-block;padding:14px 26px;border-radius:var(--radius);font-weight:600;text-decoration:none;font-size:15px}
.btn-primary{background:var(--accent);color:var(--accent-text)}
.btn-secondary{border:1px solid var(--border)}
section{padding:96px 0;border-top:1px solid var(--border)}
.hero{padding:120px 0 104px;border-top:none}
.hero-centred{text-align:center}
.hero-editorial .wrap{max-width:820px}
.hero-split .split{display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center}
.visual{aspect-ratio:4/3;border-radius:var(--radius);background:linear-gradient(135deg,var(--surface),var(--accent));display:flex;align-items:center;justify-content:center;color:var(--accent-text);font-size:64px;font-weight:${t.headingWeight};letter-spacing:-0.04em}
.eyebrow{font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin:0 0 18px}
h1,h2,h3{font-weight:${t.headingWeight};text-transform:${t.headingTransform};letter-spacing:-0.02em;line-height:1.1}
h1{font-size:clamp(40px,6vw,72px);margin:0 0 22px}
h2{font-size:clamp(28px,4vw,44px);margin:0 0 20px}
.sub{font-size:19px;color:var(--muted);max-width:640px;margin:0 auto 36px}
.sub.left,.left{text-align:left;margin-left:0}
.actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.actions.left{justify-content:flex-start}
.centre{text-align:center}
.lead{font-size:18px;color:var(--muted);max-width:720px;margin:0 auto 12px}
.text-cols{display:grid;grid-template-columns:1fr 1.3fr;gap:56px;align-items:start}
.text-cols p{color:var(--muted);margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:48px;text-align:left}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px}
.card h3{margin:0 0 10px;font-size:18px;text-transform:none;font-weight:600}
.card p{margin:0;color:var(--muted);font-size:15px}
.rows{margin-top:32px;text-align:left}
.row{display:grid;grid-template-columns:1fr 2fr;gap:24px;padding:22px 0;border-bottom:1px solid var(--border);align-items:baseline}
.row h3{font-size:18px;margin:0;text-transform:none;font-weight:600}
.row p{margin:0;color:var(--muted)}
.row .tag,.row .price{justify-self:start;font-size:13px;color:var(--muted)}
.numbered{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:40px;margin-top:48px;text-align:left}
.num span{display:block;font-size:14px;color:var(--muted);margin-bottom:12px;letter-spacing:0.08em}
.num h3{font-size:18px;text-transform:none;font-weight:600;margin:0 0 8px}
.num p{margin:0;color:var(--muted)}
.timeline{list-style:none;padding:0;margin:40px 0 0;text-align:left;border-left:1px solid var(--border)}
.timeline li{position:relative;padding:0 0 32px 28px}
.timeline .dot{position:absolute;left:-5px;top:8px;width:9px;height:9px;border-radius:50%;background:var(--accent)}
.timeline h3{font-size:18px;text-transform:none;font-weight:600;margin:0 0 6px}
.timeline p{margin:0;color:var(--muted)}
.step-no{font-size:13px;color:var(--muted);letter-spacing:0.08em}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin-top:48px;text-align:left}
.gallery .tile.wide{grid-column:1/-1}
.thumb{aspect-ratio:16/10;border-radius:var(--radius);border:1px solid var(--border);position:relative;margin-bottom:16px;background:linear-gradient(135deg,var(--surface),var(--accent))}
.thumb-1{background:linear-gradient(225deg,var(--surface),var(--muted))}
.thumb-2{background:linear-gradient(45deg,var(--bg),var(--accent))}
.tile.wide .thumb{aspect-ratio:21/9}
.tag{display:inline-block;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:4px 10px}
.thumb .tag{position:absolute;left:14px;bottom:14px;background:var(--bg)}
.tile h3{font-size:18px;text-transform:none;font-weight:600;margin:0 0 6px}
.tile p{margin:0;color:var(--muted);font-size:15px}
.price-card ul{list-style:none;padding:0;margin:18px 0 0;color:var(--muted);font-size:15px;text-align:left}
.price-card li{padding:6px 0;border-top:1px solid var(--border)}
.price{font-size:32px;font-weight:${t.headingWeight};margin:8px 0 12px;letter-spacing:-0.02em}
.contact-card{text-align:left;display:flex;flex-direction:column;gap:12px;font-size:16px}
.contact-line{display:flex;gap:24px;justify-content:center;margin-top:24px;color:var(--muted);flex-wrap:wrap}
.cta-banner{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
details{border-bottom:1px solid var(--border);padding:22px 0}
summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none}
details p{color:var(--muted);margin:12px 0 0}
footer{padding:40px 0;border-top:1px solid var(--border);color:var(--muted);font-size:14px;text-align:center}
@media (max-width:760px){section{padding:64px 0}.hero{padding:80px 0 64px}.hero-split .split,.text-cols,.row{grid-template-columns:1fr;gap:20px}nav{flex-direction:column;align-items:flex-start}}
`;

export function renderWebsite(content: WebsiteContent, themeId: string, shuffle = 0): string {
  const themeIndex = Math.max(0, WEBSITE_THEMES.findIndex((theme) => theme.id === themeId));
  const t = WEBSITE_THEMES[themeIndex];
  const brand = content.brand?.name || 'Website';
  const seed = themeIndex + shuffle;

  const primary = content.sections.find((s): s is Extract<WebsiteSection, { type: 'hero' }> => s.type === 'hero');
  const navLinks = (content.nav ?? []).slice(0, 5).map((label) => `<a href="#">${escapeHtml(label)}</a>`).join('');
  const navCta = primary ? `<a class="btn btn-primary" href="#get-started">${escapeHtml(primary.primaryCta)}</a>` : '';

  const body = content.sections
    .map((section, index) => renderSection(section, index, seed, brand))
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(brand)}</title>
<style>${themeCss(t)}</style>
</head>
<body>
<div class="wrap">
<nav>
  <div class="brand">${escapeHtml(brand)}</div>
  ${navLinks ? `<div class="links">${navLinks}</div>` : ''}
  ${navCta}
</nav>
</div>
${body}
<footer>
<div class="wrap">${escapeHtml(content.footer?.note)}</div>
</footer>
</body>
</html>`;
}
