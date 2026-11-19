// Bookings sold through the shop basket. A slot is held while the visitor pays, and becomes a real booking once Stripe confirms the payment.
// A held slot counts as taken until its hold runs out, so two people cannot pay for the same time.
const prisma = require('./prisma');
const { slotFits, sessionStarts, formatSlot } = require('./bookingTime');
const { presetOf } = require('./bookingPresets');
const { classOffer } = require('./classSchedule');
const { sendEmail } = require('./email');
const { getStripe } = require('./stripe');
const { customerConfirmedMessage, customerRequestedMessage } = require('./bookingMessages');

const MINUTE = 60 * 1000;
const MAX_SERVICE_MINUTES = 480;
// Stripe Checkout sessions last 30 minutes at least. The hold lasts longer, so a paid session always has its slot.
const SESSION_MINUTES = 31;
const HOLD_MINUTES = 35;

// What the owner offers at this time, or null when that service is not on offer at that time.
const offerFor = (settings, serviceName, startMs, nowMs) => {
  // Dated classes from the shop come first. They are checked on their own list of times.
  const dated = classOffer(settings.classes, serviceName, startMs, nowMs);
  if (dated) return dated;
  if (settings.kind === 'sessions') {
    const session = (settings.sessions || []).find((item) => item.name === serviceName);
    if (!session) return null;
    const offered = sessionStarts({ settings, nowMs }).some((item) => item.startMs === startMs && item.session.name === session.name);
    if (!offered) return null;
    return { serviceName: session.name, minutes: session.minutes, capacity: session.capacity, pricePence: session.pricePence || 0, isSession: true };
  }
  const service = (settings.services || []).find((item) => item.name === serviceName);
  if (!service) return null;
  return { serviceName: service.name, minutes: service.minutes, capacity: 1, pricePence: service.pricePence || 0, isSession: false };
};

// Thrown inside the transaction so that nothing is saved when one slot is no longer free.
class SlotError extends Error {}

const rangeOf = (row) => ({ startMs: row.startsAt.getTime(), endMs: row.startsAt.getTime() + row.durationMin * MINUTE });

// Creates a booking for each requested slot, checking each one against the bookings already in the database.
// Runs as one serializable transaction, so two checkouts cannot both take the last place.
// status is 'held' while the visitor pays, or the final status for a free booking.
const createSlotBookings = async ({ siteId, settings, requests, nowMs, customer, status, holdUntil }) => {
  try {
    const bookings = await prisma.$transaction(
      async (tx) => {
        // Holds that ran out are no longer needed.
        await tx.booking.deleteMany({ where: { siteId, status: 'held', holdUntil: { lt: new Date(nowMs) } } });
        const created = [];
        for (const request of requests) {
          const offer = offerFor(settings, request.service, request.startMs, nowMs);
          if (!offer) throw new SlotError('That time is no longer offered. Please choose another time.');
          const nearby = await tx.booking.findMany({
            where: {
              siteId,
              OR: [{ status: { in: ['confirmed', 'requested'] } }, { status: 'held', holdUntil: { gt: new Date(nowMs) } }],
              startsAt: { gte: new Date(request.startMs - MAX_SERVICE_MINUTES * MINUTE), lte: new Date(request.startMs + MAX_SERVICE_MINUTES * MINUTE) },
            },
            select: { startsAt: true, durationMin: true, serviceName: true },
          });
          if (offer.isSession) {
            const places = nearby.filter((row) => row.startsAt.getTime() === request.startMs && row.serviceName === offer.serviceName).length;
            if (places >= offer.capacity) throw new SlotError(`Sorry, ${offer.serviceName} has no places left at that time.`);
          } else if (!slotFits({ settings, startMs: request.startMs, minutes: offer.minutes, nowMs, booked: nearby.map(rangeOf) })) {
            throw new SlotError('Sorry, that time was just taken. Please choose another time.');
          }
          const booking = await tx.booking.create({
            data: {
              siteId,
              startsAt: new Date(request.startMs),
              durationMin: offer.minutes,
              serviceName: offer.serviceName,
              customerName: customer.name,
              customerEmail: customer.email,
              customerPhone: customer.phone,
              notes: customer.notes,
              status,
              holdUntil: holdUntil || null,
              amountPence: offer.pricePence,
            },
          });
          created.push({ ...booking, offer });
        }
        return created;
      },
      { isolationLevel: 'Serializable' }
    );
    return { created: bookings };
  } catch (error) {
    if (error instanceof SlotError) return { error: error.message };
    if (error.code === 'P2034') return { error: 'Sorry, that time was just taken. Please choose another time.' };
    throw error;
  }
};

