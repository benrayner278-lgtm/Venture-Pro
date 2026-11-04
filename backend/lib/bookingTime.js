// Opening hours and slot maths for bookings. Times are worked out in the business's own timezone.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MINUTE = 60 * 1000;
const NOTICE_MINUTES = 60; // A booking must be at least an hour away.

const toMinutes = (hhmm) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

// How far the timezone is ahead of UTC at that instant, in minutes.
const offsetMinutes = (utcMs, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - utcMs) / MINUTE);
};

// The UTC instant for a wall-clock time on a calendar date in a timezone.
const zonedToUtc = (dateStr, minutesOfDay, timeZone) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day) + minutesOfDay * MINUTE;
  const firstGuess = wallClock - offsetMinutes(wallClock, timeZone) * MINUTE;
  return wallClock - offsetMinutes(firstGuess, timeZone) * MINUTE;
};

// The calendar date (YYYY-MM-DD) that a UTC instant falls on in a timezone.
const localDate = (utcMs, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(utcMs));
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const weekdayOf = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

// Whether a booking starting at startMs and lasting `minutes` fits the opening hours, the grid and the existing bookings.
const slotFits = ({ settings, startMs, minutes, nowMs, booked }) => {
  const timeZone = settings.timezone;
  if (startMs < nowMs + NOTICE_MINUTES * MINUTE) return false;
  const dateStr = localDate(startMs, timeZone);
  const hours = settings.hours?.[DAY_KEYS[weekdayOf(dateStr)]];
  if (!hours) return false;
  const open = toMinutes(hours[0]);
  const close = toMinutes(hours[1]);
  const startOfDay = zonedToUtc(dateStr, 0, timeZone);
  const minutesIntoDay = Math.round((startMs - startOfDay) / MINUTE);
  const sinceOpen = minutesIntoDay - open;
  if (sinceOpen < 0 || sinceOpen % settings.slotMinutes !== 0) return false;
  if (minutesIntoDay + minutes > close) return false;
  const endMs = startMs + minutes * MINUTE;
  return !booked.some((range) => range.startMs < endMs && startMs < range.endMs);
};

// Every bookable start for the next few days, for the shortest service on offer.
const availableSlots = ({ settings, nowMs, booked }) => {
  const shortest = Math.min(...settings.services.map((service) => service.minutes));
  const slots = [];
  for (let day = 0; day < settings.daysAhead; day++) {
    const dateStr = localDate(nowMs + day * 24 * 60 * MINUTE, settings.timezone);
    const hours = settings.hours?.[DAY_KEYS[weekdayOf(dateStr)]];
    if (!hours) continue;
    const open = toMinutes(hours[0]);
    const close = toMinutes(hours[1]);
    for (let t = open; t + shortest <= close; t += settings.slotMinutes) {
      const startMs = zonedToUtc(dateStr, t, settings.timezone);
      if (slotFits({ settings, startMs, minutes: shortest, nowMs, booked })) {
        slots.push({ startMs, dateStr });
      }
    }
  }
  return slots;
};

// The next start times of repeating sessions (classes) within the booking window, in date order.
const sessionStarts = ({ settings, nowMs }) => {
  const starts = [];
  for (let day = 0; day < settings.daysAhead; day++) {
    const dateStr = localDate(nowMs + day * 24 * 60 * MINUTE, settings.timezone);
    const weekdayKey = DAY_KEYS[weekdayOf(dateStr)];
    for (const session of settings.sessions || []) {
      if (session.day !== weekdayKey) continue;
      const startMs = zonedToUtc(dateStr, toMinutes(session.time), settings.timezone);
      if (startMs >= nowMs + NOTICE_MINUTES * MINUTE) starts.push({ startMs, session });
    }
  }
  return starts.sort((a, b) => a.startMs - b.startMs);
};

// Whether a start time really is one of the session's times (so a customer cannot pick a made-up time).
const isSessionStart = (session, startMs, timeZone) => {
  const dateStr = localDate(startMs, timeZone);
  return DAY_KEYS[weekdayOf(dateStr)] === session.day && zonedToUtc(dateStr, toMinutes(session.time), timeZone) === startMs;
};

// Human-readable time in the business's timezone, e.g. "Tue 4 Nov, 09:30".
const formatSlot = (startMs, timeZone) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(startMs));

// Labels for the timetable: a day heading such as "Monday 9 November", and a time such as "09:30".
const dayLabel = (startMs, timeZone) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(startMs));
const timeLabel = (startMs, timeZone) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(startMs));

module.exports = { DAY_KEYS, toMinutes, zonedToUtc, localDate, slotFits, availableSlots, sessionStarts, isSessionStart, formatSlot, dayLabel, timeLabel, NOTICE_MINUTES };
