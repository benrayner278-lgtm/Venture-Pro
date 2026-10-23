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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (host === ROOT_DOMAIN || !host.endsWith(`.${ROOT_DOMAIN}`)) {
      return fetch(request);
    }

    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
    if (RESERVED.has(slug)) {
      return fetch(request);
    }
    if (!SLUG_PATTERN.test(slug)) {
      return notFound();
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    let upstream;
    try {
      upstream = await fetch(`${ORIGIN}/api/public/sites/${slug}`, {
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
  },
};
