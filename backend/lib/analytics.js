// Visit tracking and the owner's analytics workbook.
// Visitors are counted with a hash that changes every day (UTC), so the same person is one visitor per day
// and no one can be identified from the stored data. Weekly, monthly and yearly visitor counts therefore add
// up each day's unique visitors. A visitor who comes back on two days counts once per day.
const crypto = require('crypto');
const XLSX = require('xlsx');
const prisma = require('./prisma');
const { PLANS, planKey } = require('./plans');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const dayKey = (d) => d.toISOString().slice(0, 10);
const hourKey = (d) => `${d.toISOString().slice(0, 13)}:00`;
const monthKey = (d) => d.toISOString().slice(0, 7);
const yearKey = (d) => d.toISOString().slice(0, 4);
// Weeks run Monday to Sunday and are named by their Monday.
const weekKey = (d) => {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return `w/c ${dayKey(monday)}`;
};

const visitorHash = (ip, userAgent, now = new Date()) => {
  const salt = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'venture-pro';
  return crypto.createHash('sha256').update(`${salt}|${dayKey(now)}|${ip || ''}|${userAgent || ''}`).digest('hex');
};

// Saves one page view. Never throws, so tracking cannot break a page.
const recordVisit = async ({ req, kind, site, path }) => {
  try {
    await prisma.visit.create({
      data: {
        visitorHash: visitorHash(req.headers['cf-connecting-ip'] || req.ip, req.headers['user-agent']),
        kind,
        site: site || null,
        path: String(path || '/').slice(0, 200),
      },
    });
  } catch (error) {
    console.error('Record visit failed:', error.message);
  }
};

// The buckets shown in the workbook. Each returns the label for a moment in time.
const PERIODS = {
  hourly: { label: 'Hour (UTC)', key: hourKey, step: HOUR, count: 48 },
  daily: { label: 'Day', key: dayKey, step: DAY, count: 90 },
  weekly: { label: 'Week', key: weekKey, step: 7 * DAY, count: 26 },
};

// The last N buckets, oldest first, for the periods that step through fixed times.
const recentKeys = (period, now) => {
  const { key, step, count } = PERIODS[period];
  const start = period === 'hourly' ? Math.floor(now.getTime() / HOUR) * HOUR : now.getTime();
  return Array.from({ length: count }, (_, i) => key(new Date(start - (count - 1 - i) * step)));
};

const recentMonthKeys = (now, count) =>
  Array.from({ length: count }, (_, i) => monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1))));

