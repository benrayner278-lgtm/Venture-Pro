// Dated classes and sessions for the shop. The owner describes the times in plain words. The AI turns that into a simple rule,
// the server works out every date from the rule, and the owner checks the list before saving it.
// A class with no places left is never offered, and a booking is refused if it fills up first.
const crypto = require('crypto');
const { getAnthropic } = require('./anthropic');
const { logUsage } = require('./usageLog');
const { DAY_KEYS, toMinutes, zonedToUtc, localDate, dayLabel, timeLabel, NOTICE_MINUTES } = require('./bookingTime');
const { cleanPhotos } = require('./photos');

const MAX_CLASSES = 8;
const MAX_OCCURRENCES = 1200;
const MAX_MONTHS = 12;
const MAX_EXCLUDE = 200;
const MINUTE = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const cleanPence = (value) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 && n <= 500000 ? n : 0;
};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// Words people use for groups of days. Anything else is matched on its first three letters, such as "Tuesdays" or "tue".
const DAY_GROUPS = { weekday: WEEKDAYS, weekdays: WEEKDAYS, 'week day': WEEKDAYS, 'week days': WEEKDAYS, weekend: ['sat', 'sun'], weekends: ['sat', 'sun'], 'every day': ALL_DAYS, daily: ALL_DAYS };

