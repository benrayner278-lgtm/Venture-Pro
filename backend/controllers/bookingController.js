const prisma = require('../lib/prisma');
const { getAnthropic } = require('../lib/anthropic');
const { PLANS, planKey } = require('../lib/plans');
const { DAY_KEYS, toMinutes, slotFits, availableSlots, sessionStarts, formatSlot, localDate, dayLabel, timeLabel } = require('../lib/bookingTime');
const { PRESET_KEYS, DEFAULT_PRESET, presetOf } = require('../lib/bookingPresets');
const { TEMPLATES, TEMPLATE_IDS, templateOf, catalogueForAdvisor } = require('../lib/bookingTemplates');
const { sendEmail } = require('../lib/email');
const { googleCalendarUrl, ownerMessage, customerConfirmedMessage, customerRequestedMessage } = require('../lib/bookingMessages');

// Where the public booking form posts to. Published sites are served from another domain, so this must be the API's address.
const API_ORIGIN = process.env.API_PUBLIC_URL || 'https://venture-pro-production.up.railway.app';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MAX_SERVICE_MINUTES = 480;
const ADVISOR_MODEL = 'claude-sonnet-5-5';

// Timezones a business can choose. Keep in step with the booking settings page.
const TIMEZONES = [
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney',
];
const KINDS = ['appointments', 'call', 'sessions'];
const SLOT_OPTIONS = [15, 30, 60];
const MAX_SERVICES = 6;
const MAX_SESSIONS = 20;
// The first site address in FRONTEND_URL, which can list more than one. Used for links in emails.
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'https://venture-pro.io').split(',')[0].trim();

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Checks the owner's settings and keeps only valid values. Returns an error message when something is wrong.
const cleanSettings = (input) => {
  if (!input || typeof input !== 'object') return { error: 'Booking settings are missing' };
  const timezone = TIMEZONES.includes(input.timezone) ? input.timezone : null;
  if (!timezone) return { error: 'Choose a timezone from the list' };
  const kind = KINDS.includes(input.kind) ? input.kind : 'appointments';
  const slotMinutes = SLOT_OPTIONS.includes(Number(input.slotMinutes)) ? Number(input.slotMinutes) : 30;
  const daysAhead = Math.min(28, Math.max(7, Math.round(Number(input.daysAhead) || 14)));
  const template = TEMPLATE_IDS.includes(input.template) ? input.template : null;
  const callDetails = clip(input.callDetails, 200);

  const hours = {};
  for (const key of DAY_KEYS) {
    const day = input.hours?.[key];
    const open = Array.isArray(day) ? toMinutes(day[0]) : null;
    const close = Array.isArray(day) ? toMinutes(day[1]) : null;
    hours[key] = open !== null && close !== null && open < close ? [day[0], day[1]] : null;
  }

  const services = (Array.isArray(input.services) ? input.services : [])
    .slice(0, MAX_SERVICES)
    .map((service) => ({
      name: clip(service?.name, 60),
      minutes: Math.round(Number(service?.minutes)),
      price: clip(service?.price, 40),
    }))
    .filter((service) => service.name && service.minutes >= 15 && service.minutes <= MAX_SERVICE_MINUTES);

  const sessions = (Array.isArray(input.sessions) ? input.sessions : [])
    .slice(0, MAX_SESSIONS)
    .map((session) => ({
      name: clip(session?.name, 60),
      day: DAY_KEYS.includes(session?.day) ? session.day : null,
      time: toMinutes(session?.time) === null ? null : session.time,
      minutes: Math.round(Number(session?.minutes)),
      capacity: Math.round(Number(session?.capacity)),
    }))
    .filter((session) => session.name && session.day && session.time && session.minutes >= 15 && session.minutes <= MAX_SERVICE_MINUTES && session.capacity >= 1 && session.capacity <= 500);

  if (kind === 'sessions') {
    if (sessions.length === 0) return { error: 'Add at least one class or session with a day, time, length and number of places' };
  } else {
    if (!Object.values(hours).some(Boolean)) return { error: 'Open at least one day of the week' };
    if (services.length === 0) return { error: 'Add at least one service with a length between 15 and 480 minutes' };
  }

  const preset = PRESET_KEYS.includes(input.preset) ? input.preset : DEFAULT_PRESET;
  return {
    value: {
      enabled: input.enabled === true,
      preset,
      template,
      kind,
      callDetails,
      timezone,
      slotMinutes,
      daysAhead,
      hours,
      services: kind === 'sessions' ? [] : services,
      sessions: kind === 'sessions' ? sessions : [],
    },
  };
};

