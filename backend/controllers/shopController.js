// Shop: a site owner sells items, and visitors pay the owner directly through their Stripe Connect account.
// Venture-Pro takes no fee on these payments: the charge is made on the owner's account with no application fee.
// A visitor can put several items in a basket and pays once. The owner gets one email with the order and the answers from the order form.
const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');
const { PLANS, planKey } = require('../lib/plans');
const { sendEmail } = require('../lib/email');
const { cleanItems, itemsOf, formatPrice, basketLines } = require('../lib/shop');
const { defaultForm, generateShopForm, checkAnswers } = require('../lib/shopForm');
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

// The form a visitor fills in. Shops that have not written one yet get the standard form.
const formOf = (site) => (Array.isArray(site?.shopForm) && site.shopForm.length ? site.shopForm : defaultForm());

// ---- Owner endpoints (signed in) ----

const getShop = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const orders = await prisma.shopOrder.findMany({ where: { siteId: site.id, status: 'paid' }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({
      items: itemsOf(site),
      form: formOf(site),
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
      return res.status(403).json({ error: 'The shop is included in Premium and above' });
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

// Writes the order form for this shop with the AI, from what the shop sells. Saved straight away.
const generateForm = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ownerAllowsShop(user?.plan)) {
      return res.status(403).json({ error: 'The shop is included in Premium and above' });
    }
    const description = String(req.body?.description || '').trim().slice(0, 300);
    const items = itemsOf(site);
    const shopName = site.title || site.slug;
    const form = await generateShopForm({ shopName, description, itemNames: items.map((item) => item.name) });
    // generateShopForm already returns a checked form, so it is saved as it is.
    const saved = Array.isArray(form) && form.length ? form : defaultForm();
    await prisma.site.update({ where: { id: site.id }, data: { shopForm: saved } });
    res.json({ form: saved });
  } catch (error) {
    console.error('Generate shop form error:', error);
    res.status(500).json({ error: 'Could not write the order form' });
  }
};

// ---- Shared: record a paid order once ----

const orderSummary = (lines) => lines.map((line) => `${line.qty} × ${line.name}`).join(', ');

const emailOwner = (owner, site, order) => {
  if (!owner?.email) return;
  const lines = Array.isArray(order.items) ? order.items : [];
  const answers = order.details && typeof order.details === 'object' ? Object.values(order.details) : [];
  const itemLines = lines.length
    ? lines.map((line) => `  ${line.qty} × ${line.name} (${formatPrice(line.pricePence * line.qty)})`).join('\n')
    : `  ${order.itemName}`;
  const answerLines = answers.map((answer) => `${answer.label}: ${answer.value}`).join('\n');
  sendEmail({
    to: owner.email,
    subject: `New order from ${order.customerName}: ${formatPrice(order.amountPence)}`,
    text: `${order.customerName} placed an order on ${site.title || site.slug}.

Items:
${itemLines}

Total: ${formatPrice(order.amountPence)}

${answerLines || 'No extra details were given.'}

Customer email: ${order.customerEmail || 'not given'}

See your orders in Venture-Pro.
${FRONTEND_ORIGIN}/shop`,
  });
};

// Marks a paid Checkout session as an order. Safe to call more than once for the same session (the webhook and the return page both call it).
// The owner is emailed only by the call that makes the order paid, so a repeat call never sends a second email.
const recordPaidSession = async (session, accountId) => {
  if (session.payment_status !== 'paid' || session.mode !== 'payment') return null;
  const siteId = session.metadata?.siteId;
  const site = siteId ? await prisma.site.findUnique({ where: { id: siteId }, include: { user: true } }) : null;
  // The payment must belong to the owner's own account, so a forged or misrouted event cannot be recorded against another site.
  if (!site || !site.user?.stripeAccountId || site.user.stripeAccountId !== accountId) return null;

  const paidAt = {
    status: 'paid',
    customerName: String(session.customer_details?.name || '').slice(0, 100) || undefined,
    customerEmail: String(session.customer_details?.email || '').slice(0, 254) || undefined,
  };
  const moved = await prisma.shopOrder.updateMany({ where: { stripeSessionId: session.id, status: 'pending' }, data: paidAt });
  if (moved.count === 0) {
    const existing = await prisma.shopOrder.findUnique({ where: { stripeSessionId: session.id } });
    if (existing) return existing;
    // A payment with no pending order (for example from before baskets) is still recorded, as a single item.
    const created = await prisma.shopOrder.create({
      data: {
        siteId: site.id,
        stripeSessionId: session.id,
        itemName: String(session.metadata?.itemName || 'Shop item').slice(0, 120),
        amountPence: Number(session.amount_total) || 0,
        customerName: paidAt.customerName || 'Customer',
        customerEmail: paidAt.customerEmail || '',
        status: 'paid',
      },
    });
    emailOwner(site.user, site, created);
    return created;
  }
  const order = await prisma.shopOrder.findUnique({ where: { stripeSessionId: session.id } });
  emailOwner(site.user, site, order);
  return order;
};

// ---- Public endpoints (no sign-in) ----

const loadPublicSite = async (slug) => {
  const clean = String(slug || '').toLowerCase();
  const site = SLUG_PATTERN.test(clean) ? await prisma.site.findUnique({ where: { slug: clean }, include: { user: true } }) : null;
  if (!site || !ownerAllowsShop(site.user?.plan) || itemsOf(site).length === 0) return null;
  return site;
};

// Starts a payment for the basket. Prices and item names come from the database; the visitor's answers are checked against the order form.
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
    const basket = basketLines(site, req.body?.basket);
    if (basket.error) {
      return res.status(400).type('html').send(page('Check your basket', `<h1>Please check your basket</h1><p>${escapeHtml(basket.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
    }
    const form = formOf(site);
    const answers = checkAnswers(form, req.body);
    if (answers.error) {
      return res.status(400).type('html').send(page('Check your order', `<h1>Please check your order</h1><p>${escapeHtml(answers.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
    }

    const summary = orderSummary(basket.lines);
    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: basket.lines.map((line) => ({
          quantity: line.qty,
          price_data: { currency: 'gbp', unit_amount: line.pricePence, product_data: { name: line.name } },
        })),
        customer_email: answers.answers.email?.value,
        success_url: `${API_ORIGIN}/api/shop/public/${site.slug}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${back}/shop`,
        metadata: { kind: 'shop', siteId: site.id, itemName: summary.slice(0, 480) },
      },
      { stripeAccount: owner.stripeAccountId }
    );
    // The order is saved as pending now, with the basket and answers, and becomes paid when Stripe confirms the payment.
    await prisma.shopOrder.create({
      data: {
        siteId: site.id,
        stripeSessionId: session.id,
        itemName: summary.slice(0, 120),
        amountPence: basket.totalPence,
        customerName: String(answers.answers.name?.value || 'Customer').slice(0, 100),
        customerEmail: String(answers.answers.email?.value || '').slice(0, 254),
        status: 'pending',
        items: basket.lines,
        details: answers.answers,
      },
    });
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
    if (paid) {
      await recordPaidSession(session, site.user.stripeAccountId);
      // Back on the shop, which clears the basket and says thank you.
      return res.redirect(303, `${back}/shop?order=thanks`);
    }
    res.type('html').send(
      page('Payment not completed', `<h1>Payment not completed</h1><p>Your payment has not gone through yet. If you were charged, please contact the business.</p><p><a href="${back}">Back to the site</a></p>`)
    );
  } catch (error) {
    console.error('Shop return page error:', error);
    res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please contact the business to check your payment.</p>'));
  }
};

module.exports = { getShop, updateShop, generateForm, startCheckout, completeCheckout, recordPaidSession, ownerAllowsShop, loadPublicSite, formOf };
