// The shop page at /shop on published sites. It uses the site's brand and colours, like the booking page.
// Visitors add items to a basket (kept in their browser for this site), fill in the order form, and pay once through Stripe.
const { renderDocument } = require('./pageRenderer');
const { formatPrice } = require('./shop');

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const SHOP_CSS = `:root{--radius:12px}.shop-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 32px;border-bottom:1px solid var(--border)}.shop-top a{text-decoration:none;font-weight:600;color:var(--text)}.shop-main{padding:56px 20px 96px}.shop-wrap{max-width:1000px;margin:0 auto}.shop-main h1{margin:0 0 8px;font-size:clamp(28px,4vw,40px)}.shop-main h2{margin:0 0 14px;font-size:20px}.shop-lead{color:var(--muted);font-size:17px;margin:0 0 36px}.shop-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.shop-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:22px;display:flex;flex-direction:column;gap:12px}.shop-card h2{margin:0;font-size:19px}.shop-card p{margin:0;color:var(--muted);font-size:15px;flex:1}.shop-price{font-weight:700;font-size:18px}.shop-btn{border:0;border-radius:var(--radius);padding:12px 18px;font:inherit;font-weight:600;cursor:pointer;background:var(--accent);color:var(--accentText);justify-self:start}.shop-btn[disabled]{opacity:.45;cursor:not-allowed}.shop-btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border);padding:6px 12px}.shop-section{margin-top:56px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:24px}.shop-lines{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:12px}.shop-line{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:12px}.shop-line-qty{display:flex;align-items:center;gap:8px}.shop-total{display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin:8px 0 0}.shop-empty{color:var(--muted);margin:0}.shop-form{display:grid;gap:14px;margin-top:20px}.shop-form label{display:grid;gap:6px;font-size:15px;font-weight:600}.shop-form input,.shop-form select,.shop-form textarea{font:inherit;font-weight:400;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%;box-sizing:border-box}.shop-error{color:#f87171;margin:0;font-size:15px}.shop-thanks{border:1px solid var(--accent);border-radius:var(--radius);padding:14px 18px;margin:0 0 28px}[hidden]{display:none!important}`;

// The script runs in the browser. It is written as a plain function and sent with its settings as JSON.
// It keeps the basket in localStorage, one per shop, so it carries across the site's pages.
const clientScript = function (config) {
  var key = 'vp-basket:' + config.slug;
  var prices = {};
  var names = {};
  config.items.forEach(function (item) {
    prices[item.id] = item.pricePence;
    names[item.id] = item.name;
  });
  var pounds = function (pence) { return '£' + (pence / 100).toFixed(2); };

  var read = function () {
    try {
      var saved = JSON.parse(localStorage.getItem(key) || '[]');
      return saved.filter(function (line) {
        return prices[line.id] !== undefined && line.qty >= 1 && line.qty <= 20;
      });
    } catch (e) {
      return [];
    }
  };
  var write = function (basket) {
    try { localStorage.setItem(key, JSON.stringify(basket)); } catch (e) { /* private browsing: the basket still works until the page closes */ }
  };
  var basket = read();

  var lines = document.getElementById('vp-lines');
  var total = document.getElementById('vp-total');
  var empty = document.getElementById('vp-empty');
  var pay = document.getElementById('vp-pay');
  var input = document.getElementById('vp-basket-input');
  var form = document.getElementById('vp-order');
  var error = document.getElementById('vp-error');

  var sum = function () {
    return basket.reduce(function (acc, line) { return acc + prices[line.id] * line.qty; }, 0);
  };

  var render = function () {
    lines.innerHTML = '';
    basket.forEach(function (line) {
      var li = document.createElement('li');
      li.className = 'shop-line';
      var label = document.createElement('span');
      label.textContent = names[line.id] + ' · ' + pounds(prices[line.id] * line.qty);
      var controls = document.createElement('span');
      controls.className = 'shop-line-qty';
      var minus = document.createElement('button');
      minus.type = 'button'; minus.className = 'shop-btn ghost'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Remove one ' + names[line.id]);
      minus.onclick = function () { change(line.id, -1); };
      var count = document.createElement('span');
      count.textContent = String(line.qty);
      var plus = document.createElement('button');
      plus.type = 'button'; plus.className = 'shop-btn ghost'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Add one ' + names[line.id]);
      plus.onclick = function () { change(line.id, 1); };
      controls.appendChild(minus); controls.appendChild(count); controls.appendChild(plus);
      li.appendChild(label); li.appendChild(controls);
      lines.appendChild(li);
    });
    empty.hidden = basket.length > 0;
    total.textContent = pounds(sum());
    pay.disabled = basket.length === 0;
    pay.textContent = basket.length ? 'Pay ' + pounds(sum()) : 'Add something to pay';
  };

  var change = function (id, delta) {
    var line = basket.filter(function (entry) { return entry.id === id; })[0];
    if (!line) {
      if (delta > 0) basket.push({ id: id, qty: 1 });
    } else {
      line.qty += delta;
      basket = basket.filter(function (entry) { return entry.qty >= 1; });
      basket.forEach(function (entry) { if (entry.qty > 20) entry.qty = 20; });
    }
    write(basket);
    error.textContent = '';
    render();
  };

  document.querySelectorAll('[data-add]').forEach(function (button) {
    button.addEventListener('click', function () { change(button.getAttribute('data-add'), 1); });
  });

  form.addEventListener('submit', function (event) {
    if (basket.length === 0) {
      event.preventDefault();
      error.textContent = 'Your basket is empty.';
      return;
    }
    input.value = JSON.stringify(basket.map(function (line) { return { id: line.id, qty: line.qty }; }));
    pay.disabled = true;
    pay.textContent = 'Taking you to payment…';
  });

  // Back from a finished payment: the basket was paid, so clear it and say thank you.
  if (new URLSearchParams(window.location.search).get('order') === 'thanks') {
    basket = [];
    write(basket);
    document.getElementById('vp-thanks').hidden = false;
  }
  render();
};

