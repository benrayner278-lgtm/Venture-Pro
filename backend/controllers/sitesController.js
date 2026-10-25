const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { renderSite, designKey, renderEditablePreview } = require('../lib/siteRenderer');
const { PRESET_IDS } = require('../lib/designPresets');
const { cleanStyle } = require('../lib/styleOptions');
const { PLANS, planKey } = require('../lib/plans');
const { API_ORIGIN, publicBookingView } = require('./bookingController');

const prisma = new PrismaClient();

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'support', 'help', 'blog', 'static', 'cdn', 'ftp',
  'dashboard', 'login', 'signup', 'billing', 'status', 'docs', 'account', 'settings',
]);
const MAX_CONTENT_BYTES = 4 * 1024 * 1024;
const MAX_DESIGN_TRIES = 25;
const MAX_PHOTOS = 8;
// Photos are stored inside the site content as small JPEGs. The frontend resizes them to fit.
const PHOTO_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,400000}$/;
const clip = (value, max) => String(value ?? '').slice(0, max);

const randomSeed = () => crypto.randomInt(1, 2147483647);

const slugProblem = (slug) => {
  if (!SLUG_PATTERN.test(slug)) return 'Use 3 to 40 letters, numbers or hyphens, starting and ending with a letter or number.';
  if (RESERVED_SLUGS.has(slug)) return 'That address is reserved. Please choose another.';
  return null;
};

// Keeps only the owner's contact details and portfolio fields, with length limits and valid photos.
// The portfolio maker is left out when the plan does not include it.
const cleanContent = (content, allowPortfolio = true) => {
  if (!content || typeof content !== 'object') return content;
  const next = { ...content };
  if (content.style) next.style = cleanStyle(content.style);
  if (content.contact && typeof content.contact === 'object') {
    const contact = content.contact;
    next.contact = {
      phone: clip(contact.phone, 40),
      email: clip(contact.email, 120),
      address: clip(contact.address, 300),
      hours: clip(contact.hours, 200),
    };
  }
  if (!allowPortfolio) delete next.portfolio;
  else if (content.portfolio && typeof content.portfolio === 'object') {
    const items = Array.isArray(content.portfolio.items) ? content.portfolio.items.slice(0, MAX_PHOTOS) : [];
    next.portfolio = {
      title: clip(content.portfolio.title || 'Our work', 80),
      items: items.map((item) => ({
        title: clip(item.title, 80),
        description: clip(item.description, 400),
        tag: clip(item.tag || 'Project', 40),
        ...(PHOTO_PATTERN.test(item.image || '') ? { image: item.image } : {}),
      })),
    };
  }
  return next;
};

const validContent = (content) =>
  content && typeof content === 'object' && content.brand && Array.isArray(content.sections) && content.sections.length > 0 &&
  JSON.stringify(content).length <= MAX_CONTENT_BYTES;

// Finds a seed whose design no other live site uses. Sites that look the same are not allowed.
const uniqueDesign = async ({ content, themeId, seed, excludeId }) => {
  let current = seed;
  for (let attempt = 0; attempt < MAX_DESIGN_TRIES; attempt++) {
    const key = designKey(content, themeId, current);
    const taken = await prisma.site.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        content: { path: ['design', 'key'], equals: key },
      },
      select: { id: true },
    });
    if (!taken) return { shuffle: current, key };
    current = randomSeed();
  }
  throw new Error('Could not find a unique design for this site');
};

const withDesignKey = (content, key) => ({ ...content, design: { ...(content.design || {}), key } });

const checkSlug = async (req, res) => {
  const slug = String(req.query.slug || '').toLowerCase();
  const problem = slugProblem(slug);
  if (problem) return res.json({ available: false, reason: problem });
  const existing = await prisma.site.findUnique({ where: { slug } });
  res.json({ available: !existing, reason: existing ? 'That address is already taken.' : null });
};

const previewSite = async (req, res) => {
  const { themeId, shuffle, editable } = req.body;
  const content = cleanContent(req.body.content);
  if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });
  const preset = PRESET_IDS.includes(themeId) ? themeId : 'midnight';
  // The builder asks for the editable preview. Published sites never use it.
  if (editable) return res.json(renderEditablePreview(content, preset, shuffle));
  res.json({ html: renderSite(content, preset, shuffle) });
};

const createSite = async (req, res) => {
  try {
    const { slug: rawSlug, themeId, shuffle } = req.body;
    const slug = String(rawSlug || '').toLowerCase();
    const problem = slugProblem(slug);
    if (problem) return res.status(400).json({ error: problem });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const content = cleanContent(req.body.content, PLANS[planKey(user.plan)].portfolio);
    if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });

    const plan = PLANS[planKey(user.plan)];
    const limit = plan.sites;
    const count = await prisma.site.count({ where: { userId: user.id } });
    if (count >= limit) {
      return res.status(403).json({
        error: limit === 0 ? 'Publishing sites needs a paid plan.' : `Your plan includes ${limit} live site${limit === 1 ? '' : 's'}. Remove one to publish another.`,
      });
    }

    const preset = PRESET_IDS.includes(themeId) ? themeId : 'midnight';
    const { shuffle: finalShuffle, key } = await uniqueDesign({
      content,
      themeId: preset,
      seed: Number.isInteger(shuffle) ? shuffle : randomSeed(),
      excludeId: null,
    });

    const site = await prisma.site.create({
      data: {
        userId: user.id,
        slug,
        title: content.brand.name || slug,
        content: withDesignKey(content, key),
        themeId: preset,
        shuffle: finalShuffle,
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
  try {
    const site = await findOwnedSite(req, res);
    if (!site) return;
    const { themeId, shuffle } = req.body;
    const owner = await prisma.user.findUnique({ where: { id: site.userId } });
    const content = cleanContent(req.body.content, PLANS[planKey(owner?.plan)].portfolio);
    if (!validContent(content)) return res.status(400).json({ error: 'Invalid site content' });

    const preset = PRESET_IDS.includes(themeId) ? themeId : site.themeId;
    const { shuffle: finalShuffle, key } = await uniqueDesign({
      content,
      themeId: preset,
      seed: Number.isInteger(shuffle) ? shuffle : site.shuffle,
      excludeId: site.id,
    });

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        content: withDesignKey(content, key),
        title: content.brand.name || site.title,
        themeId: preset,
        shuffle: finalShuffle,
      },
    });
    res.json({ site: { ...updated, url: `https://${updated.slug}.venture-pro.io` } });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Could not update the site' });
  }
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
  const owner = await prisma.user.findUnique({ where: { id: site.userId }, select: { plan: true } });
  const booking = await publicBookingView(site, owner?.plan);
  const html = renderSite(site.content, site.themeId, site.shuffle, { booking });
  // Forms may only post to the booking API. Scripts stay blocked.
  res
    .set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action ${API_ORIGIN}; frame-ancestors 'none'`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=60',
    })
    .send(html);
};

module.exports = { checkSlug, previewSite, createSite, listSites, updateSite, deleteSite, publicSite, randomSeed };