// Starts a hold for each slot in the basket. Returns the held bookings, or an error the visitor can read.
const holdSlots = (args) => createSlotBookings({ ...args, status: 'held', holdUntil: new Date(args.nowMs + HOLD_MINUTES * MINUTE) });

// Free bookings (price zero) skip payment and are confirmed straight away.
const bookFreeSlots = (args) => createSlotBookings({ ...args, status: finalStatus(args.settings), holdUntil: null });

const finalStatus = (settings) => (presetOf(settings).confirm === 'approve' ? 'requested' : 'confirmed');

// Gives the customer a confirmation (or a request receipt) for one booking.
const emailCustomer = ({ booking, settings, businessName }) => {
  if (!presetOf(settings).customerEmail || !booking.customerEmail) return;
  const timezone = settings.timezone || 'Europe/London';
  const requested = booking.status === 'requested';
  const note = settings.kind === 'call' && settings.callDetails ? `Call details: ${settings.callDetails}` : '';
  const message = requested
    ? customerRequestedMessage({ booking, timezone, businessName })
    : customerConfirmedMessage({ booking, timezone, businessName, note });
  sendEmail({ to: booking.customerEmail, ...message });
};

// Turns the held bookings of a paid order into real ones. Emails go out only when this call made the change.
const confirmPaidBookings = async ({ site, settings, orderId }) => {
  const held = await prisma.booking.findMany({ where: { orderId, status: 'held' } });
  if (held.length === 0) return [];
  const moved = await prisma.booking.updateMany({
    where: { id: { in: held.map((booking) => booking.id) }, status: 'held' },
    data: { status: finalStatus(settings), holdUntil: null },
  });
  if (moved.count === 0) return [];
  const businessName = site.title || site.slug;
  const bookings = await prisma.booking.findMany({ where: { id: { in: held.map((booking) => booking.id) } }, orderBy: { startsAt: 'asc' } });
  bookings.forEach((booking) => emailCustomer({ booking, settings, businessName }));
  return bookings;
};

// Removes the held bookings of a checkout that could not be started.
const releaseHolds = (bookingIds) => prisma.booking.deleteMany({ where: { id: { in: bookingIds }, status: 'held' } });

// A short line for emails, such as "Tue 1 Dec 10:30 · Consultation".
const slotLine = (booking, timezone) => `${formatSlot(booking.startsAt.getTime(), timezone)} · ${booking.serviceName}`;

// When an owner declines a paid request, the visitor gets their money back for that time, and is told.
const refundDeclined = async ({ booking, businessName }) => {
  if (booking.status !== 'requested' || !booking.orderId || !(booking.amountPence > 0)) return null;
  const order = await prisma.shopOrder.findUnique({ where: { id: booking.orderId }, include: { site: { include: { user: true } } } });
  if (!order?.paymentIntent || !order.site?.user?.stripeAccountId) return null;
  const refund = await getStripe().refunds.create(
    { payment_intent: order.paymentIntent, amount: booking.amountPence },
    { stripeAccount: order.site.user.stripeAccountId }
  );
  if (booking.customerEmail) {
    sendEmail({
      to: booking.customerEmail,
      subject: `Your request with ${businessName} could not be accepted`,
      text: `Sorry, ${businessName} could not accept your request for ${booking.serviceName}. We have refunded the payment for that time. It can take a few days to reach your account.`,
    });
  }
  return refund;
};

module.exports = { HOLD_MINUTES, SESSION_MINUTES, offerFor, holdSlots, bookFreeSlots, confirmPaidBookings, releaseHolds, slotLine, finalStatus, emailCustomer, refundDeclined };
