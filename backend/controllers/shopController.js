// Shop: a site owner sells items, and visitors pay the owner directly through their Stripe Connect account.
// Venture-Pro takes no fee on these payments: the charge is made on the owner's account with no application fee.
const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');
const { PLANS, planKey } = require('../lib/plans');
const { sendEmail } = require('../lib/email');
const { cleanItems, itemsOf, formatPrice } = require('../lib/shop');
const { API_ORIGIN } = require('./bookingController');

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'https://venture-pro.io').split(',')[0].trim();

// The shop is included on the same plans as online booking.
const ownerAllowsShop = (plan) => PLANS[planKey(plan)].booking;

const page = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;background:#0b0b10;color:#f4f4f5;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}main{max-width:480px;line-height:1.6}a{color:#a3e635}</style></head><body><main>${body}</main></body></html>`;

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ownedSite = async (req, res) => {
  const site = await prisma.site.findUnique({ where: { id: req.params.siteId } });
  if (!site || site.userId !== req.userId) {
    res.status(404).json({ error: 'Site not found' });
    return null;
  }
  return site;
};

// ---- Owner endpoints (signed in) ----

const getShop = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const orders = await prisma.shopOrder.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({
      items: itemsOf(site),
      allowed: ownerAllowsShop(user?.plan),
      paymentsEnabled: Boolean(user?.paymentsEnabled),
      orders: orders.map((order) => ({
        id: order.id,
        itemName: order.itemName,
        amountPence: order.amountPence,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Could not load the shop' });
  }
};

const updateShop = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ownerAllowsShop(user?.plan)) {
      return res.status(403).json({ error: 'The shop is included in Business and above' });
    }
    const { value, error } = cleanItems(req.body?.items);
    if (error) return res.status(400).json({ error });
    await prisma.site.update({ where: { id: site.id }, data: { shopItems: value } });
    res.json({ items: value });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Could not save the shop' });
  }
};

// ---- Shared: record a paid order once ----

// Saves a paid Checkout session as an order. Safe to call more than once for the same session (the webhook and the return page both call it).
const recordPaidSession = async (session, accountId) => {
  if (session.payment_status !== 'paid' || session.mode !== 'payment') return null;
  const siteId = session.metadata?.siteId;
  const itemName = session.metadata?.itemName || 'Shop item';
  const site = siteId ? await prisma.site.findUnique({ where: { id: siteId }, include: { user: true } }) : null;
  // The payment must belong to the owner's own account, so a forged or misrouted event cannot be recorded against another site.
  if (!site || !site.user?.stripeAccountId || site.user.stripeAccountId !== accountId) return null;

  const existing = await prisma.shopOrder.findUnique({ where: { stripeSessionId: session.id } });
  if (existing) return existing;

  const order = await prisma.shopOrder.create({
    data: {
      siteId: site.id,
      stripeSessionId: session.id,
      itemName: String(itemName).slice(0, 60),
      amountPence: Number(session.amount_total) || 0,
      customerName: String(session.customer_details?.name || 'Customer').slice(0, 100),
      customerEmail: String(session.customer_details?.email || '').slice(0, 254),
    },
  });
  if (site.user.email) {
    sendEmail({
      to: site.user.email,
      subject: `New shop order: ${order.itemName}`,
      text: `${order.customerName} bought ${order.itemName} for ${formatPrice(order.amountPence)} from ${site.title || site.slug}.\n\nCustomer email: ${order.customerEmail || 'not given'}\n\nSee your orders in Venture-Pro.\n${FRONTEND_ORIGIN}/bookings`,
    });
  }
  return order;
};

// ---- Public endpoints (no sign-in) ----

const loadPublicSite = async (slug) => {
  const clean = String(slug || '').toLowerCase();
  const site = SLUG_PATTERN.test(clean) ? await prisma.site.findUnique({ where: { slug: clean }, include: { user: true } }) : null;
  if (!site || !ownerAllowsShop(site.user?.plan) || itemsOf(site).length === 0) return null;
  return site;
};

// Starts a payment for one item. The item and its price come from the database, not the form.
const startCheckout = async (req, res) => {
  try {
    const site = await loadPublicSite(req.params.slug);
    const back = site ? `https://${site.slug}.venture-pro.io` : FRONTEND_ORIGIN;
    if (!site) {
      return res.status(404).type('html').send(page('Not available', '<h1>The shop is not available</h1><p>This site is not selling anything right now.</p>'));
    }
    const owner = site.user;
    if (!owner.stripeAccountId || !owner.paymentsEnabled) {
      return res.status(409).type('html').send(page('Payments not ready', `<h1>Payments are not ready yet</h1><p>The business has not finished setting up card payments. Please try again later.</p><p><a href="${back}">Back to the site</a></p>`));
    }
    const item = itemsOf(site).find((entry) => entry.id === String(req.body?.item || ''));
    if (!item) {
      return res.status(400).type('html').send(page('Choose again', `<h1>That item is no longer for sale</h1><p><a href="${back}">Back to the site</a></p>`));
    }

    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: item.pricePence, product_data: { name: item.name, description: item.description || undefined } } }],
        success_url: `${API_ORIGIN}/api/shop/public/${site.slug}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${back}`,
        metadata: { kind: 'shop', siteId: site.id, itemName: item.name },
      },
      { stripeAccount: owner.stripeAccountId }
    );
    res.redirect(303, session.url);
  } catch (error) {
    console.error('Shop checkout error:', error);
    res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please try again in a moment.</p>'));
  }
};

// The return page after payment. It checks the payment with Stripe and records the order.
const completeCheckout = async (req, res) => {
  try {
    const site = await loadPublicSite(req.params.slug);
    const back = site ? `https://${site.slug}.venture-pro.io` : FRONTEND_ORIGIN;
    const sessionId = String(req.query.session_id || '');
    if (!site || !/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !site.user.stripeAccountId) {
      return res.status(404).type('html').send(page('Not found', `<h1>We could not find that payment</h1><p><a href="${back}">Back to the site</a></p>`));
    }
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: site.user.stripeAccountId });
    if (session.metadata?.siteId !== site.id) {
      return res.status(404).type('html').send(page('Not found', `<h1>We could not find that payment</h1><p><a href="${back}">Back to the site</a></p>`));
    }
    const paid = session.payment_status === 'paid';
    if (paid) await recordPaidSession(session, site.user.stripeAccountId);
    const name = escapeHtml(session.customer_details?.name || '');
    res.type('html').send(
      page(
        paid ? 'Thank you' : 'Payment not completed',
        paid
          ? `<h1>Thank you${name ? `, ${name}` : ''}</h1><p>Your payment for <strong>${escapeHtml(session.metadata?.itemName || 'your order')}</strong> has been received.</p><p><a href="${back}">Back to the site</a></p>`
          : `<h1>Payment not completed</h1><p>Your payment has not gone through yet. If you were charged, please contact the business.</p><p><a href="${back}">Back to the site</a></p>`
      )
    );
  } catch (error) {
    console.error('Shop return page error:', error);
    res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please contact the business to check your payment.</p>'));
  }
};

module.exports = { getShop, updateShop, startCheckout, completeCheckout, recordPaidSession, ownerAllowsShop };
