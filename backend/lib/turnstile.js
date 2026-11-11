// Cloudflare Turnstile: a bot check on public forms (the booking form on published sites).
// It is switched on by two environment variables. Without them the forms work as before, with no check.
//   TURNSTILE_SITE_KEY   public key, shown in the page (the widget needs it)
//   TURNSTILE_SECRET_KEY secret key, used only on the server to check each token
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const TIMEOUT_MS = 5000;

const siteKey = () => process.env.TURNSTILE_SITE_KEY || null;
const secretKey = () => process.env.TURNSTILE_SECRET_KEY || null;

// The widget markup for a form. Empty when Turnstile is not set up.
// Turnstile adds its token to the form as the field "cf-turnstile-response".
const widgetHtml = () => {
  const key = siteKey();
  if (!key || !secretKey()) return '';
  return `<script src="${SCRIPT_URL}" async defer></script><div class="cf-turnstile" data-sitekey="${key.replace(/[^A-Za-z0-9_-]/g, '')}"></div>`;
};

// Returns true when the token is valid, or when Turnstile is not set up.
// If Cloudflare cannot be reached, it returns false, so a bot cannot get past by blocking the check.
const verify = async (token, ip) => {
  const secret = secretKey();
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: String(token).slice(0, 2048) });
    if (ip) body.set('remoteip', String(ip));
    const response = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile check failed:', error.message);
    return false;
  }
};

module.exports = { widgetHtml, verify };
