// Shop: a site owner sells items, and visitors pay the owner directly through their Stripe Connect account.
// Venture-Pro takes no fee on these payments: the charge is made on the owner's account with no application fee.
// A visitor can put several items in a basket and pays once. The owner gets one email with the order and the answers from the order form.
const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');
const { PLANS, planKey } = require('../lib/plans');
const { sendEmail } = require('../lib/email');
const { cleanItems, itemsOf, formatPrice, basketLines } = require('../lib/shop');
const crypto = require('crypto');
const { offerFor, holdSlots, bookFreeSlots, confirmPaidBookings, releaseHolds, emailCustomer, SESSION_MINUTES } = require('../lib/bookingCheckout');
const { presetOf } = require('../lib/bookingPresets');
const { ownerMessage } = require('../lib/bookingMessages');
const { formatSlot } = require('../lib/bookingTime');
const { defaultForm, generateShopForm, checkAnswers } = require('../lib/shopForm');
const { API_ORIGIN } = require('./bookingController');

// Phone numbers: digits with an optional leading +, spaces, brackets or dashes. 10 to 15 digits.
const PHONE_PATTERN = /^\+?[0-9 ()-]{8,25}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
// When bookings are on, a date and time come from the booking picker, so those questions are left out here.
const formOf = (site) => {
  const form = Array.isArray(site?.shopForm) && site.shopForm.length ? site.shopForm : defaultForm();
  if (!site?.bookingSettings?.enabled) return form;
  return form.filter((field) => field.type !== 'date' && field.type !== 'time');
};

// What the public shop page shows for this site. Products, bookings and enquiries are separate, and each only appears when set up.
const contactOf = (site) => {
  const contact = site?.shopContact;
  return contact && EMAIL_PATTERN.test(contact.email || '') && PHONE_PATTERN.test(contact.phone || '') ? contact : null;
};
const shopSections = (site, plan) => {
  const allowed = ownerAllowsShop(plan);
  const products = allowed ? itemsOf(site) : [];
  const bookingOn = allowed && site.bookingSettings?.enabled === true;
  const contact = allowed ? contactOf(site) : null;
  // Enquiry details are shown only when there is nothing to buy or book online.
  const enquiry = Boolean(contact) && products.length === 0 && !bookingOn;
  return { products, bookingOn, enquiry, contact: enquiry ? contact : null, available: products.length > 0 || bookingOn || enquiry };
};

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
      contact: site.shopContact || null,
      bookingsOn: Boolean(site.bookingSettings?.enabled),
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

// Saves the enquiry email and phone shown on the shop page. Both are checked, and both are needed.
const updateContact = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const email = String(req.body?.email || '').trim().slice(0, 254);
    const phone = String(req.body?.phone || '').trim().slice(0, 25);
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!PHONE_PATTERN.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number, with the area code' });
    await prisma.site.update({ where: { id: site.id }, data: { shopContact: { email, phone } } });
    res.json({ contact: { email, phone } });
  } catch (error) {
    console.error('Update shop contact error:', error);
    res.status(500).json({ error: 'Could not save the contact details' });
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
  const timezone = site.bookingSettings?.timezone || 'Europe/London';
  const answers = order.details && typeof order.details === 'object' ? Object.values(order.details) : [];
  const itemLines = lines.length
    ? lines
        .map((line) => (line.type === 'slot' ? `  1 × ${line.name} · ${formatSlot(new Date(line.startsAt).getTime(), timezone)}` : `  ${line.qty} × ${line.name} (${formatPrice(line.pricePence * line.qty)})`))
        .join('\n')
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
    paymentIntent: String(session.payment_intent || '').slice(0, 120) || undefined,
    customerName: String(session.customer_details?.name || '').slice(0, 100) || undefined,
    customerEmail: String(session.customer_details?.email || '').slice(0, 254) || undefined,
  };
  // The order is found by its ID from the payment, or by the session ID.
  const orderKey = session.metadata?.orderId ? { id: session.metadata.orderId } : { stripeSessionId: session.id };
  const moved = await prisma.shopOrder.updateMany({ where: { ...orderKey, status: 'pending' }, data: paidAt });
  if (moved.count === 0) {
    const existing = await prisma.shopOrder.findFirst({ where: orderKey });
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
    await confirmPaidBookings({ site, settings: site.bookingSettings || {}, orderId: created.id });
    emailOwner(site.user, site, created);
    return created;
  }
  const order = await prisma.shopOrder.findFirst({ where: orderKey });
  // Held time slots in this order become real bookings now the payment has gone through.
  await confirmPaidBookings({ site, settings: site.bookingSettings || {}, orderId: order.id });
  emailOwner(site.user, site, order);
  return order;
};

