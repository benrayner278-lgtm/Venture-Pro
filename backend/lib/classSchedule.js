// Dated classes and sessions for the shop. The owner describes the times in plain words. The AI turns that into a simple rule,
// the server works out every date from the rule, and the owner checks the list before saving it.
// A class with no places left is never offered, and a booking is refused if it fills up first.
const crypto = require('crypto');
const { getAnthropic } = require('./anthropic');
const { logUsage } = require('./usageLog');
const { DAY_KEYS, toMinutes, zonedToUtc, localDate, dayLabel, timeLabel, NOTICE_MINUTES } = require('./bookingTime');

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

// Checks a schedule rule, from the AI or from the database. Returns null when it cannot be used.
const cleanRule = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const days = (Array.isArray(raw.days) ? raw.days : []).filter((day, i, all) => DAY_KEYS.includes(day) && all.indexOf(day) === i);
  const from = toMinutes(raw.from);
  const to = toMinutes(raw.to);
  const everyMinutes = raw.everyMinutes === undefined || raw.everyMinutes === null ? 60 : Math.round(Number(raw.everyMinutes));
  const months = raw.months === undefined || raw.months === null ? 6 : Math.round(Number(raw.months));
  if (days.length === 0 || from === null || to === null || to <= from) return null;
  if (!(everyMinutes >= 15 && everyMinutes <= 480) || !(months >= 1 && months <= MAX_MONTHS)) return null;
  let skipWeeks = null;
  if (raw.skipWeeks && typeof raw.skipWeeks === 'object') {
    const every = Math.round(Number(raw.skipWeeks.every));
    const skipDays = (Array.isArray(raw.skipWeeks.days) ? raw.skipWeeks.days : []).filter((day) => DAY_KEYS.includes(day));
    if (every >= 2 && every <= 12 && skipDays.length > 0) skipWeeks = { every, days: skipDays };
  }
  const exclude = (Array.isArray(raw.exclude) ? raw.exclude : []).filter((d) => DATE_PATTERN.test(d)).slice(0, MAX_EXCLUDE);
  const startDate = DATE_PATTERN.test(raw.startDate) ? raw.startDate : null;
  return { days, from, to, everyMinutes, months, skipWeeks, exclude, startDate };
};

// Every start time the rule gives, as ISO strings. A class must finish by the rule's end time.
const expandRule = (rule, { minutes, timezone, nowMs }) => {
  const startKey = rule.startDate || localDate(nowMs, timezone);
  const [y, m, d] = startKey.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  const end = Date.UTC(y, m - 1 + rule.months, d);
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

const RULE_PROMPT = (today) => `You turn a business owner's description of their class or session times into a schedule rule.
Return ONLY JSON, with no other text:
{"days":["tue"],"from":"10:00","to":"17:00","everyMinutes":60,"months":6,"skipWeeks":{"every":4,"days":["tue"]},"exclude":[],"startDate":null}

Rules:
- days: any of mon, tue, wed, thu, fri, sat, sun.
- from and to: 24-hour times, HH:MM. "to" is when the last class must have finished. "10am to 5pm, every hour on the hour, one hour each" is from 10:00 to 17:00 with everyMinutes 60.
- everyMinutes: how often a class starts, in minutes. Default 60.
- months: how many months ahead to schedule, for example "the next 6 months" is 6. Default 6, at most 12.
- skipWeeks: only when the owner names weeks to miss. "every 4th week I don't do Tuesdays" is {"every":4,"days":["tue"]}. Use null if there are none.
- exclude: dates to miss, as YYYY-MM-DD. Use [] if there are none.
- startDate: YYYY-MM-DD if the owner names a start date, otherwise null.
Today is ${today}.
If the description does not say when classes happen, return {"error":"short reason"}.`;

// Asks the AI for the rule. Throws when the answer cannot be used.
const ruleFromText = async ({ instruction, timezone, nowMs }) => {
  const today = localDate(nowMs, timezone);
  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 500,
    system: RULE_PROMPT(today),
    messages: [{ role: 'user', content: instruction }],
  });
  logUsage('class schedule', response);
  if (response.stop_reason === 'max_tokens') throw new Error('Schedule rule was cut off');
  const raw = response.content.find((block) => block.type === 'text')?.text || '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  const rule = cleanRule(parsed);
  if (!rule) throw new Error(parsed?.error ? `Rule not usable: ${parsed.error}` : 'Rule not usable');
  return rule;
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
    if (days.length > 0) offers.push({ name: cls.name, minutes: cls.minutes, pricePence: cls.pricePence, days });
  }
  return offers;
};

module.exports = { MAX_OCCURRENCES, cleanRule, expandRule, ruleFromText, cleanClasses, classOffer, classOffers };
