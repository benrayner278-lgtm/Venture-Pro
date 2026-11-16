// The owner's business mailboxes. Each address sits on one of their sites, e.g. hello@sophia.venture-pro.io.
// The plan sets how many mailboxes the account may have. The owner creates each one by hand, from the Email page.
const prisma = require('../lib/prisma');
const { PLANS, planKey } = require('../lib/plans');
const { MAIL_ROOT, LOCAL_PART, siteMailDomain, provisionMailbox } = require('../lib/mailboxes');

const publicMailbox = (mailbox, siteTitles) => ({
  id: mailbox.id,
  address: mailbox.address,
  status: mailbox.status,
  siteId: mailbox.siteId,
  siteTitle: siteTitles[mailbox.siteId] || 'Website',
});

const listMailboxes = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [mailboxes, sites] = await Promise.all([
      prisma.mailbox.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
      prisma.site.findMany({ where: { userId: user.id }, select: { id: true, title: true, slug: true }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const plan = PLANS[planKey(user.plan)];
    const titles = Object.fromEntries(sites.map((site) => [site.id, site.title]));
    res.json({
      plan: plan.name,
      allowance: plan.mailboxes,
      used: mailboxes.length,
      mailboxes: mailboxes.map((mailbox) => publicMailbox(mailbox, titles)),
      sites: sites.map((site) => ({ id: site.id, title: site.title || site.slug, domain: siteMailDomain(site) })),
      domain: MAIL_ROOT,
    });
  } catch (error) {
    console.error('List mailboxes error:', error);
    res.status(500).json({ error: 'Could not load your email' });
  }
};

// Creates a mailbox, or finishes one that was started and is still setting up.
const createMailbox = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const plan = PLANS[planKey(user.plan)];

    const localPart = typeof req.body?.localPart === 'string' ? req.body.localPart.trim().toLowerCase() : '';
    if (!LOCAL_PART.test(localPart)) {
      return res.status(400).json({ error: 'Use letters, numbers, dots, dashes or underscores for the part before the @' });
    }
    const site = await prisma.site.findFirst({ where: { id: String(req.body?.siteId || ''), userId: user.id } });
    if (!site) return res.status(404).json({ error: 'Choose one of your websites' });

    const address = `${localPart}@${siteMailDomain(site)}`;
    const existing = await prisma.mailbox.findUnique({ where: { address } });
    if (existing && existing.userId !== user.id) return res.status(409).json({ error: 'That address is already taken. Try another name.' });
    if (existing?.status === 'ready') return res.status(409).json({ error: 'That mailbox already exists.' });

    if (plan.mailboxes < 1) {
      return res.status(403).json({ error: 'Email is included from the Standard plan.' });
    }
    if (!existing) {
      const used = await prisma.mailbox.count({ where: { userId: user.id } });
      if (used >= plan.mailboxes) {
        return res.status(403).json({ error: `Your ${plan.name} plan includes ${plan.mailboxes} mailbox${plan.mailboxes === 1 ? '' : 'es'}. Upgrade to add more.` });
      }
    }

    const mailbox = existing ?? (await prisma.mailbox.create({ data: { userId: user.id, siteId: site.id, localPart, address } }));
    const status = await provisionMailbox({
      domain: siteMailDomain(site),
      localPart,
      displayName: site.title || site.slug,
      recoveryEmail: user.email,
    });
    const updated = status === mailbox.status ? mailbox : await prisma.mailbox.update({ where: { id: mailbox.id }, data: { status } });

    const message =
      status === 'ready'
        ? `Your mailbox ${address} is ready. Check your email for the invitation to choose your password.`
        : 'Your address is still being set up. Check again in a few minutes.';
    res.json({ mailbox: publicMailbox(updated, { [site.id]: site.title }), message });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('Create mailbox error:', error);
    res.status(502).json({ error: 'We could not set up that address just now. Please try again in a few minutes.' });
  }
};

module.exports = { listMailboxes, createMailbox };