// ---- Public endpoints (no sign-in) ----

const loadPublicSite = async (slug) => {
  const clean = String(slug || '').toLowerCase();
  const site = SLUG_PATTERN.test(clean) ? await prisma.site.findUnique({ where: { slug: clean }, include: { user: true } }) : null;
  // The shop page opens when there are items, bookings, or enquiry details to show.
  if (!site || !shopSections(site, site.user?.plan).available) return null;
  return site;
};

// Starts a payment for the basket: products, booked times, or both, in one Stripe payment.
// Prices and names come from the database. The visitor's answers are checked against the order form.
// Free bookings (for example a free class) skip payment and are booked straight away.
const startCheckout = async (req, res) => {
  try {
    const site = await loadPublicSite(req.params.slug);
    const back = site ? `https://${site.slug}.venture-pro.io` : FRONTEND_ORIGIN;
    if (!site) {
      return res.status(404).type('html').send(page('Not available', '<h1>The shop is not available</h1><p>This site is not selling anything right now.</p>'));
    }
    const owner = site.user;
    const basket = basketLines(site, req.body?.basket);
    if (basket.error) {
      return res.status(400).type('html').send(page('Check your basket', `<h1>Please check your basket</h1><p>${escapeHtml(basket.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
    }
    const sections = shopSections(site, owner.plan);
    if (basket.slots.length > 0 && !sections.bookingOn) {
      return res.status(400).type('html').send(page('Bookings not available', `<h1>Bookings are not available</h1><p><a href="${back}/shop">Back to the shop</a></p>`));
    }
    const answers = checkAnswers(formOf(site), req.body);
    if (answers.error) {
      return res.status(400).type('html').send(page('Check your order', `<h1>Please check your order</h1><p>${escapeHtml(answers.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
    }
    const customer = {
      name: String(answers.answers.name?.value || 'Customer').slice(0, 100),
      email: String(answers.answers.email?.value || '').slice(0, 254),
      phone: '',
      notes: String(answers.answers.notes?.value || '').slice(0, 500),
    };

    const settings = site.bookingSettings || {};
    const nowMs = Date.now();
    const priced = [];
    for (const slot of basket.slots) {
      const offer = offerFor(settings, slot.service, slot.startMs, nowMs);
      if (!offer) {
        return res.status(409).type('html').send(page('Time taken', `<h1>That time is no longer offered</h1><p>Please go back and choose another time.</p><p><a href="${back}/shop">Back to the shop</a></p>`));
      }
      priced.push({ startMs: slot.startMs, service: slot.service, offer });
    }
    const slotRequests = priced.map((entry) => ({ startMs: entry.startMs, service: entry.service }));
    const total = basket.totalPence + priced.reduce((sum, entry) => sum + entry.offer.pricePence, 0);
    const businessName = site.title || site.slug;
    if (total > 0 && !(owner.stripeAccountId && owner.paymentsEnabled)) {
      return res.status(409).type('html').send(page('Payments not ready', `<h1>Payments are not ready yet</h1><p>The business has not finished setting up card payments. Please try again later.</p><p><a href="${back}">Back to the site</a></p>`));
    }

    // Free bookings only: book now, no payment.
    if (total === 0) {
      const booked = await bookFreeSlots({ siteId: site.id, settings, requests: slotRequests, nowMs, customer });
      if (booked.error) {
        return res.status(409).type('html').send(page('Time taken', `<h1>That time is no longer free</h1><p>${escapeHtml(booked.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
      }
      const preset = presetOf(settings);
      for (const booking of booked.created) {
        emailCustomer({ booking, settings, businessName });
        if (preset.ownerEmail && owner.email) {
          sendEmail({ to: owner.email, ...ownerMessage({ booking, timezone: settings.timezone, businessName, requested: booking.status === 'requested', manageUrl: `${FRONTEND_ORIGIN}/bookings` }) });
        }
      }
      return res.redirect(303, `${back}/shop?order=thanks`);
    }

    // Paid: hold the time slots while the visitor pays. A held slot is taken, so nobody else can book it.
    let holds = [];
    if (priced.length > 0) {
      const held = await holdSlots({ siteId: site.id, settings, requests: slotRequests, nowMs, customer });
      if (held.error) {
        return res.status(409).type('html').send(page('Time taken', `<h1>That time is no longer free</h1><p>${escapeHtml(held.error)}</p><p><a href="${back}/shop">Back to the shop</a></p>`));
      }
      holds = held.created;
    }

    const summary = [
      ...basket.lines.map((line) => `${line.qty} × ${line.name}`),
      ...priced.map((entry) => `1 × ${entry.offer.serviceName}`),
    ].join(', ');
    const orderItems = [
      ...basket.lines.map((line) => ({ id: line.id, name: line.name, pricePence: line.pricePence, qty: line.qty })),
      ...priced.map((entry) => ({ type: 'slot', name: entry.offer.serviceName, startsAt: new Date(entry.startMs).toISOString(), pricePence: entry.offer.pricePence, qty: 1 })),
    ];

    // The order is saved before the Stripe session, so a payment can always find its order and its held slots.
    let order;
    try {
      order = await prisma.shopOrder.create({
        data: {
          siteId: site.id,
          stripeSessionId: `pending_${crypto.randomUUID()}`,
          itemName: summary.slice(0, 120),
          amountPence: total,
          customerName: customer.name,
          customerEmail: customer.email,
          status: 'pending',
          items: orderItems,
          details: answers.answers,
        },
      });
      if (holds.length) await prisma.booking.updateMany({ where: { id: { in: holds.map((booking) => booking.id) } }, data: { orderId: order.id } });
    } catch (error) {
      if (holds.length) await releaseHolds(holds.map((booking) => booking.id));
      throw error;
    }

    let session;
    try {
      const stripeLines = [
        ...basket.lines.map((line) => ({ quantity: line.qty, price_data: { currency: 'gbp', unit_amount: line.pricePence, product_data: { name: line.name } } })),
        // A free time slot in a mixed basket has nothing to charge, so it is left off the payment.
        ...priced
          .filter((entry) => entry.offer.pricePence > 0)
          .map((entry) => ({ quantity: 1, price_data: { currency: 'gbp', unit_amount: entry.offer.pricePence, product_data: { name: `${entry.offer.serviceName} · ${formatSlot(entry.startMs, settings.timezone || 'Europe/London')}` } } })),
      ];
      session = await getStripe().checkout.sessions.create(
        {
          mode: 'payment',
          line_items: stripeLines,
          customer_email: customer.email || undefined,
          // The payment window closes before the slot hold does.
          expires_at: Math.floor(nowMs / 1000) + SESSION_MINUTES * 60,
          success_url: `${API_ORIGIN}/api/shop/public/${site.slug}/complete?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${back}/shop`,
          metadata: { kind: 'shop', siteId: site.id, orderId: order.id, itemName: summary.slice(0, 480) },
        },
        { stripeAccount: owner.stripeAccountId }
      );
    } catch (error) {
      await prisma.shopOrder.delete({ where: { id: order.id } }).catch(() => {});
      if (holds.length) await releaseHolds(holds.map((booking) => booking.id));
      throw error;
    }
    await prisma.shopOrder.update({ where: { id: order.id }, data: { stripeSessionId: session.id } }).catch((error) => console.error('Could not save Stripe session id:', error));
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

module.exports = { getShop, updateShop, updateContact, generateForm, startCheckout, completeCheckout, recordPaidSession, ownerAllowsShop, loadPublicSite, formOf, shopSections };
