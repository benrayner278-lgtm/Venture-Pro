// The shop page at /shop on published sites (and /book, which goes to the same place).
// One page for everything the business sells: products, booked times, and enquiries.
// Visitors add products and times to one basket and pay once. The page only shows the sections the owner has set up.
const { renderDocument } = require('./pageRenderer');
const { formatPrice } = require('./shop');

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const SHOP_CSS = `:root{--radius:12px}.shop-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 32px;border-bottom:1px solid var(--border)}.shop-top a{text-decoration:none;font-weight:600;color:var(--text)}.shop-main{padding:56px 20px 96px}.shop-wrap{max-width:1000px;margin:0 auto}.shop-main h1{margin:0 0 8px;font-size:clamp(28px,4vw,40px)}.shop-main h2{margin:0 0 14px;font-size:20px}.shop-lead{color:var(--muted);font-size:17px;margin:0 0 36px}.shop-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.shop-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:22px;display:flex;flex-direction:column;gap:12px}.shop-card h2{margin:0;font-size:19px}.shop-card p{margin:0;color:var(--muted);font-size:15px;flex:1}.shop-price{font-weight:700;font-size:18px}.shop-btn{border:0;border-radius:var(--radius);padding:12px 18px;font:inherit;font-weight:600;cursor:pointer;background:var(--accent);color:var(--accentText);justify-self:start}.shop-btn[disabled]{opacity:.45;cursor:not-allowed}.shop-btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border);padding:6px 12px}.shop-section{margin-top:56px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:24px}.shop-lines{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:12px}.shop-line{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:12px}.shop-line-qty{display:flex;align-items:center;gap:8px}.shop-total{display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin:8px 0 0}.shop-empty{color:var(--muted);margin:0}.shop-form{display:grid;gap:14px;margin-top:20px}.shop-form label{display:grid;gap:6px;font-size:15px;font-weight:600}.shop-form input,.shop-form select,.shop-form textarea{font:inherit;font-weight:400;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%;box-sizing:border-box}.shop-error{color:#f87171;margin:0;font-size:15px}.shop-thanks{border:1px solid var(--accent);border-radius:var(--radius);padding:14px 18px;margin:0 0 28px}[hidden]{display:none!important}.shop-select{font:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%;box-sizing:border-box}.shop-row{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:end}.shop-row label{display:grid;gap:6px;font-weight:600;font-size:15px}.shop-nav{display:flex;gap:18px;font-size:15px}.shop-nav a{color:var(--muted);text-decoration:none}.shop-contact{font-size:17px;line-height:1.8}.shop-contact a{color:var(--text)}.shop-note{color:var(--muted);font-size:15px;margin:0 0 14px}`;