// Bookings that already take up time in the window the form covers.
const bookingRows = (siteId, nowMs, daysAhead) =>
  prisma.booking.findMany({
    where: {
      siteId,
      status: { in: ['confirmed', 'requested'] },
      startsAt: { gte: new Date(nowMs - DAY), lte: new Date(nowMs + (daysAhead + 2) * DAY) },
    },
    select: { startsAt: true, durationMin: true, serviceName: true },
  });

const toRanges = (rows) => rows.map((row) => ({ startMs: row.startsAt.getTime(), endMs: row.startsAt.getTime() + row.durationMin * MINUTE }));

const ownerAllowsBooking = (plan) => PLANS[planKey(plan)].booking;

const addToDay = (days, startMs, timeZone, item) => {
  const key = localDate(startMs, timeZone);
  let day = days.find((entry) => entry.key === key);
  if (!day) {
    day = { key, label: dayLabel(startMs, timeZone), slots: [] };
    days.push(day);
  }
  day.slots.push(item);
};

// What the published site needs to show the booking form. Returns null when the form should not show.
const publicBookingView = async (site, ownerPlan) => {
  const settings = site.bookingSettings;
  if (!settings?.enabled || !ownerAllowsBooking(ownerPlan)) return null;
  const nowMs = Date.now();
  const rows = await bookingRows(site.id, nowMs, settings.daysAhead);
  const days = [];
  const action = `${API_ORIGIN}/api/bookings/public/${site.slug}`;

  if (settings.kind === 'sessions') {
    for (const { startMs, session } of sessionStarts({ settings, nowMs })) {
      const taken = rows.filter((row) => row.startsAt.getTime() === startMs && row.serviceName === session.name).length;
      const left = session.capacity - taken;
      if (left <= 0) continue;
      const when = timeLabel(startMs, settings.timezone);
      addToDay(days, startMs, settings.timezone, {
        value: `${new Date(startMs).toISOString()}|${session.name}`,
        label: `${when} ${session.name} · ${left} ${left === 1 ? 'place' : 'places'} left`,
      });
    }
    return { kind: 'sessions', heading: 'Book a place', action, services: [], days, daysAhead: settings.daysAhead, callDetails: '' };
  }

  for (const slot of availableSlots({ settings, nowMs, booked: toRanges(rows) })) {
    addToDay(days, slot.startMs, settings.timezone, { value: new Date(slot.startMs).toISOString(), label: timeLabel(slot.startMs, settings.timezone) });
  }
  const isCall = settings.kind === 'call';
  return {
    kind: settings.kind,
    heading: isCall ? 'Book a call' : 'Book a time',
    action,
    services: settings.services,
    days,
    daysAhead: settings.daysAhead,
    callDetails: isCall ? settings.callDetails || '' : '',
  };
};

// ---- Owner endpoints (signed in) ----

// The preset catalogue for the Bookings page.
const listPresets = (req, res) => res.json({ templates: TEMPLATES });

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
        status: booking.status,
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

// Applies a preset to the site's booking settings. Keeps the owner's own choices: on/off, timezone, notices and call details.
const applyTemplate = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ownerAllowsBooking(user?.plan)) {
      return res.status(403).json({ error: 'Online booking is included in Business and above' });
    }
    const template = templateOf(req.body?.templateId);
    if (!template) return res.status(400).json({ error: 'Choose a booking preset from the list' });

    const current = site.bookingSettings || {};
    const hours = Object.fromEntries(DAY_KEYS.map((key) => [key, template.hours[key] || null]));
    const { value, error } = cleanSettings({
      enabled: current.enabled === true,
      preset: template.confirm === 'approve' ? 'approve' : current.preset,
      template: template.id,
      kind: template.kind,
      callDetails: current.callDetails || '',
      timezone: current.timezone || 'Europe/London',
      slotMinutes: template.slotMinutes,
      daysAhead: current.daysAhead || 14,
      hours,
      services: template.services,
      sessions: template.sessions,
    });
    if (error) return res.status(400).json({ error });
    await prisma.site.update({ where: { id: site.id }, data: { bookingSettings: value } });
    res.json({ settings: value });
  } catch (error) {
    console.error('Apply booking preset error:', error);
    res.status(500).json({ error: 'Could not apply the preset' });
  }
};

const ADVISOR_TOOL = {
  name: 'recommend_template',
  description: 'Recommend one booking preset for this business. Call it only once you know enough about the business to choose. The owner still has to agree before it is added.',
  input_schema: {
    type: 'object',
    properties: {
      template_id: { type: 'string', enum: TEMPLATE_IDS, description: 'The id of the preset from the list.' },
      reason: { type: 'string', description: 'One or two plain sentences on why this preset fits this business.' },
    },
    required: ['template_id', 'reason'],
  },
};