// Reads a time as HH:MM. Accepts 6am, 6:00am, 6pm, 06:00, 18:30, 10 am, noon and midnight. Returns null when it is not a time.
const parseClock = (value) => {
  const text = String(value ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  if (text === 'noon') return '12:00';
  if (text === 'midnight') return '00:00';
  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(text);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (match[3]) {
    if (hours < 1 || hours > 12) return null;
    if (match[3] === 'am' && hours === 12) hours = 0;
    if (match[3] === 'pm' && hours !== 12) hours += 12;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Turns a list of day names into day keys, expanding words such as "weekdays".
const dayKeysOf = (list) => {
  const keys = [];
  for (const item of Array.isArray(list) ? list : []) {
    const word = String(item ?? '').trim().toLowerCase();
    const group = DAY_GROUPS[word];
    const found = group || (DAY_KEYS.includes(word.slice(0, 3)) ? [word.slice(0, 3)] : []);
    for (const key of found) if (!keys.includes(key)) keys.push(key);
  }
  return keys;
};

// Checks a schedule rule, from the AI or from the database. Returns null when it cannot be used.
// A rule ends on endDate (inclusive), or after months. With neither, it runs for six months.
const cleanRule = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const days = dayKeysOf(raw.days);
  const from = toMinutes(parseClock(raw.from));
  const to = toMinutes(parseClock(raw.to));
  const everyMinutes = raw.everyMinutes === undefined || raw.everyMinutes === null ? 60 : Math.round(Number(raw.everyMinutes));
  const endDate = DATE_PATTERN.test(raw.endDate) ? raw.endDate : null;
  const hasMonths = raw.months !== undefined && raw.months !== null && raw.months !== '';
  const months = hasMonths ? Math.round(Number(raw.months)) : endDate ? null : 6;
  if (days.length === 0 || from === null || to === null || to <= from) return null;
  if (!(everyMinutes >= 15 && everyMinutes <= 480)) return null;
  if (months !== null && !(months >= 1 && months <= MAX_MONTHS)) return null;
  let skipWeeks = null;
  if (raw.skipWeeks && typeof raw.skipWeeks === 'object') {
    const every = Math.round(Number(raw.skipWeeks.every));
    const skipDays = dayKeysOf(raw.skipWeeks.days);
    if (every >= 2 && every <= 12 && skipDays.length > 0) skipWeeks = { every, days: skipDays };
  }
  const exclude = (Array.isArray(raw.exclude) ? raw.exclude : []).filter((d) => DATE_PATTERN.test(d)).slice(0, MAX_EXCLUDE);
  const startDate = DATE_PATTERN.test(raw.startDate) ? raw.startDate : null;
  return { days, from, to, everyMinutes, months, endDate, skipWeeks, exclude, startDate };
};

// Every start time the rule gives, as ISO strings. A class must finish by the rule's end time.
const expandRule = (rule, { minutes, timezone, nowMs }) => {
  const startKey = rule.startDate || localDate(nowMs, timezone);
  const [y, m, d] = startKey.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  // The window ends at the end date (included), or after the number of months. Never more than MAX_MONTHS ahead.
  const cap = Date.UTC(y, m - 1 + MAX_MONTHS, d);
  const byMonths = rule.months === null ? cap : Date.UTC(y, m - 1 + rule.months, d);
  const byDate = rule.endDate ? Date.parse(rule.endDate) + DAY_MS : cap;
  const end = Math.min(byDate, byMonths, cap);
  const exclude = new Set(rule.exclude);
  const earliest = nowMs + NOTICE_MINUTES * MINUTE;
  const out = [];
  for (let t = start; t < end && out.length < MAX_OCCURRENCES; t += DAY_MS) {
    const dateStr = new Date(t).toISOString().slice(0, 10);
    const weekday = DAY_KEYS[new Date(t).getUTCDay()];
    if (!rule.days.includes(weekday) || exclude.has(dateStr)) continue;
    const week = Math.floor((t - start) / (7 * DAY_MS)) + 1;
    if (rule.skipWeeks && week % rule.skipWeeks.every === 0 && rule.skipWeeks.days.includes(weekday)) continue;
    for (let mins = rule.from; mins + minutes <= rule.to && out.length < MAX_OCCURRENCES; mins += rule.everyMinutes) {
      const ms = zonedToUtc(dateStr, mins, timezone);
      if (ms >= earliest) out.push(new Date(ms).toISOString());
    }
  }
  return out;
};

const RULE_PROMPT = (today) => `You turn a business owner's description of when a class or session runs into a schedule rule.
Return ONLY JSON, with no other text. Example for "every weekday from 6am to 10am, every hour on the hour, until the new year":
{"days":["mon","tue","wed","thu","fri"],"from":"06:00","to":"10:00","everyMinutes":60,"months":null,"endDate":"2027-01-01","skipWeeks":null,"exclude":[],"startDate":null}

Rules:
- days: a list of mon, tue, wed, thu, fri, sat, sun. "week days" or "weekdays" means mon to fri. "every day" means all seven.
- from and to: 24-hour times as HH:MM, so 6am is "06:00", 10am is "10:00", 5pm is "17:00". "to" is when the last class must have finished.
- everyMinutes: how often a class starts, in minutes. "every hour" is 60. Default 60.
- endDate: the last day the classes run, as YYYY-MM-DD, when the owner names one. "until the new year" means 1 January of the next year. Otherwise null.
- months: only when the owner gives a length, such as "for the next 6 months". Otherwise null. Never more than 12.
- skipWeeks: only when the owner names weeks to miss. "every 4th week I don't do Tuesdays" is {"every":4,"days":["tue"]}. Otherwise null.
- exclude: dates to miss, as YYYY-MM-DD. Otherwise [].
- startDate: YYYY-MM-DD if the owner names a start date, otherwise null.
Today is ${today}.
If the description does not say which days or which times, return {"error":"say what is missing"}.`;

// A rule the AI gave that could not be used. The message is shown to the owner.
class RuleError extends Error {}

// One attempt at asking the AI for a rule. Throws RuleError when the answer cannot be used.
const askForRule = async ({ instruction, timezone, nowMs }) => {
  const today = localDate(nowMs, timezone);
  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 500,
    system: RULE_PROMPT(today),
    messages: [{ role: 'user', content: instruction }],
  });
  logUsage('class schedule', response);
  if (response.stop_reason === 'max_tokens') throw new RuleError('the answer was too long');
  const raw = response.content.find((block) => block.type === 'text')?.text || '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error('Class schedule answer was not JSON:', cleaned.slice(0, 300));
    throw new RuleError('the answer was not readable');
  }
  if (parsed?.error) throw new RuleError(String(parsed.error));
  const rule = cleanRule(parsed);
  if (!rule) {
    console.error('Class schedule rule not usable:', JSON.stringify(parsed).slice(0, 300));
    throw new RuleError('the days or times were not clear');
  }
  return rule;
};

