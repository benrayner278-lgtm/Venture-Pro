const prisma = require('../lib/prisma');
const { PLANS, planKey } = require('../lib/plans');
const { DAY_KEYS, toMinutes, slotFits, availableSlots, formatSlot } = require('../lib/bookingTime');

// Where the public booking form posts to. Published sites are served from another domain, so this must be the API's address.
const API_ORIGIN = process.env.API_PUBLIC_URL || 'https://venture-pro-production.up.railway.app';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 24 * 60 * 60 * 1000;

// Timezones a business can choose. Keep in step with the booking settings page.
const TIMEZONES = [
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney',
];
const SLOT_OPTIONS = [15, 30, 60];
const MAX_SERVICES = 6;

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Checks the owner's settings and keeps only valid values. Returns an error message when something is wrong.
const cleanSettings = (input) => {
  if (!input || typeof input !== 'object') return { error: 'Booking settings are missing' };
  const timezone = TIMEZONES.includes(input.timezone) ? input.timezone : null;
  if (!timezone) return { error: 'Choose a timezone from the list' };
  const slotMinutes = SLOT_OPTIONS.includes(Number(input.slotMinutes)) ? Number(input.slotMinutes) : 30;
  const daysAhead = Math.min(28, Math.max(7, Math.round(Number(input.daysAhead) || 14)));

  const hours = {};
  for (const key of DAY_KEYS) {
    const day = input.hours?.[key];
    const open = Array.isArray(day) ? toMinutes(day[0]) : null;
    const close = Array.isArray(day) ? toMinutes(day[1]) : null;
    hours[key] = open !== null && close !== null && open < close ? [day[0], day[1]] : null;
  }
  if (!Object.values(hours).some(Boolean)) return { error: 'Open at least one day of the week' };

  const services = (Array.isArray(input.services) ? input.services : [])
    .slice(0, MAX_SERVICES)
    .map((service) => ({
      name: clip(service?.name, 60),
      minutes: Math.round(Number(service?.minutes)),
      price: clip(service?.price, 40),
    }))
    .filter((service) => service.name && service.minutes >= 15 && service.minutes <= 480);
  if (services.length === 0) return { error: 'Add at least one service with a length between 15 and 480 minutes' };

  return { value: { enabled: input.enabled === true, timezone, slotMinutes, daysAhead, hours, services } };
};

// Bookings that already take up time in the window the form covers.
const bookedRanges = async (siteId, nowMs, daysAhead) => {
  const rows = await prisma.booking.findMany({
    where: {
      siteId,
      status: 'confirmed',
      startsAt: { gte: new Date(nowMs - DAY), lte: new Date(nowMs + (daysAhead + 2) * DAY) },
    },
    select: { startsAt: true, durationMin: true },
  });
  return rows.map((row) => ({
    startMs: row.startsAt.getTime(),
    endMs: row.startsAt.getTime() + row.durationMin * 60 * 1000,
  }));
};

const ownerAllowsBooking = (plan) => PLANS[planKey(plan)].booking;

// What the published site needs to show the booking form. Returns null when the form should not show.
const publicBookingView = async (site, ownerPlan) => {
  const settings = site.bookingSettings;
  if (!settings?.enabled || !ownerAllowsBooking(ownerPlan)) return null;
  const nowMs = Date.now();
  const booked = await bookedRanges(site.id, nowMs, settings.daysAhead);
  const slots = availableSlots({ settings, nowMs, booked });
  return {
    action: `${API_ORIGIN}/api/bookings/public/${site.slug}`,
    services: settings.services,
    slots: slots.map((slot) => ({ value: new Date(slot.startMs).toISOString(), label: formatSlot(slot.startMs, settings.timezone) })),
    daysAhead: settings.daysAhead,
  };
};

// ---- Owner endpoints (signed in) ----

const ownedSite = async (req, res) => {
  const site = await prisma.site.findUnique({ where: { id: req.params.siteId } });
  if (!site || site.userId !== req.userId) {
    res.status(404).json({ error: 'Site not found' });
    return null;
  }
  return site;
};