const advisorSystemPrompt = () =>
  [
    'You help a small business owner choose how online booking should work on their website.',
    'Ask short questions, one or two at a time. Find out: what they sell or offer, how long each job or class takes, whether customers come to them or they visit customers, whether they run repeating classes or one-off visits, how many people can book at the same time, and whether a simple phone or video call is what they need.',
    'When you know enough, call the recommend_template tool with the single best preset id from the list below, and explain in plain words why it fits. Speak in preset names, not ids. Keep replies short and friendly.',
    'Do not promise features that are not in the list. The owner decides: they add the preset with a button under your reply, so say that.',
    'Presets (JSON):',
    JSON.stringify(catalogueForAdvisor()),
  ].join('\n');

// A live chat that helps the owner pick a preset. Nothing is changed until the owner clicks to add it.
const advisor = async (req, res) => {
  try {
    const site = await ownedSite(req, res);
    if (!site) return;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ownerAllowsBooking(user?.plan)) {
      return res.status(403).json({ error: 'Online booking is included in Business and above' });
    }
    const { chatPerDay } = PLANS[planKey(user.plan)];
    const day = new Date().toISOString().slice(0, 10);
    const usageKey = { userId_day: { userId: req.userId, day } };
    const usage = await prisma.chatDailyUsage.findUnique({ where: usageKey });
    if ((usage?.count || 0) >= chatPerDay) {
      return res.status(429).json({ error: `You have used today's ${chatPerDay} chatbot messages. The limit resets at midnight UTC.` });
    }

    const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
      .filter((item) => (item?.role === 'user' || item?.role === 'assistant') && typeof item.content === 'string' && item.content.trim())
      .slice(-20)
      .map((item) => ({ role: item.role, content: clip(item.content, 2000) }));
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Send a message to start' });
    }

    const response = await getAnthropic().messages.create({
      model: ADVISOR_MODEL,
      max_tokens: 1024,
      system: advisorSystemPrompt(),
      tools: [ADVISOR_TOOL],
      messages,
    });

    await prisma.chatDailyUsage.upsert({
      where: usageKey,
      create: { userId: req.userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    const use = response.content.find((block) => block.type === 'tool_use' && block.name === 'recommend_template');
    const picked = use && templateOf(use.input?.template_id);
    const proposal = picked ? { templateId: picked.id, name: picked.name, reason: clip(use.input.reason, 400) } : null;
    res.json({ reply, proposal });
  } catch (error) {
    console.error('Booking advisor error:', error);
    res.status(500).json({ error: 'The booking assistant could not reply. Please try again.' });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId }, include: { site: true } });
    if (!booking || booking.site.userId !== req.userId) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'requested') return res.status(409).json({ error: 'This booking is already confirmed' });
    const confirmed = await prisma.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
    const settings = booking.site.bookingSettings || {};
    if (presetOf(settings).customerEmail) {
      sendCustomerEmail({ booking: confirmed, settings, businessName: booking.site.title || booking.site.slug, requested: false });
    }
    res.json({ message: 'Booking confirmed', status: 'confirmed' });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ error: 'Could not confirm the booking' });
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

// Sends the customer an email: a confirmation with a calendar invite, or a receipt for a request that still needs confirming.
const sendCustomerEmail = ({ booking, settings, businessName, requested }) => {
  const timezone = settings.timezone || 'Europe/London';
  const note = settings.kind === 'call' && settings.callDetails ? `Call details: ${settings.callDetails}` : '';
  const message = requested
    ? customerRequestedMessage({ booking, timezone, businessName })
    : customerConfirmedMessage({ booking, timezone, businessName, note });
  return sendEmail({ to: booking.customerEmail, ...message });
};

const conflictPage = (back) =>
  page('Time taken', `<h1>That time is no longer free</h1><p>Please go back and choose another time.</p><p><a href="${back}">Back to the site</a></p>`);

