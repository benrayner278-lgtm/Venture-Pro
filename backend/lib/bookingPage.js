// The booking page on page-format sites, served at /book. It uses the site's brand and colours, but not the
// AI's markup, because the booking form needs inputs that the page sanitiser removes.
const { renderDocument } = require('./pageRenderer');
const { BOOKING_CSS, renderBooking } = require('./siteRenderer');

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const BOOKING_PAGE_CSS = `:root{--radius:12px}.book-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 32px;border-bottom:1px solid var(--border)}.book-top a{text-decoration:none;font-weight:600;color:var(--text)}.book-main{padding:56px 20px 96px}.wrap{max-width:1120px;margin:0 auto}.narrow{max-width:640px}.centre{text-align:center}.lead{color:var(--muted);font-size:17px}.btn{display:inline-block;padding:14px 26px;border:0;border-radius:var(--radius);font:inherit;font-weight:600;cursor:pointer;background:var(--accent);color:var(--accentText)}.booking .btn{justify-self:start}`;

const renderBookingPage = ({ content, booking }) => {
  const html = `<header class="book-top"><a href="/">${escapeHtml(content.brand?.name || 'Website')}</a><a href="/">Back to the site</a></header><main class="book-main">${renderBooking(booking)}</main>`;
  return renderDocument({
    brand: content.brand,
    palette: content.palette,
    fonts: content.fonts,
    html,
    css: `${BOOKING_CSS}${BOOKING_PAGE_CSS}`,
  });
};

module.exports = { renderBookingPage };
