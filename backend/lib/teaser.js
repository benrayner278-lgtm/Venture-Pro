// The free-plan preview. Only the headline is sent. The rest of the page is replaced with blurred placeholder bars,
// so the full content never reaches a free account, even when it is inspected in the browser.
const { renderSite } = require('./siteRenderer');
const { renderPage } = require('./pageRenderer');

const TEASER_CSS = `.teaser-lock{position:relative;padding:72px 20px 96px;text-align:center;overflow:hidden}
.teaser-blur{filter:blur(9px);opacity:.9;max-width:920px;margin:0 auto;display:grid;gap:18px}
.teaser-blur span{display:block;height:26px;border-radius:999px;background:rgba(128,128,128,.28)}
.teaser-blur .wide{height:120px;border-radius:18px}
.teaser-blur .short{width:45%;margin:0 auto}
.teaser-note{position:relative;margin:-40px auto 0;display:inline-block;padding:12px 18px;border-radius:999px;background:rgba(20,20,20,.86);color:#fff;font:600 15px/1.4 system-ui,sans-serif}
.teaser-head{padding:120px 20px 40px;text-align:center}
.teaser-head h1{font-size:clamp(40px,6vw,76px);max-width:900px;margin:0 auto}`;

const LOCK_HTML = `<section class="teaser-lock" aria-label="Preview: choose a plan to see the full website"><div class="teaser-blur" aria-hidden="true"><span class="wide"></span><span></span><span class="short"></span><span class="wide"></span><span></span><span class="short"></span></div><p class="teaser-note">Choose a paid plan to see the full website and download it.</p></section>`;

const escape = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// The headline the free preview shows: the first heading on the page, or the brand name.
const headlineOf = (content) => {
  if (content.format === 'page') {
    const match = String(content.body || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return (match ? match[1].replace(/<[^>]+>/g, '') : '').trim() || content.brand?.name || 'Your website';
  }
  const hero = (content.sections || []).find((section) => section.type === 'hero');
  return hero?.headline || content.brand?.name || 'Your website';
};

// Returns the teaser document for a free account.
const renderTeaser = (content, themeId, shuffle) => {
  const headline = headlineOf(content);
  if (content.format === 'page') {
    return renderPage({
      brand: content.brand,
      palette: content.palette,
      fonts: content.fonts,
      body: `<section class="teaser-head"><h1>${escape(headline)}</h1></section>${LOCK_HTML}`,
      css: TEASER_CSS,
    });
  }
  const teaserContent = {
    brand: content.brand,
    nav: [],
    footer: { note: '' },
    design: content.design,
    sections: [{ type: 'hero', eyebrow: '', headline, subheadline: '', primaryCta: 'Choose a plan', secondaryCta: '' }],
  };
  return renderSite(teaserContent, themeId, shuffle)
    .replace('</head>', `<style>${TEASER_CSS}</style>\n</head>`)
    .replace('<footer', `${LOCK_HTML}\n<footer`);
};

module.exports = { renderTeaser, headlineOf };