const createPublicBooking = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const site = SLUG_PATTERN.test(slug) ? await prisma.site.findUnique({ where: { slug } }) : null;
    const owner = site ? await prisma.user.findUnique({ where: { id: site.userId } }) : null;
    if (!site || !site.bookingSettings?.enabled || !ownerAllowsBooking(owner?.plan)) {
      return res.status(404).type('html').send(page('Not available', '<h1>Booking is not available</h1><p>This site is not taking bookings right now.</p>'));
    }
    const settings = site.bookingSettings;
    const preset = presetOf(settings);
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
    // Class times arrive as "start|class name". Appointments send just the start time.
    const [slotText, sessionName] = String(body.slot || '').split('|');
    const startMs = Date.parse(slotText);
    const isSessions = settings.kind === 'sessions';
    const session = isSessions ? (settings.sessions || []).find((item) => item.name === sessionName) : null;
    const service = isSessions
      ? session && { name: session.name, minutes: session.minutes, capacity: session.capacity }
      : settings.services.find((item) => item.name === body.service) && { ...settings.services.find((item) => item.name === body.service), capacity: 1 };
    if (!name || !EMAIL_RE.test(email) || !service || !Number.isFinite(startMs)) {
      return res.status(400).type('html').send(page('Check your details', `<h1>Please check your details</h1><p>Choose a time, and fill in your name and a valid email address.</p><p><a href="${back}">Back to the site</a></p>`));
    }

    const nowMs = Date.now();
    if (isSessions) {
      const offered = sessionStarts({ settings, nowMs }).some((item) => item.startMs === startMs && item.session.name === service.name);
      if (!offered) return res.status(409).type('html').send(conflictPage(back));
    } else if (!slotFits({ settings, startMs, minutes: service.minutes, nowMs, booked: toRanges(await bookingRows(site.id, nowMs, settings.daysAhead)) })) {
      return res.status(409).type('html').send(conflictPage(back));
    }

    // Checks the places (classes) or the overlap (appointments) and saves in one step, so two people cannot take the last place.
    let booking;
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          const nearby = await tx.booking.findMany({
            where: {
              siteId: site.id,
              status: { in: ['confirmed', 'requested'] },
              startsAt: { gte: new Date(startMs - MAX_SERVICE_MINUTES * MINUTE), lte: new Date(startMs + MAX_SERVICE_MINUTES * MINUTE) },
            },
            select: { startsAt: true, durationMin: true, serviceName: true },
          });
          if (isSessions) {
            const places = nearby.filter((row) => row.startsAt.getTime() === startMs && row.serviceName === service.name).length;
            if (places >= service.capacity) return null;
          } else {
            const endMs = startMs + service.minutes * MINUTE;
            if (nearby.some((row) => row.startsAt.getTime() < endMs && startMs < row.startsAt.getTime() + row.durationMin * MINUTE)) return null;
          }
          return tx.booking.create({
            data: {
              siteId: site.id,
              startsAt: new Date(startMs),
              durationMin: service.minutes,
              serviceName: service.name,
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              notes,
              status: preset.confirm === 'approve' ? 'requested' : 'confirmed',
            },
          });
        },
        { isolationLevel: 'Serializable' }
      );
    } catch (error) {
      if (error.code === 'P2034') return res.status(409).type('html').send(conflictPage(back));
      throw error;
    }
    if (!booking) return res.status(409).type('html').send(conflictPage(back));

    const businessName = site.title || site.slug;
    const requested = booking.status === 'requested';
    if (preset.ownerEmail && owner?.email) {
      sendEmail({ to: owner.email, ...ownerMessage({ booking, timezone: settings.timezone, businessName, requested, manageUrl: `${FRONTEND_ORIGIN}/bookings` }) });
    }
    if (preset.customerEmail) {
      sendCustomerEmail({ booking, settings, businessName, requested });
    }

    const when = formatSlot(startMs, settings.timezone);
    const calendarLink =
      preset.calendarLink && !requested
        ? `<p><a href="${escapeHtml(googleCalendarUrl({ booking, title: `${service.name} with ${businessName}`, details: `Your booking with ${businessName}.` }))}">Add to Google Calendar</a></p>`
        : '';
    const callLine = settings.kind === 'call' && settings.callDetails && !requested ? `<p>${escapeHtml(settings.callDetails)}</p>` : '';
    const status = requested
      ? `<p>Your ${escapeHtml(service.name)} is requested for <strong>${escapeHtml(when)}</strong>.</p><p>We will be in touch to confirm.</p>`
      : `<p>Your ${escapeHtml(service.name)} is booked for <strong>${escapeHtml(when)}</strong>.</p>${callLine}${calendarLink}`;
    res.type('html').send(page(requested ? 'Booking requested' : 'Booking confirmed', `<h1>Thank you, ${escapeHtml(name)}</h1>${status}<p><a href="${back}">Back to the site</a></p>`));
  } catch (error) {
    console.error('Public booking error:', error);
    res.status(500).type('html').send(page('Something went wrong', '<h1>Something went wrong</h1><p>Please try again in a moment.</p>'));
  }
};

module.exports = { API_ORIGIN, publicBookingView, listPresets, getOwnerBookings, updateSettings, applyTemplate, advisor, confirmBooking, cancelBooking, createPublicBooking, cleanSettings, TIMEZONES };