// Asks the AI for the rule, trying once more when the first answer cannot be used.
const ruleFromText = async (args) => {
  try {
    return await askForRule(args);
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    return askForRule(args);
  }
};

// Checks the owner's list of classes. Keeps only future dates, so a saved list does not show the past.
const cleanClasses = (input, nowMs) => {
  if (!Array.isArray(input)) return { error: 'Add at least one class or session' };
  if (input.length === 0) return { value: [] };
  if (input.length > MAX_CLASSES) return { error: `Up to ${MAX_CLASSES} classes or sessions` };
  const names = new Set();
  const classes = [];
  for (const raw of input) {
    const name = clip(raw?.name, 60);
    const minutes = Math.round(Number(raw?.minutes));
    const capacity = Math.round(Number(raw?.capacity));
    if (!name) return { error: 'Every class or session needs a name' };
    if (names.has(name)) return { error: `"${name}" is listed twice. Give each class a different name` };
    if (!(minutes >= 15 && minutes <= 480)) return { error: `${name}: the length must be between 15 and 480 minutes` };
    if (!(capacity >= 1 && capacity <= 500)) return { error: `${name}: enter how many people can join, between 1 and 500` };
    names.add(name);
    const occurrences = [...new Set((Array.isArray(raw?.occurrences) ? raw.occurrences : [])
      .map((value) => Date.parse(value))
      .filter((ms) => Number.isFinite(ms) && ms > nowMs)
      .map((ms) => new Date(ms).toISOString()))]
      .sort()
      .slice(0, MAX_OCCURRENCES);
    classes.push({
      id: clip(raw?.id, 40) || crypto.randomUUID(),
      name,
      minutes,
      capacity,
      pricePence: cleanPence(raw?.pricePence),
      instruction: clip(raw?.instruction, 300),
      occurrences,
      photos: cleanPhotos(raw?.photos),
    });
  }
  return { value: classes };
};

// The one class offered at this exact time, or null. Used when a visitor books and when a payment starts.
const classOffer = (classes, serviceName, startMs, nowMs) => {
  if (!Array.isArray(classes)) return null;
  const cls = classes.find((item) => item.name === serviceName);
  if (!cls || startMs < nowMs + NOTICE_MINUTES * MINUTE) return null;
  if (!cls.occurrences.includes(new Date(startMs).toISOString())) return null;
  return { serviceName: cls.name, minutes: cls.minutes, capacity: cls.capacity, pricePence: cls.pricePence, isSession: true };
};

// What the shop page offers for each class: only times with places left, grouped by day.
// rows are the bookings already taken for these classes.
const classOffers = ({ classes, timezone, nowMs, rows }) => {
  const offers = [];
  for (const cls of Array.isArray(classes) ? classes : []) {
    const days = [];
    for (const iso of cls.occurrences) {
      const startMs = Date.parse(iso);
      if (startMs < nowMs + NOTICE_MINUTES * MINUTE) continue;
      const taken = rows.filter((row) => row.startsAt.getTime() === startMs && row.serviceName === cls.name).length;
      const left = cls.capacity - taken;
      if (left <= 0) continue;
      const key = localDate(startMs, timezone);
      let day = days.find((entry) => entry.key === key);
      if (!day) {
        day = { key, label: dayLabel(startMs, timezone), slots: [] };
        days.push(day);
      }
      day.slots.push({ value: new Date(startMs).toISOString(), label: `${timeLabel(startMs, timezone)} · ${left} ${left === 1 ? 'place' : 'places'} left` });
    }
    if (days.length > 0) offers.push({ name: cls.name, minutes: cls.minutes, pricePence: cls.pricePence, photos: cls.photos || [], days });
  }
  return offers;
};

module.exports = { MAX_OCCURRENCES, parseClock, cleanRule, expandRule, ruleFromText, RuleError, cleanClasses, classOffer, classOffers };
