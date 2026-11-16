// Analytics: page views from the app, and the owner-only report workbook.
const prisma = require('../lib/prisma');
const { recordVisit, buildReport, buildWorkbook } = require('../lib/analytics');

// The owner's accounts are listed in ADMIN_EMAILS (comma separated). Nobody else can download the report.
const isAdmin = async (userId) => {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (admins.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return Boolean(user && admins.includes(user.email.toLowerCase()));
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!(await isAdmin(req.userId))) return res.status(403).json({ error: 'Not allowed' });
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Could not check access' });
  }
};

// The app records a page view when a page is opened. Only app paths are accepted.
const trackAppVisit = async (req, res) => {
  const path = typeof req.body?.path === 'string' ? req.body.path : '/';
  if (!path.startsWith('/')) return res.status(400).json({ error: 'Bad path' });
  await recordVisit({ req, kind: 'app', path });
  res.status(204).end();
};

const reportWorkbook = async (req, res) => {
  try {
    const report = await buildReport();
    const buffer = buildWorkbook(report);
    const day = report.generatedAt.toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="venture-pro-analytics-${day}.xlsx"`,
    });
    res.send(buffer);
  } catch (error) {
    console.error('Analytics report error:', error);
    res.status(500).json({ error: 'Could not build the report' });
  }
};

module.exports = { requireAdmin, trackAppVisit, reportWorkbook };
