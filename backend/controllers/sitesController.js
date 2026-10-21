const { PrismaClient } = require('@prisma/client');
const { renderSite } = require('../lib/siteRenderer');

const prisma = new PrismaClient();

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'support', 'help', 'blog', 'static', 'cdn', 'ftp',
  'dashboard', 'login', 'signup', 'billing', 'status', 'docs', 'account', 'settings',
]);
const PLAN_LIMITS = { free: 0, starter: 1, professional: 5, enterprise: Infinity };
const MAX_CONTENT_BYTES = 200 * 1024;
const THEME_IDS = ['midnight', 'paper', 'bold', 'minimal', 'warm'];

const slugProblem = (slug) => {
  if (!SLUG_PATTERN.test(slug)) return 'Use 3 to 40 letters, numbers or hyphens, starting and ending with a letter or number.';
  if (RESERVED_SLUGS.has(slug)) return 'That address is reserved. Please choose another.';
  return null;
};

const validContent = (content) =>
  content && typeof content === 'object' && content.brand && Array.isArray(content.sections) && content.sections.length > 0 &&
  JSON.stringify(content).length <= MAX_CONTENT_BYTES;

const checkSlug = async (req, res) => {
  const slug = String(req.query.slug || '').toLowerCase();
  const problem = slugProblem(slug);
  if (problem) return res.json({ available: false, reason: problem });
  const existing = await prisma.site.findUnique({ where: { slug } });
  res.json({ available: !existing, reason: existing ? 'That address is already taken.' : null });
};

const previewSite = async (req, res) => {
  const { content, themeId, shuffle } = req.body;
  if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });
  res.json({ html: renderSite(content, THEME_IDS.includes(themeId) ? themeId : 'midnight', shuffle) });
};

const createSite = async (req, res) => {
  try {
    const { slug: rawSlug, content, themeId, shuffle } = req.body;
    const slug = String(rawSlug || '').toLowerCase();
    const problem = slugProblem(slug);
    if (problem) return res.status(400).json({ error: problem });
    if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const limit = PLAN_LIMITS[user.plan] ?? 0;
    const count = await prisma.site.count({ where: { userId: user.id } });
    if (count >= limit) {
      return res.status(403).json({
        error: limit === 0 ? 'Publishing sites needs a paid plan.' : `Your plan includes ${limit} live site${limit === 1 ? '' : 's'}. Remove one to publish another.`,
      });
    }

    const site = await prisma.site.create({
      data: {
        userId: user.id,
        slug,
        title: content.brand.name || slug,
        content,
        themeId: THEME_IDS.includes(themeId) ? themeId : 'midnight',
        shuffle: Number.isInteger(shuffle) ? shuffle : 0,
      },
    });
    res.status(201).json({ site: { ...site, url: `https://${site.slug}.venture-pro.io` } });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'That address is already taken.' });
    console.error('Create site error:', error);
    res.status(500).json({ error: 'Could not publish the site' });
  }
};

const listSites = async (req, res) => {
  const sites = await prisma.site.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, slug: true, title: true, themeId: true, shuffle: true, updatedAt: true },
  });
  res.json({ sites: sites.map((site) => ({ ...site, url: `https://${site.slug}.venture-pro.io` })) });
};

const findOwnedSite = async (req, res) => {
  const site = await prisma.site.findUnique({ where: { id: req.params.siteId } });
  if (!site || site.userId !== req.userId) {
    res.status(404).json({ error: 'Site not found' });
    return null;
  }
  return site;
};

const updateSite = async (req, res) => {
  const site = await findOwnedSite(req, res);
  if (!site) return;
  const { content, themeId, shuffle } = req.body;
  if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      content,
      title: content.brand.name || site.title,
      themeId: THEME_IDS.includes(themeId) ? themeId : site.themeId,
      shuffle: Number.isInteger(shuffle) ? shuffle : site.shuffle,
    },
  });
  res.json({ site: { ...updated, url: `https://${updated.slug}.venture-pro.io` } });
};

const deleteSite = async (req, res) => {
  const site = await findOwnedSite(req, res);
  if (!site) return;
  await prisma.site.delete({ where: { id: site.id } });
  res.json({ message: 'Site removed' });
};

const publicSite = async (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase();
  const site = SLUG_PATTERN.test(slug) ? await prisma.site.findUnique({ where: { slug } }) : null;
  if (!site) {
    return res.status(404).type('html').send('<!doctype html><title>Not found</title><p>This site does not exist.</p>');
  }
  const html = renderSite(site.content, site.themeId, site.shuffle);
  res
    .set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=60',
    })
    .send(html);
};

module.exports = { checkSlug, previewSite, createSite, listSites, updateSite, deleteSite, publicSite };
