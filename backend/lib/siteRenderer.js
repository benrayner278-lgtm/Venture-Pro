const crypto = require('crypto');
const { PRESETS, EFFECTS } = require('./designPresets');
const { applyStyle, googleFontsLink } = require('./styleOptions');
const { sanitizeDesign, applyBrief, mergeStyle } = require('./designBrief');

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Deterministic hash, so each layout choice is independent but the same seed always gives the same page.
const mix = (...parts) => {
  let hash = 2166136261;
  for (const char of parts.join(':')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  // Final avalanche so the low bits, which the modulo picks use, depend on every input bit.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
};

// Links point at section ids on the page, so every button and menu link goes somewhere.
const ctaButtons = (primary, secondary, alignLeft, links) =>
  `<div class="actions${alignLeft ? ' left' : ''}"><a class="btn btn-primary" href="${links.action}">${escapeHtml(primary)}</a>${
    secondary ? `<a class="btn btn-secondary" href="${links.next}">${escapeHtml(secondary)}</a>` : ''
  }</div>`;

const cardGrid = (items) =>
  items.map((item) => `<div class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('');

const renderHero = (s, variant, brand, links) => {
  const eyebrow = s.eyebrow ? `<p class="eyebrow">${escapeHtml(s.eyebrow)}</p>` : '';
  if (variant === 'split') {
    const initials = escapeHtml(brand.split(/\s+/).map((w) => w[0] || '').join('').slice(0, 3).toUpperCase());
    return `<header class="hero hero-split"><div class="wrap split"><div>${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub left">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta, true, links)}</div><div class="visual"><span>${initials}</span></div></div></header>`;
  }
  if (variant === 'editorial') {
    return `<header class="hero hero-editorial"><div class="wrap">${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub left">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta, true, links)}</div></header>`;
  }
  return `<header class="hero hero-centred"><div class="wrap centre">${eyebrow}<h1>${escapeHtml(s.headline)}</h1><p class="sub">${escapeHtml(s.subheadline)}</p>${ctaButtons(s.primaryCta, s.secondaryCta, false, links)}</div></header>`;
};

const renderSection = (section, index, seed, brand, links) => {
  let slot = 0;
  // The AI's layout for this section wins when it fits the section. Otherwise the seed picks one.
  const v = (options) => (options.includes(section.layout) ? section.layout : options[mix(seed, index, slot++) % options.length]);
  const title = (text) => `<h2>${escapeHtml(text)}</h2>`;
  switch (section.type) {
    case 'hero':
      return renderHero(section, v(['centred', 'split', 'editorial']), brand, links);

    case 'text': {
      const paragraphs = section.paragraphs || [];
      if (v(['centred', 'columns']) === 'columns') {
        return `<section><div class="wrap text-cols"><div>${title(section.title)}</div><div>${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}${paragraphs.map((p) => `<p class="lead">${escapeHtml(p)}</p>`).join('')}</div></section>`;
    }

    case 'cards': {
      const intro = section.intro ? `<p class="lead">${escapeHtml(section.intro)}</p>` : '';
      const items = section.items || [];
      const variant = v(['grid', 'list', 'numbered']);
      let body;
      if (variant === 'list') {
        body = `<div class="rows">${items.map((item) => `<div class="row"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div>`;
      } else if (variant === 'numbered') {
        body = `<div class="numbered">${items.map((item, i) => `<div class="num"><span>${String(i + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div>`;
      } else {
        body = `<div class="grid">${cardGrid(items)}</div>`;
      }
      return `<section><div class="wrap ${variant === 'list' ? '' : 'centre'}">${title(section.title)}${intro}${body}</div></section>`;
    }

    case 'steps': {
      const items = section.items || [];
      if (v(['timeline', 'columns']) === 'columns') {
        return `<section><div class="wrap">${title(section.title)}<div class="grid">${items.map((item, i) => `<div class="card"><span class="step-no">Step ${i + 1}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap narrow">${title(section.title)}<ol class="timeline">${items.map((item) => `<li><span class="dot"></span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></li>`).join('')}</ol></div></section>`;
    }

    case 'gallery': {
      const intro = section.intro ? `<p class="lead">${escapeHtml(section.intro)}</p>` : '';
      const items = section.items || [];
      const tile = (item, i, wide = false) => {
        const photo = safeImage(item.image);
        const thumb = photo
          ? `<div class="thumb has-image"><img src="${photo}" alt="${escapeHtml(item.title)}"><span class="tag">${escapeHtml(item.tag || 'Project')}</span></div>`
          : `<div class="thumb thumb-${i % 3}"><span class="tag">${escapeHtml(item.tag || 'Project')}</span></div>`;
        return `<div class="tile${wide ? ' wide' : ''}">${thumb}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`;
      };
      // Photos only show in the grid and featured layouts, so a portfolio with photos never uses the text-only list.
      const hasPhotos = items.some((item) => safeImage(item.image));
      const variant = hasPhotos ? v(['grid', 'featured']) : v(['grid', 'featured', 'list']);
      if (variant === 'featured' && items.length > 1) {
        const [first, ...rest] = items;
        return `<section><div class="wrap">${title(section.title)}${intro}<div class="gallery">${tile(first, 0, true)}${rest.map((item, i) => tile(item, i + 1)).join('')}</div></div></section>`;
      }
      if (variant === 'list') {
        return `<section><div class="wrap narrow">${title(section.title)}${intro}<div class="rows">${items.map((item) => `<div class="row"><span class="tag">${escapeHtml(item.tag || 'Project')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap">${title(section.title)}${intro}<div class="gallery">${items.map((item, i) => tile(item, i)).join('')}</div></div></section>`;
    }

    case 'pricing': {
      const tiers = section.tiers || [];
      if (v(['cards', 'rows']) === 'rows') {
        return `<section><div class="wrap narrow">${title(section.title)}<div class="rows">${tiers.map((tier) => `<div class="row"><h3>${escapeHtml(tier.name)}</h3><p>${escapeHtml(tier.description)}</p><span class="price">${escapeHtml(tier.price)}</span></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}<div class="grid">${tiers.map((tier) => `<div class="card price-card"><h3>${escapeHtml(tier.name)}</h3><div class="price">${escapeHtml(tier.price)}</div><p>${escapeHtml(tier.description)}</p><ul>${(tier.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>`).join('')}</div></div></section>`;
    }

    case 'faq': {
      const items = section.items || [];
      if (v(['accordion', 'columns']) === 'columns') {
        return `<section><div class="wrap">${title(section.title)}<div class="grid">${items.map((item) => `<div class="card"><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></div>`).join('')}</div></div></section>`;
      }
      return `<section><div class="wrap narrow">${title(section.title)}${items.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</div></section>`;
    }

    case 'contact': {
      const details = [
        section.email ? `<a href="mailto:${escapeHtml(section.email)}">${escapeHtml(section.email)}</a>` : '',
        section.phone ? `<span>${escapeHtml(section.phone)}</span>` : '',
        section.address ? `<span>${escapeHtml(section.address)}</span>` : '',
        section.hours ? `<span>${escapeHtml(section.hours)}</span>` : '',
      ].filter(Boolean).join('');
      if (v(['centred', 'split']) === 'split') {
        return `<section><div class="wrap text-cols"><div>${title(section.title)}<p class="lead">${escapeHtml(section.body)}</p></div><div class="card contact-card">${details}</div></div></section>`;
      }
      return `<section><div class="wrap centre">${title(section.title)}<p class="lead">${escapeHtml(section.body)}</p><div class="contact-line">${details}</div></div></section>`;
    }

    case 'cta': {
      const body = section.body ? `<p class="lead">${escapeHtml(section.body)}</p>` : '';
      const banner = v(['banner', 'inline']) === 'banner' ? ' cta-banner' : '';
      return `<section class="${banner.trim()}"><div class="wrap centre"><h2>${escapeHtml(section.headline)}</h2>${body}<div class="actions"><a class="btn btn-primary" href="${links.contact}">${escapeHtml(section.button)}</a></div></div></section>`;
    }

    case 'custom': {
      const heading = section.title ? title(section.title) : '';
      return `<section><div class="wrap narrow">${heading}${(section.paragraphs || []).map((p) => `<p class="lead">${escapeHtml(p)}</p>`).join('')}</div></section>`;
    }

    default:
      return '';
  }
};

const themeCss = (t) => `
:root{--bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--accent-text:${t.accentText};--border:${t.border};--radius:${t.radius};--space:${t.space}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:${t.font};line-height:1.6;-webkit-font-smoothing:antialiased;filter:${t.filter}}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.narrow{max-width:760px}
nav{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px 0;flex-wrap:wrap}
nav .links{display:flex;gap:24px;font-size:14px;color:var(--muted)}
.brand{font-weight:700;letter-spacing:-0.01em;font-size:18px}
.btn{display:inline-block;padding:14px 26px;border-radius:var(--radius);font-weight:600;text-decoration:none;font-size:15px}
.btn-primary{background:var(--accent);color:var(--accent-text)}
.btn-secondary{border:1px solid var(--border)}
section{padding:calc(96px * var(--space)) 0;border-top:1px solid var(--border)}
.hero{padding:120px 0 104px;border-top:none;background:${t.heroBackground}}
.hero-centred{text-align:center}
.hero-editorial .wrap{max-width:820px}
.hero-split .split{display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center}
.visual{aspect-ratio:4/3;border-radius:var(--radius);background:linear-gradient(135deg,var(--surface),var(--accent));display:flex;align-items:center;justify-content:center;color:var(--accent-text);font-size:64px;font-family:${t.headingFont};font-weight:${t.headingWeight};letter-spacing:-0.04em}
.eyebrow{font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin:0 0 18px}
h1,h2,h3{font-family:${t.headingFont};font-weight:${t.headingWeight};text-transform:${t.headingTransform};letter-spacing:-0.02em;line-height:1.1}
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
.thumb.has-image{overflow:hidden;background:var(--surface)}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit}
.footer-contact{margin-top:10px;font-size:13px}
.tile h3{font-size:18px;text-transform:none;font-weight:600;margin:0 0 6px}
.tile p{margin:0;color:var(--muted);font-size:15px}
.price-card ul{list-style:none;padding:0;margin:18px 0 0;color:var(--muted);font-size:15px;text-align:left}
.price-card li{padding:6px 0;border-top:1px solid var(--border)}
.price{font-family:${t.headingFont};font-size:32px;font-weight:${t.headingWeight};margin:8px 0 12px;letter-spacing:-0.02em}
.contact-card{text-align:left;display:flex;flex-direction:column;gap:12px;font-size:16px}
.contact-line{display:flex;gap:24px;justify-content:center;margin-top:24px;color:var(--muted);flex-wrap:wrap}
.cta-banner{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
details{border-bottom:1px solid var(--border);padding:22px 0}
summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none}
details p{color:var(--muted);margin:12px 0 0}
footer{padding:40px 0;border-top:1px solid var(--border);color:var(--muted);font-size:14px;text-align:center}
@media (max-width:760px){section{padding:64px 0}.hero{padding:80px 0 64px}.hero-split .split,.text-cols,.row{grid-template-columns:1fr;gap:20px}nav{flex-direction:column;align-items:flex-start}.effect-stack section{margin-top:0}}
@supports (animation-timeline: view()){
.effect-reveal section>.wrap{animation:rise linear both;animation-timeline:view();animation-range:entry 0% cover 35%}
.effect-stack section{position:relative;margin-top:-56px;border-radius:var(--radius) var(--radius) 0 0;box-shadow:0 -24px 48px rgba(0,0,0,0.28);animation:lift linear both;animation-timeline:view();animation-range:entry 0% cover 40%}
.effect-stack section:not(.cta-banner){background:var(--bg)}
}
@keyframes rise{from{opacity:0;transform:translateY(48px)}to{opacity:1;transform:none}}
@keyframes lift{from{transform:translateY(96px)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.effect-reveal section>.wrap,.effect-stack section{animation:none}}
`;

// Only JPEG photos stored in the site content are shown. Anything else is dropped.
const SAFE_IMAGE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const safeImage = (src) => (SAFE_IMAGE.test(src || '') ? src : '');

// Applies the owner's contact details and portfolio on top of the AI's sections.
const compose = (content) => {
  const contact = content.contact || {};
  const hasContact = Object.values(contact).some(Boolean);
  let sections = Array.isArray(content.sections)
    ? content.sections.map((s) =>
        s.type === 'contact' ? { ...s, email: contact.email || s.email, phone: contact.phone || s.phone, address: contact.address, hours: contact.hours } : s,
      )
    : [];
  if (hasContact && !sections.some((s) => s.type === 'contact')) {
    sections = [
      ...sections,
      { type: 'contact', title: 'Contact us', body: 'Get in touch and we will get back to you.', email: contact.email, phone: contact.phone, address: contact.address, hours: contact.hours },
    ];
  }

  const portfolio = content.portfolio;
  if (portfolio && typeof portfolio === 'object') {
    const items = Array.isArray(portfolio.items) ? portfolio.items : [];
    const block = items.length ? { type: 'gallery', title: portfolio.title || 'Our work', intro: '', items } : null;
    const first = sections.findIndex((s) => s.type === 'gallery');
    if (first === -1) {
      if (block) {
        const cta = sections.findIndex((s) => s.type === 'cta');
        const at = cta === -1 ? sections.length : cta;
        sections = [...sections.slice(0, at), block, ...sections.slice(at)];
      }
    } else {
      sections = sections.flatMap((s, i) => (s.type !== 'gallery' ? [s] : i === first && block ? [block] : []));
    }
  }
  return { sections, contact };
};

// Builds the page parts shared by the public page and the design fingerprint.
const buildPage = (content, themeId, shuffle) => {
  const brief = sanitizeDesign(content.design);
  const preset = applyBrief(PRESETS.find((item) => item.id === themeId) || PRESETS[0], brief);
  const t = applyStyle(preset, mergeStyle(brief, content.style));
  const brand = content.brand?.name || 'Website';
  const seed = Number(shuffle) || 0;
  const effect = brief?.effect ?? EFFECTS[mix(seed, 'effect') % EFFECTS.length];
  const { sections, contact } = compose(content);

  const primary = sections.find((s) => s.type === 'hero');
  // Each section has an id (s0, s1, ...). Menu links go to the section after the hero, in order.
  const contactIndex = sections.findIndex((section) => section.type === 'contact');
  const ctaIndex = sections.findIndex((section) => section.type === 'cta');
  const actionIndex = contactIndex !== -1 ? contactIndex : ctaIndex;
  const links = {
    action: actionIndex === -1 ? '#top' : `#s${actionIndex}`,
    contact: contactIndex === -1 ? '#top' : `#s${contactIndex}`,
    next: sections.length > 1 ? '#s1' : '#top',
  };
  const navLinks = (content.nav || [])
    .slice(0, 5)
    .map((label, i) => `<a href="${sections.length > i + 1 ? `#s${i + 1}` : '#top'}">${escapeHtml(label)}</a>`)
    .join('');
  const navCta = primary ? `<a class="btn btn-primary" href="${links.action}">${escapeHtml(primary.primaryCta)}</a>` : '';
  const body = sections
    .map((section, index) => renderSection(section, index, seed, brand, links).replace(/^<(section|header)/, `<$1 id="s${index}"`))
    .join('\n');

  const css = themeCss(t);
  const navHtml = `<div class="wrap" id="top">
<nav>
  <div class="brand">${escapeHtml(brand)}</div>
  ${navLinks ? `<div class="links">${navLinks}</div>` : ''}
  ${navCta}
</nav>
</div>`;
  const footerContact = [contact.email, contact.phone, contact.address].filter(Boolean).map(escapeHtml).join(' · ');
  const footer = `<footer>
<div class="wrap">${escapeHtml(content.footer?.note)}${footerContact ? `<div class="footer-contact">${footerContact}</div>` : ''}</div>
</footer>`;
  return { brand, effect, css, navHtml, body, footer };
};

// The booking form. It works without scripts: the browser posts it straight to the booking API.
const BOOKING_CSS = `.booking{display:grid;gap:16px;text-align:left;max-width:520px;margin:32px auto 0}.booking label{display:grid;gap:6px;font-size:15px;color:var(--muted)}.booking input,.booking select,.booking textarea{font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px}.booking textarea{min-height:90px;resize:vertical}.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}`;

const renderBooking = (view) => {
  const services = view.services
    .map((service) => `<option value="${escapeHtml(service.name)}">${escapeHtml(service.name)}${service.minutes ? ` (${service.minutes} min)` : ''}${service.price ? ` · ${escapeHtml(service.price)}` : ''}</option>`)
    .join('');
  const times = view.slots.map((slot) => `<option value="${escapeHtml(slot.value)}">${escapeHtml(slot.label)}</option>`).join('');
  const form = view.slots.length
    ? `<form class="booking" method="post" action="${escapeHtml(view.action)}">
<label>Service<select name="service" required>${services}</select></label>
<label>Time<select name="slot" required>${times}</select></label>
<label>Your name<input name="name" required maxlength="100" autocomplete="name"></label>
<label>Email<input type="email" name="email" required maxlength="254" autocomplete="email"></label>
<label>Phone (optional)<input name="phone" maxlength="40" autocomplete="tel"></label>
<label>Notes (optional)<textarea name="notes" maxlength="500"></textarea></label>
<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
<button type="submit" class="btn btn-primary">Request this time</button>
</form>`
    : `<p class="lead">No times are free in the next ${escapeHtml(view.daysAhead)} days. Please get in touch.</p>`;
  return `<section id="book"><div class="wrap narrow centre"><h2>Book a time</h2><p class="lead">Choose a service and a time. We will be in touch to confirm.</p>${form}</div></section>`;
};

// Renders the structured site content as a standalone page. Output contains no scripts.
// extras.booking adds the booking form. Pass it only for published sites.
const renderSite = (content, themeId = 'midnight', shuffle = 0, extras = {}) => {
  const { brand, effect, css, navHtml, body, footer } = buildPage(content, themeId, shuffle);
  const booking = extras.booking ? renderBooking(extras.booking) : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(brand)}</title>
${googleFontsLink(content.style)}
<style>${css}${booking ? BOOKING_CSS : ''}</style>
</head>
<body class="effect-${effect}">
${navHtml}
${body}
${booking}
${footer}
</body>
</html>`;
};

// A fingerprint of how the page looks: its CSS and layout, without the text.
// Two sites with the same fingerprint would look the same to a visitor.
const designKey = (content, themeId, shuffle) => {
  const { effect, css, navHtml, body, footer } = buildPage(content, themeId, shuffle);
  // Photo data is left out so two sites with the same layout still match, whatever photos they use.
  const structure = `${effect}|${navHtml}${body}${footer}`.replace(/>[^<]+</g, '><').replace(/src="[^"]*"/g, 'src=""');
  return crypto.createHash('sha256').update(`${css}|${structure}`).digest('hex').slice(0, 24);
};

// Builder preview only. Each piece of text is wrapped so the builder can find the field it came from when it is double-clicked.
const EDIT_SKIP_KEYS = new Set(['type', 'layout', 'style', 'design', 'nav', 'image', 'brand']);
const TEXT_TOKEN = /\u0001(\d+)\u0002/g;
const EDIT_HELPERS = `<style>[data-edit]{cursor:pointer;outline:1px dashed transparent;outline-offset:4px;transition:outline-color .2s}[data-edit]:hover{outline-color:currentColor}</style>
<script>document.addEventListener('dblclick',function(e){var el=e.target.closest&&e.target.closest('[data-edit]');if(!el)return;var s=window.getSelection();if(s)s.removeAllRanges();parent.postMessage({type:'edit-text',id:el.getAttribute('data-edit')},'*')});document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;e.preventDefault();var el=document.getElementById(a.getAttribute('href').slice(1));if(el)el.scrollIntoView({behavior:'smooth'});});</script>
`;

// Swaps each non-empty text value for a marker, keeping the path to where it came from.
const markText = (value, path, leaves) => {
  if (Array.isArray(value)) return value.map((item, i) => markText(item, [...path, i], leaves));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, EDIT_SKIP_KEYS.has(key) ? item : markText(item, [...path, key], leaves)]),
    );
  }
  if (typeof value === 'string' && value.trim()) {
    leaves.push({ path, text: value });
    return `\u0001${leaves.length - 1}\u0002`;
  }
  return value;
};

const renderEditablePreview = (content, themeId = 'midnight', shuffle = 0) => {
  const leaves = [];
  const marked = markText(content, [], leaves);
  const html = renderSite(marked, themeId, shuffle);
  // Markers in the title stay plain text. Markers between tags get a span the builder can click.
  const headEnd = html.indexOf('</head>');
  const page = html.replace(TEXT_TOKEN, (token, n, offset, all) => {
    const escaped = escapeHtml(leaves[Number(n)].text);
    const betweenTags = offset > headEnd && all[offset - 1] === '>' && all[offset + token.length] === '<';
    return betweenTags ? `<span data-edit="${n}">${escaped}</span>` : escaped;
  });
  const paths = Object.fromEntries(leaves.map((leaf, i) => [i, leaf.path]));
  return { html: page.replace('</body>', `${EDIT_HELPERS}</body>`), paths };
};

module.exports = { renderSite, designKey, renderEditablePreview };
