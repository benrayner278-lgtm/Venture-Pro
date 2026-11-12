const ORIGIN = 'https://venture-pro-production.up.railway.app';
const ROOT_DOMAIN = 'venture-pro.io';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'support', 'help', 'blog', 'static', 'cdn', 'ftp',
  'dashboard', 'login', 'signup', 'billing', 'status', 'docs', 'account', 'settings',
]);

const notFound = () =>
  new Response('<!doctype html><title>Not found</title><p>This site does not exist.</p>', {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

const readOnly = (request) => request.method === 'GET' || request.method === 'HEAD';

const methodNotAllowed = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

// Fetches the published site from the backend. The backend answers 404 for unknown or unverified addresses.
const fetchSite = async (request, path) => {
  let upstream;
  try {
    upstream = await fetch(`${ORIGIN}${path}`, {
      method: request.method,
      headers: { Accept: 'text/html' },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
  } catch (error) {
    return new Response('This site is temporarily unavailable.', { status: 502 });
  }

  if (upstream.status === 404) {
    return notFound();
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
};

// The only paths a site has: its home page, the booking page and the shop. Anything else is not found.
const pageSuffix = (pathname) => {
  if (pathname === '/' || pathname === '') return '';
  if (pathname === '/book' || pathname === '/book/') return '/book';
  if (pathname === '/shop' || pathname === '/shop/') return '/shop';
  return null;
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (host === ROOT_DOMAIN) {
      return fetch(request);
    }

    // The owner's own domain, such as www.yourbusiness.com. The backend checks that it is verified.
    if (!host.endsWith(`.${ROOT_DOMAIN}`)) {
      if (!readOnly(request)) return methodNotAllowed();
      const suffix = pageSuffix(url.pathname);
      if (suffix === null) return notFound();
      return fetchSite(request, `/api/public/sites/domain/${host}${suffix}`);
    }

    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
    if (RESERVED.has(slug)) {
      return fetch(request);
    }
    if (!SLUG_PATTERN.test(slug)) {
      return notFound();
    }

    if (!readOnly(request)) return methodNotAllowed();

    const suffix = pageSuffix(url.pathname);
    if (suffix === null) return notFound();
    return fetchSite(request, `/api/public/sites/${slug}${suffix}`);
  },
};
