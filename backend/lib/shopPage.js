// The shop page at /shop on published sites. It uses the site's brand and colours, like the booking page.
// Each item is a small form that posts to the shop API, which sends the visitor to Stripe to pay.
const { renderDocument } = require('./pageRenderer');
const { formatPrice } = require('./shop');

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const SHOP_CSS = `:root{--radius:12px}.shop-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 32px;border-bottom:1px solid var(--border)}.shop-top a{text-decoration:none;font-weight:600;color:var(--text)}.shop-main{padding:56px 20px 96px}.shop-wrap{max-width:1000px;margin:0 auto}.shop-main h1{margin:0 0 8px;font-size:clamp(28px,4vw,40px)}.shop-lead{color:var(--muted);font-size:17px;margin:0 0 36px}.shop-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.shop-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:22px;display:flex;flex-direction:column;gap:12px}.shop-card h2{margin:0;font-size:19px}.shop-card p{margin:0;color:var(--muted);font-size:15px;flex:1}.shop-price{font-weight:700;font-size:18px}.shop-buy{border:0;border-radius:var(--radius);padding:12px 18px;font:inherit;font-weight:600;cursor:pointer;background:var(--accent);color:var(--accentText);justify-self:start}`;

const renderShopPage = ({ content, items, slug, back, apiOrigin }) => {
  const cards = items
    .map(
      (item) => `<article class="shop-card"><h2>${escapeHtml(item.name)}</h2>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="shop-price">${formatPrice(item.pricePence)}</div><form method="post" action="${escapeHtml(apiOrigin)}/api/shop/public/${escapeHtml(slug)}/checkout"><input type="hidden" name="item" value="${escapeHtml(item.id)}"><button type="submit" class="shop-buy">Buy now</button></form></article>`
    )
    .join('');
  const html = `<header class="shop-top"><a href="${escapeHtml(back)}">${escapeHtml(content.brand?.name || 'Website')}</a><a href="${escapeHtml(back)}">Back to the site</a></header><main class="shop-main"><div class="shop-wrap"><h1>Shop</h1><p class="shop-lead">Pay securely by card. The payment goes straight to the business.</p><div class="shop-grid">${cards}</div></div></main>`;
  return renderDocument({
    brand: content.brand,
    palette: content.palette,
    fonts: content.fonts,
    html,
    css: SHOP_CSS,
  });
};

module.exports = { renderShopPage };