const getOwnerBookings = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const bookings = await prisma.booking.findMany({
      where: { siteId: site.id, startsAt: { gte: new Date(Date.now() - DAY) } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    res.json({
      settings: site.bookingSettings,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        durationMin: booking.durationMin,
        serviceName: booking.serviceName,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        notes: booking.notes,
      })),
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Could not load bookings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ownerAllowsBooking(user?.plan)) {
      return res.status(403).json({ error: 'Online booking is included in Business and above' });
    }
    const { value, error } = cleanSettings(req.body);
    if (error) return res.status(400).json({ error });
    await prisma.site.update({ where: { id: site.id }, data: { bookingSettings: value } });
    res.json({ settings: value });
  } catch (error) {
    console.error('Update booking settings error:', error);
    res.status(500).json({ error: 'Could not save booking settings' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId }, include: { site: { select: { userId: true } } } });
    if (!booking || booking.site.userId !== req.userId) return res.status(404).json({ error: 'Booking not found' });
    await prisma.booking.delete({ where: { id: booking.id } });
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Could not cancel the booking' });
  }
};

// ---- Public form (no sign-in). Returns a small HTML page, because published sites run without scripts. ----

const page = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;background:#0b0b10;color:#f4f4f5;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}main{max-width:480px;line-height:1.6}a{color:#a3e635}</style></head><body><main>${body}</main></body></html>`;

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const createPublicBooking = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const site = SLUG_PATTERN.test(slug) ? await prisma.site.findUnique({ where: { slug } }) : null;
    const owner = site ? await prisma.user.findUnique({ where: { id: site.userId } }) : null;
    if (!site || !site.bookingSettings?.enabled || !ownerAllowsBooking(owner?.plan)) {
      return res.status(404).type('html').send(page('Not available', '<h1>Booking is not available</h1><p>This site is not taking bookings right now.</p>'));
    }
    const settings = site.bookingSettings;
    const back = `https://${site.slug}.venture-pro.io`;

    // A hidden field that people never fill in. Bots usually do, so they get a success page and nothing is saved.
    if (req.body?.website) {
      return res.type('html').send(page('Thank you', `<h1>Thank you</h1><p>We have your request and will be in touch.</p><p><a href="${back}">Back to the site</a></p>`));
    }

    const body = req.body || {};
    const name = clip(body.name, 100);
    const email = clip(body.email, 254).toLowerCase();
    const phone = clip(body.phone, 40);
    const notes = clip(body.notes, 500);
    const service = settings.services.find((item) => item.name === body.service);
    const startMs = Date.parse(body.slot);
    if (!name || !EMAIL_RE.test(email) || !service || !Number.isFinite(startMs)) {
      return res.status(400).type('html').send(page('Check your details', `<h1>Please check your details</h1><p>Choose a service and a time, and fill in your name and a valid email address.</p><p><a href="${back}">Back to the site</a></p>`));
    }

    const nowMs = Date.now();
    const booked = await bookedRanges(site.id, nowMs, settings.daysAhead);
    if (!slotFits({ settings, startMs, minutes: service.minutes, nowMs, booked })) {
      return res.status(409).type('html').send(page('Time taken', `<h1>That time is no longer free</h1><p>Please go back and choose another time.</p><p><a href="${back}">Back to the site</a></p>`));
    }

    try {
      await prisma.booking.create({
        data: {
          siteId: site.id,
          startsAt: new Date(startMs),
          durationMin: service.minutes,
          serviceName: service.name,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          notes,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).type('html').send(page('Time taken', `<h1>That time is no longer free</h1><p>Please go back and choose another time.</p><p><a href="${back}">Back to the site</a></p>`));
      }
      throw error;
    }

    res.type('html').send(
      page(
        'Booking requested',
        `<h1>Thank you, ${escapeHtml(name)}</h1><p>Your ${escapeHtml(service.name)} is requested for <strong>${escapeHtml(formatSlot(startMs, settings.timezone))}</strong>.</p><p>We will be in touch to confirm.</p><p><a href="${back}">Back to the site</a></p>`,
      ),
    );
  } catch (error) {
    console.error('Public booking error:', error);
    res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please try again in a moment.</p>'));
  }
};

module.exports = { API_ORIGIN, publicBookingView, getOwnerBookings, updateSettings, cancelBooking, createPublicBooking, cleanSettings, TIMEZONES };