// The script runs in the browser. It is a plain function, sent with its settings as JSON.
// The basket is kept in localStorage, one per shop, so it carries across the site's pages.
const clientScript = function (config) {
  var key = 'vp-basket:' + config.slug;
  var pounds = function (pence) { return pence > 0 ? '£' + (pence / 100).toFixed(2) : 'Free'; };
  var products = {};
  config.products.forEach(function (item) { products[item.id] = item; });
  var offers = {};
  var slotLabels = {};
  config.offers.forEach(function (offer) {
    offers[offer.name] = offer;
    offer.days.forEach(function (day) {
      day.slots.forEach(function (slot) { slotLabels[offer.name + '|' + slot.value] = day.label + ' ' + slot.label; });
    });
  });

  // A basket line is either a product ({type:'product', id, qty}) or a booked time ({type:'slot', service, slot}).
  var validLine = function (line) {
    if (!line) return false;
    if (line.type === 'product') return products[line.id] !== undefined && line.qty >= 1 && line.qty <= 20;
    if (line.type === 'slot') return offers[line.service] !== undefined && slotLabels[line.service + '|' + line.slot] !== undefined;
    return false;
  };
  var read = function () {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]').filter(validLine).map(function (line) {
        // A booked time is always one place, so its quantity is 1.
        return line.type === 'slot' ? { type: 'slot', service: line.service, slot: line.slot, qty: 1 } : line;
      });
    } catch (e) {
      return [];
    }
  };
  var write = function (basket) {
    try { localStorage.setItem(key, JSON.stringify(basket)); } catch (e) { /* private browsing: the basket lasts until the page closes */ }
  };
  var priceOf = function (line) {
    return line.type === 'product' ? products[line.id].pricePence * line.qty : offers[line.service].pricePence;
  };
  var nameOf = function (line) {
    return line.type === 'product' ? products[line.id].name : line.service + ' · ' + slotLabels[line.service + '|' + line.slot];
  };
  var basket = read();

  var lines = document.getElementById('vp-lines');
  var total = document.getElementById('vp-total');
  var empty = document.getElementById('vp-empty');
  var pay = document.getElementById('vp-pay');
  var input = document.getElementById('vp-basket-input');
  var form = document.getElementById('vp-order');
  var error = document.getElementById('vp-error');
  var sum = function () { return basket.reduce(function (acc, line) { return acc + priceOf(line); }, 0); };
  var sameLine = function (a, b) {
    return a.type === b.type && (a.type === 'product' ? a.id === b.id : a.service === b.service && a.slot === b.slot);
  };

  var render = function () {
    lines.innerHTML = '';
    basket.forEach(function (line) {
      var li = document.createElement('li');
      li.className = 'shop-line';
      var label = document.createElement('span');
      label.textContent = nameOf(line) + ' · ' + pounds(priceOf(line));
      var controls = document.createElement('span');
      controls.className = 'shop-line-qty';
      if (line.type === 'product') {
        var minus = document.createElement('button');
        minus.type = 'button'; minus.className = 'shop-btn ghost'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Remove one ' + products[line.id].name);
        minus.onclick = function () { change(line, -1); };
        var count = document.createElement('span');
        count.textContent = String(line.qty);
        var plus = document.createElement('button');
        plus.type = 'button'; plus.className = 'shop-btn ghost'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Add one ' + products[line.id].name);
        plus.onclick = function () { change(line, 1); };
        controls.appendChild(minus); controls.appendChild(count); controls.appendChild(plus);
      }
      var remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'shop-btn ghost'; remove.textContent = 'Remove';
      remove.onclick = function () { change(line, -999); };
      controls.appendChild(remove);
      li.appendChild(label); li.appendChild(controls);
      lines.appendChild(li);
    });
    empty.hidden = basket.length > 0;
    total.textContent = pounds(sum());
    pay.disabled = basket.length === 0;
    pay.textContent = basket.length === 0 ? 'Add something to pay' : (sum() > 0 ? 'Pay ' + pounds(sum()) : 'Confirm booking');
  };

  var change = function (line, delta) {
    var found = basket.filter(function (entry) { return sameLine(entry, line); })[0];
    if (!found) {
      if (delta > 0) basket.push(line.type === 'product' ? { type: 'product', id: line.id, qty: 1 } : { type: 'slot', service: line.service, slot: line.slot, qty: 1 });
    } else if (line.type === 'product') {
      found.qty = delta < -1 ? 0 : found.qty + delta;
      if (found.qty > 20) found.qty = 20;
    } else if (delta < 0) {
      found.qty = 0;
    }
    basket = basket.filter(function (entry) { return entry.qty >= 1; });
    write(basket);
    error.textContent = '';
    render();
  };

  document.querySelectorAll('[data-add]').forEach(function (button) {
    button.addEventListener('click', function () {
      change({ type: 'product', id: button.getAttribute('data-add'), qty: 1 }, 1);
    });
  });

  // Booking picker: choose a service, then a time. Times are grouped by day.
  var serviceSelect = document.getElementById('vp-service');
  var timeSelect = document.getElementById('vp-time');
  var bookError = document.getElementById('vp-book-error');
  var fillTimes = function () {
    timeSelect.innerHTML = '';
    var offer = offers[serviceSelect.value];
    if (!offer) return;
    var first = document.createElement('option');
    first.value = ''; first.textContent = offer.days.length ? 'Choose a time' : 'No times free in the next few weeks';
    timeSelect.appendChild(first);
    offer.days.forEach(function (day) {
      var group = document.createElement('optgroup');
      group.label = day.label;
      day.slots.forEach(function (slot) {
        var option = document.createElement('option');
        option.value = slot.value;
        option.textContent = slot.label;
        group.appendChild(option);
      });
      timeSelect.appendChild(group);
    });
  };
  if (serviceSelect) {
    serviceSelect.addEventListener('change', fillTimes);
    fillTimes();
    document.getElementById('vp-book-add').addEventListener('click', function () {
      bookError.textContent = '';
      if (!timeSelect.value) { bookError.textContent = 'Choose a time first.'; return; }
      var line = { type: 'slot', service: serviceSelect.value, slot: timeSelect.value };
      if (basket.some(function (entry) { return sameLine(entry, line); })) { bookError.textContent = 'That time is already in your basket.'; return; }
      change(line, 1);
    });
  }

  form.addEventListener('submit', function (event) {
    if (basket.length === 0) {
      event.preventDefault();
      error.textContent = 'Your basket is empty.';
      return;
    }
    input.value = JSON.stringify(basket.map(function (line) {
      return line.type === 'product' ? { id: line.id, qty: line.qty } : { slot: line.slot, service: line.service };
    }));
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

const priceText = (pence, text) => (pence > 0 ? formatPrice(pence) : text || 'Free');

const renderShopPage = ({ content, items, slug, back, apiOrigin, form, bookings, contact }) => {
  const hasProducts = items.length > 0;
  const hasBookings = Boolean(bookings && bookings.offers.length > 0);
  const canBuy = hasProducts || hasBookings;
  const brand = escapeHtml(content.brand?.name || 'Website');
  const title = hasProducts && hasBookings ? 'Shop and bookings' : hasBookings ? (bookings.kind === 'sessions' ? 'Book a place' : 'Book') : hasProducts ? 'Shop' : 'Get in touch';
  const nav = [hasProducts ? '<a href="#shop">Shop</a>' : '', hasBookings ? '<a href="#book">Book</a>' : '', contact ? '<a href="#contact">Contact</a>' : ''].join('');

  const cards = items
    .map(
      (item) =>
        `<article class="shop-card"><h2>${escapeHtml(item.name)}</h2>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="shop-price">${formatPrice(item.pricePence)}</div><button type="button" class="shop-btn" data-add="${escapeHtml(item.id)}">Add to basket</button></article>`
    )
    .join('');
  const productSection = hasProducts ? `<section id="shop" class="shop-section-top"><h2>Shop</h2><div class="shop-grid">${cards}</div></section>` : '';

  const bookingSection = hasBookings
    ? `<section id="book" class="shop-section"><h2>${escapeHtml(bookings.heading)}</h2>
<p class="shop-note">Pick what you would like, then a time. Your time is held while you pay.</p>
<div class="shop-row">
<label>${bookings.kind === 'sessions' ? 'Class' : 'Service'}<select id="vp-service" class="shop-select">${bookings.offers.map((offer) => `<option value="${escapeHtml(offer.name)}">${escapeHtml(offer.name)} · ${escapeHtml(priceText(offer.pricePence, offer.price))}</option>`).join('')}</select></label>
<label>Time<select id="vp-time" class="shop-select"></select></label>
<button type="button" class="shop-btn" id="vp-book-add">Add to basket</button>
</div>
<p id="vp-book-error" class="shop-error" role="alert"></p>
${bookings.kind === 'call' && bookings.callDetails ? `<p class="shop-note">${escapeHtml(bookings.callDetails)}</p>` : ''}
</section>`
    : '';

  const basketSection = canBuy
    ? `<section class="shop-section" aria-labelledby="vp-basket-title">
<h2 id="vp-basket-title">Your basket</h2>
<ul id="vp-lines" class="shop-lines"></ul>
<p id="vp-empty" class="shop-empty">Your basket is empty.</p>
<div class="shop-total"><span>Total</span><span id="vp-total">£0.00</span></div>
<form id="vp-order" class="shop-form" method="post" action="${escapeHtml(apiOrigin)}/api/shop/public/${escapeHtml(slug)}/checkout">
<input type="hidden" name="basket" id="vp-basket-input" value="">
${(Array.isArray(form) ? form : []).map(fieldHtml).join('')}
<p id="vp-error" class="shop-error" role="alert"></p>
<button type="submit" class="shop-btn" id="vp-pay">Add something to pay</button>
</form>
</section>`
    : '';

  // Enquiry details are printed once, and only when there is nothing to buy or book online.
  const contactSection = contact && !canBuy
    ? `<section id="contact" class="shop-section"><h2>Get in touch</h2><p class="shop-note">Contact us for any products you would like.</p><div class="shop-contact"><div>Email: <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></div><div>Phone: <a href="tel:${escapeHtml(contact.phone.replace(/[^+0-9]/g, ''))}">${escapeHtml(contact.phone)}</a></div></div></section>`
    : '';

  const html = `<header class="shop-top"><a href="${escapeHtml(back)}">${brand}</a><nav class="shop-nav">${nav}<a href="${escapeHtml(back)}">Back to the site</a></nav></header>
<main class="shop-main"><div class="shop-wrap">
<h1>${escapeHtml(title)}</h1><p class="shop-lead">${canBuy ? 'Add what you would like to your basket, then pay once by card. The payment goes straight to the business.' : 'Contact the business below.'}</p>
<p id="vp-thanks" class="shop-thanks" hidden>Thank you. Your order has been received, and the business has been emailed.</p>
${productSection}
${bookingSection}
${basketSection}
${contactSection}
</div></main>`;

  // Settings for the script. Strings are escaped, so the JSON cannot close the script tag early.
  const config = {
    slug,
    products: items.map((item) => ({ id: item.id, name: item.name, pricePence: item.pricePence })),
    offers: hasBookings
      ? bookings.offers.map((offer) => ({ name: offer.name, pricePence: offer.pricePence, days: offer.days }))
      : [],
  };
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  const page = renderDocument({
    brand: content.brand,
    palette: content.palette,
    fonts: content.fonts,
    html,
    css: SHOP_CSS,
  });
  const script = canBuy ? `<script>(${clientScript.toString()})(${json});</script>` : '';
  return page.replace('</body>', `${script}</body>`);
};

module.exports = { renderShopPage };