const countBy = (items, keyOf) => {
  const counts = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

// Unique visitors (distinct hashes) and page views for each bucket of one period.
const visitorsByBucket = (visits, keyOf) => {
  const sets = {};
  const views = {};
  for (const visit of visits) {
    const key = keyOf(visit.createdAt);
    if (!sets[key]) sets[key] = new Set();
    sets[key].add(visit.visitorHash);
    views[key] = (views[key] || 0) + 1;
  }
  return { unique: (key) => (sets[key] ? sets[key].size : 0), views: (key) => views[key] || 0 };
};

const pounds = (pence) => Math.round(pence) / 100;

// Gathers every number in the workbook from the database.
const buildReport = async (now = new Date()) => {
  const [visits, users, shopOrders, bookings] = await Promise.all([
    prisma.visit.findMany({ select: { visitorHash: true, createdAt: true, kind: true } }),
    prisma.user.findMany({ select: { plan: true, subscriptionStatus: true, createdAt: true } }),
    prisma.shopOrder.findMany({ select: { amountPence: true, createdAt: true } }),
    prisma.booking.findMany({ select: { createdAt: true, status: true } }),
  ]);

  const visitBuckets = {
    hourly: visitorsByBucket(visits, hourKey),
    daily: visitorsByBucket(visits, dayKey),
    weekly: visitorsByBucket(visits, weekKey),
  };
  const signupCounts = {
    hourly: countBy(users, (u) => hourKey(u.createdAt)),
    daily: countBy(users, (u) => dayKey(u.createdAt)),
    weekly: countBy(users, (u) => weekKey(u.createdAt)),
  };

  const periodRows = (period) => recentKeys(period, now).map((key) => ({
    period: key,
    uniqueVisitors: visitBuckets[period].unique(key),
    pageViews: visitBuckets[period].views(key),
    signups: signupCounts[period][key] || 0,
  }));

  const monthly = visitorsByBucket(visits, monthKey);
  const yearly = visitorsByBucket(visits, yearKey);
  const monthSignups = countBy(users, (u) => monthKey(u.createdAt));
  const yearSignups = countBy(users, (u) => yearKey(u.createdAt));
  const monthKeys = recentMonthKeys(now, 24);
  const firstYear = [now, ...visits.map((v) => v.createdAt), ...users.map((u) => u.createdAt)].reduce(
    (year, date) => Math.min(year, date.getUTCFullYear()),
    now.getUTCFullYear(),
  );
  const yearKeys = Array.from({ length: now.getUTCFullYear() - firstYear + 1 }, (_, i) => String(firstYear + i));

  // Paying accounts: a paid plan with an active subscription.
  const paidPlans = ['standard', 'premium', 'business', 'corporate'];
  const payingByPlan = Object.fromEntries(paidPlans.map((key) => [key, 0]));
  let churned = 0;
  for (const user of users) {
    const key = planKey(user.plan);
    if (user.subscriptionStatus === 'canceled') churned += 1;
    if (user.subscriptionStatus === 'active' && payingByPlan[key] !== undefined) payingByPlan[key] += 1;
  }

  const shopRevenue = shopOrders.reduce((sum, order) => sum + order.amountPence, 0);
  const bookingsConfirmed = bookings.filter((b) => b.status === 'confirmed').length;

  return {
    generatedAt: now,
    hourly: periodRows('hourly'),
    daily: periodRows('daily'),
    weekly: periodRows('weekly'),
    monthly: monthKeys.map((key) => ({ period: key, uniqueVisitors: monthly.unique(key), pageViews: monthly.views(key), signups: monthSignups[key] || 0 })),
    yearly: yearKeys.map((key) => ({ period: key, uniqueVisitors: yearly.unique(key), pageViews: yearly.views(key), signups: yearSignups[key] || 0 })),
    visitsAllTime: visits.length,
    visitorsAllTime: new Set(visits.map((v) => v.visitorHash)).size,
    siteVisits: visits.filter((v) => v.kind === 'site').length,
    appVisits: visits.filter((v) => v.kind === 'app').length,
    users: users.length,
    paying: paidPlans.map((key) => ({ plan: PLANS[key].name, pricePounds: pounds(PLANS[key].price), accounts: payingByPlan[key] })),
    churned,
    shopRevenuePounds: pounds(shopRevenue),
    shopOrders: shopOrders.length,
    bookingsConfirmed,
  };
};

// Builds the workbook. Totals and averages are formulas, so they stay right if someone edits a count.
const buildWorkbook = (report) => {
  const wb = XLSX.utils.book_new();
  const f = (formula, value) => ({ t: 'n', f: formula, v: value });

  const payingTotal = report.paying.reduce((sum, row) => sum + row.accounts, 0);
  const revenue = report.paying.reduce((sum, row) => sum + row.accounts * row.pricePounds, 0);

  // Payments: one row per paid plan, then the totals.
  const payRows = [['Plan', 'Price per month (£)', 'Paying accounts', 'Monthly revenue (£)', 'Share of paying accounts']];
  const last = report.paying.length + 1; // the last plan row (row 1 is the header)
  const totalRow = last + 1;
  report.paying.forEach((row, i) => {
    const r = i + 2;
    const share = payingTotal ? row.accounts / payingTotal : 0;
    payRows.push([
      row.plan,
      row.pricePounds,
      row.accounts,
      f(`B${r}*C${r}`, row.accounts * row.pricePounds),
      f(`IFERROR(C${r}/C$${totalRow},0)`, share),
    ]);
  });
  payRows.push(['All paid plans', '', f(`SUM(C2:C${last})`, payingTotal), f(`SUM(D2:D${last})`, revenue), f(`SUM(E2:E${last})`, payingTotal ? 1 : 0)]);
  payRows.push(['Average payment per paying account (£)', '', '', f(`IFERROR(D${totalRow}/C${totalRow},0)`, payingTotal ? revenue / payingTotal : 0), '']);
  payRows.push(['Accounts cancelled (all time)', '', report.churned, '', '']);
  payRows.push(['Accounts not paying (free or inactive)', '', report.users - payingTotal, '', '']);
  const paymentsSheet = XLSX.utils.aoa_to_sheet(payRows);
  paymentsSheet['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 24 }];

  // Summary: the headline numbers, all as values taken from the report.
  const currentDay = report.daily[report.daily.length - 1];
  const currentWeek = report.weekly[report.weekly.length - 1];
  const currentMonth = report.monthly[report.monthly.length - 1];
  const currentYear = report.yearly[report.yearly.length - 1];
  const summary = [
    ['Venture-Pro analytics', ''],
    ['Generated (UTC)', report.generatedAt.toISOString().replace('T', ' ').slice(0, 16)],
    ['', ''],
    ['Visitors', ''],
    ['Unique visitors this hour', report.hourly[report.hourly.length - 1].uniqueVisitors],
    ['Unique visitors today', currentDay.uniqueVisitors],
    ['Unique visitors this week', currentWeek.uniqueVisitors],
    ['Unique visitors this month', currentMonth.uniqueVisitors],
    ['Unique visitors this year', currentYear.uniqueVisitors],
    ['Page views (all time)', report.visitsAllTime],
    ['Website visits (all time)', report.siteVisits],
    ['App visits (all time)', report.appVisits],
    ['', ''],
    ['Accounts', ''],
    ['Accounts (all time)', report.users],
    ['Signups today', currentDay.signups],
    ['Signups this month', currentMonth.signups],
    ['Paying accounts now', payingTotal],
    ['Monthly recurring revenue (£)', revenue],
    ['Average payment per paying account (£)', payingTotal ? revenue / payingTotal : 0],
    ['Cancelled accounts (all time)', report.churned],
    ['', ''],
    ['Business activity', ''],
    ['Shop orders (all time)', report.shopOrders],
    ['Shop revenue (all time, £)', report.shopRevenuePounds],
    ['Confirmed bookings (all time)', report.bookingsConfirmed],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 40 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments');

  const periodSheet = (rows, label) => {
    const sheet = XLSX.utils.aoa_to_sheet([
      [label, 'Unique visitors', 'Page views', 'Signups'],
      ...rows.map((row) => [row.period, row.uniqueVisitors, row.pageViews, row.signups]),
    ]);
    sheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    return sheet;
  };
  XLSX.utils.book_append_sheet(wb, periodSheet(report.hourly, 'Hour (UTC)'), 'Hourly');
  XLSX.utils.book_append_sheet(wb, periodSheet(report.daily, 'Day'), 'Daily');
  XLSX.utils.book_append_sheet(wb, periodSheet(report.weekly, 'Week'), 'Weekly');
  XLSX.utils.book_append_sheet(wb, periodSheet(report.monthly, 'Month'), 'Monthly');
  XLSX.utils.book_append_sheet(wb, periodSheet(report.yearly, 'Year'), 'Yearly');

  const notes = XLSX.utils.aoa_to_sheet([
    ['How these numbers work'],
    [''],
    ['Unique visitors: a visitor is recognised by a hash of their address and browser that changes every day, so the same person counts once per day.'],
    ['Weekly, monthly and yearly unique visitors add up the daily counts. Someone who visits on two days counts twice in a month.'],
    ['Page views: every recorded visit to a published website or the Venture-Pro app.'],
    ['Paying accounts: users on a paid plan with an active subscription. Revenue uses the plan price per month.'],
    ['Average payment: monthly revenue divided by paying accounts. Annual plans are not separated.'],
    ['Times are UTC. The London day starts an hour earlier in winter and two hours earlier in summer.'],
    ['No personal details are stored in the visit log: no names, emails or full addresses.'],
    ['Refresh: download the report again from the Analytics page to get the latest numbers.'],
  ]);
  notes['!cols'] = [{ wch: 130 }];
  XLSX.utils.book_append_sheet(wb, notes, 'Notes');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { recordVisit, buildReport, buildWorkbook };
