// The calendar files, calendar links and plain-text emails for a booking. Plain text only, so customer details are never rendered as HTML.
const { formatSlot } = require('./bookingTime');

const pad = (value) => String(value).padStart(2, '0');
const utcStamp = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const escapeIcs = (text) =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// Calendar files allow at most 75 characters per line. Longer lines continue on the next line, starting with a space.
const foldLine = (line) => {
  const parts = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join('\r\n ');
};

const windowOf = ({ startsAt, durationMin }) => {
  const start = new Date(startsAt);
  return { start, end: new Date(start.getTime() + durationMin * 60 * 1000) };
};

// A calendar file that Google, Apple and Outlook can open to add the booking.
const calendarFile = ({ booking, title, details }) => {
  const { start, end } = windowOf(booking);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Venture-Pro//Bookings//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@venture-pro.io`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
};

// A link that opens Google Calendar with the booking already filled in.
const googleCalendarUrl = ({ booking, title, details }) => {
  const { start, end } = windowOf(booking);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${utcStamp(start)}/${utcStamp(end)}`, details });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const describe = (booking, timezone) => [
  `Service: ${booking.serviceName}`,
  `When: ${formatSlot(booking.startsAt.getTime(), timezone)}`,
];

const ownerMessage = ({ booking, timezone, businessName, requested, manageUrl }) => {
  const lines = [
    `${booking.customerName} has ${requested ? 'requested' : 'booked'} a time with ${businessName}.`,
    '',
    ...describe(booking, timezone),
    `Name: ${booking.customerName}`,
    `Email: ${booking.customerEmail}`,
  ];
  if (booking.customerPhone) lines.push(`Phone: ${booking.customerPhone}`);
  if (booking.notes) lines.push(`Notes: ${booking.notes}`);
  lines.push('');
  lines.push(requested ? `Confirm or check it in your Bookings page: ${manageUrl}` : `You can see it in your Bookings page: ${manageUrl}`);
  return {
    subject: `${requested ? 'Booking request' : 'New booking'}: ${booking.serviceName} with ${booking.customerName}`,
    text: lines.join('\n'),
  };
};

const customerConfirmedMessage = ({ booking, timezone, businessName }) => {
  const title = `${booking.serviceName} with ${businessName}`;
  const details = `Your booking with ${businessName}.`;
  return {
    subject: `Your booking with ${businessName} is confirmed`,
    text: [`Hi ${booking.customerName},`, '', `Your ${booking.serviceName} with ${businessName} is confirmed.`, ...describe(booking, timezone), '', 'The calendar invite is attached. Add it to your calendar so you do not miss it.', '', `Thank you,`, businessName].join('\n'),
    attachments: [{ filename: 'booking.ics', content: Buffer.from(calendarFile({ booking, title, details })).toString('base64') }],
  };
};

const customerRequestedMessage = ({ booking, timezone, businessName }) => ({
  subject: `We have your booking request with ${businessName}`,
  text: [`Hi ${booking.customerName},`, '', `Thank you for your request. ${businessName} will confirm your ${booking.serviceName} by email.`, ...describe(booking, timezone), '', `Thank you,`, businessName].join('\n'),
});

module.exports = { calendarFile, googleCalendarUrl, ownerMessage, customerConfirmedMessage, customerRequestedMessage };