const fieldHtml = (field) => {
  const id = `f_${escapeHtml(field.id)}`;
  const required = field.required ? ' required' : '';
  const label = `${escapeHtml(field.label)}${field.required ? '' : ' <span style="font-weight:400;color:var(--muted)">(optional)</span>'}`;
  let control;
  if (field.type === 'textarea') {
    control = `<textarea name="${id}" rows="3" maxlength="1000"${required}></textarea>`;
  } else if (field.type === 'select') {
    control = `<select name="${id}"${required}><option value="">Choose…</option>${(field.options || []).map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select>`;
  } else {
    const type = { email: 'email', phone: 'tel', date: 'date', time: 'time' }[field.type] || 'text';
    control = `<input type="${type}" name="${id}" maxlength="${field.type === 'text' ? 200 : 254}"${required}>`;
  }
  return `<label>${label}${control}</label>`;
};

const renderShopPage = ({ content, items, slug, back, apiOrigin, form }) => {
  const cards = items
    .map(
      (item) =>
        `<article class="shop-card"><h2>${escapeHtml(item.name)}</h2>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="shop-price">${formatPrice(item.pricePence)}</div><button type="button" class="shop-btn" data-add="${escapeHtml(item.id)}">Add to basket</button></article>`
    )
    .join('');
  const fields = (Array.isArray(form) ? form : []).map(fieldHtml).join('');
  const html = `<header class="shop-top"><a href="${escapeHtml(back)}">${escapeHtml(content.brand?.name || 'Website')}</a><a href="${escapeHtml(back)}">Back to the site</a></header>
<main class="shop-main"><div class="shop-wrap">
<h1>Shop</h1><p class="shop-lead">Add items to your basket, then pay once by card. The payment goes straight to the business.</p>
<p id="vp-thanks" class="shop-thanks" hidden>Thank you. Your order has been received, and the business has been emailed.</p>
<div class="shop-grid">${cards}</div>
<section class="shop-section" aria-labelledby="vp-basket-title">
<h2 id="vp-basket-title">Your basket</h2>
<ul id="vp-lines" class="shop-lines"></ul>
<p id="vp-empty" class="shop-empty">Your basket is empty.</p>
<div class="shop-total"><span>Total</span><span id="vp-total">£0.00</span></div>
<form id="vp-order" class="shop-form" method="post" action="${escapeHtml(apiOrigin)}/api/shop/public/${escapeHtml(slug)}/checkout">
<input type="hidden" name="basket" id="vp-basket-input" value="">
${fields}
<p id="vp-error" class="shop-error" role="alert"></p>
<button type="submit" class="shop-btn" id="vp-pay">Add something to pay</button>
</form>
</section>
</div></main>`;
  const config = {
    slug,
    items: items.map((item) => ({ id: item.id, name: item.name, pricePence: item.pricePence })),
  };
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  const page = renderDocument({
    brand: content.brand,
    palette: content.palette,
    fonts: content.fonts,
    html,
    css: SHOP_CSS,
  });
  return page.replace('</body>', `<script>(${clientScript.toString()})(${json});</script></body>`);
};

module.exports = { renderShopPage };
