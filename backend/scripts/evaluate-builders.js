// Runs a set of varied business briefs through the logo and website builders and scores the results.
// It makes real AI calls and writes real build rows, so it deletes its own rows at the end.
//
// Usage (from backend/, with ANTHROPIC_API_KEY and DATABASE_URL set):
//   node scripts/evaluate-builders.js [count] [outputDir]
// Writes report.json and a PNG per logo to outputDir (default ./eval-output).
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { generateLogo } = require('../controllers/logoController');
const { generateWebsite } = require('../controllers/websiteController');
const { renderLogoPng } = require('../lib/logoRender');
const { contrast } = require('../lib/designBrief');

const BRIEFS = [
  { businessName: 'Ridge & Reed Bakery', tagline: 'Slow-proved bread, baked each morning', features: 'Sourdough, pastries, café wholesale, celebration cakes', callToAction: 'Order for pickup', requests: 'Warm, family bakery in a Yorkshire village' },
  { businessName: 'Northwind Analytics', tagline: 'Know which customers will leave before they do', features: 'Churn prediction, dashboards, data integrations for subscription businesses', callToAction: 'Book a demo', requests: 'Serious, precise, for operations leads' },
  { businessName: 'Mossgrove Yoga', tagline: 'Breathe, move, come back to yourself', features: 'Morning classes, private sessions, teacher training', callToAction: 'Book a class', requests: 'Calm and spacious, for busy people in their thirties' },
  { businessName: 'Hartwell Motor Repairs', tagline: 'Honest garage work since 1989', features: 'Servicing, MOT, brakes, diagnostics for older cars', callToAction: 'Book a service', requests: 'Trustworthy, no-nonsense, family owned' },
  { businessName: 'Pixel Pocket Games', tagline: 'Small games, big fun', features: 'Indie mobile games for kids, school workshops', callToAction: 'Play the demo', requests: 'Bright and playful but not childish' },
  { businessName: 'Lantern & Lane Florist', tagline: 'Seasonal flowers, arranged by hand', features: 'Weddings, funerals, weekly subscriptions, workshops', callToAction: 'Enquire about your wedding', requests: 'Romantic, understated, premium' },
  { businessName: 'Coastline Physio', tagline: 'Move better, live better', features: 'Sports injuries, back pain, post-surgery rehab', callToAction: 'Book an assessment', requests: 'Friendly and reassuring, clinical but warm' },
  { businessName: 'Brickyard Coworking', tagline: 'A desk, a community, a good coffee', features: 'Hot desks, private offices, meeting rooms', callToAction: 'Book a tour', requests: 'Industrial, creative, for freelancers' },
];

const count = Math.min(Number(process.argv[2]) || BRIEFS.length, BRIEFS.length);
const outputDir = path.resolve(process.argv[3] || 'eval-output');

// Calls a controller with a fake request and response, and waits for its reply.
const call = (controller, body, userId) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { resolve({ status: this.statusCode, data }); },
    };
    controller({ body, userId }, res);
  });

const iconKey = (logo) => (logo.icon === 'custom' ? `custom:${logo.shapes.map((shape) => shape.type).join('+')}` : logo.icon);

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const user = await prisma.user.findFirst({ select: { id: true } });
  const buildIds = [];
  const results = [];

  try {
    for (const [index, brief] of BRIEFS.slice(0, count).entries()) {
      const description = `${brief.businessName}. ${brief.tagline}. ${brief.features}. ${brief.requests}.`;
      const logoRun = await call(generateLogo, { description }, user.id);
      const siteRun = await call(generateWebsite, brief, user.id);
      if (logoRun.data.buildId) buildIds.push(logoRun.data.buildId);
      if (siteRun.data.buildId) buildIds.push(siteRun.data.buildId);

      const entry = { brief: brief.businessName, logo: null, site: null };
      if (logoRun.status === 200) {
        const logo = logoRun.data.logo;
        fs.writeFileSync(path.join(outputDir, `${index + 1}-logo.png`), renderLogoPng(logo));
        entry.logo = {
          icon: iconKey(logo),
          shapes: logo.shapes.length,
          font: logo.font,
          accent: logo.accent,
          contrast: Number(contrast(logo.primary, logo.background === 'dark' ? '#0b0b10' : '#ffffff').toFixed(2)),
          replied: Boolean(logoRun.data.reply),
        };
      } else {
        entry.logo = { error: logoRun.data.error };
      }
      if (siteRun.status === 200) {
        const content = siteRun.data.content;
        entry.site = {
          sections: content.sections.map((section) => section.type).join(','),
          fonts: content.design?.fonts ? `${content.design.fonts.heading}/${content.design.fonts.body}` : 'none',
          background: content.design?.palette?.bg || 'none',
          accent: content.design?.palette?.accent || 'none',
          mood: content.design?.mood || 'none',
        };
      } else {
        entry.site = { error: siteRun.data.error };
      }
      results.push(entry);
      console.log(`${index + 1}/${count} ${brief.businessName}: logo ${entry.logo.error ? 'FAILED' : 'ok'}, site ${entry.site.error ? 'FAILED' : 'ok'}`);
    }

    // Scores across the whole set: how many logos and sites are alike.
    const logos = results.filter((entry) => entry.logo && !entry.logo.error);
    const sites = results.filter((entry) => entry.site && !entry.site.error);
    const distinct = (values) => new Set(values).size;
    const report = {
      briefs: count,
      logoFailures: results.filter((entry) => entry.logo.error).length,
      siteFailures: results.filter((entry) => entry.site.error).length,
      distinctLogoIcons: `${distinct(logos.map((entry) => entry.logo.icon))}/${logos.length}`,
      distinctLogoFonts: `${distinct(logos.map((entry) => entry.logo.font))}/${logos.length}`,
      distinctAccents: `${distinct(logos.map((entry) => entry.logo.accent))}/${logos.length}`,
      lowContrastLogos: logos.filter((entry) => entry.logo.contrast < 4.5).length,
      distinctSiteFontPairs: `${distinct(sites.map((entry) => entry.site.fonts))}/${sites.length}`,
      distinctSiteBackgrounds: `${distinct(sites.map((entry) => entry.site.background))}/${sites.length}`,
      distinctSiteMoods: `${distinct(sites.map((entry) => entry.site.mood))}/${sites.length}`,
      results,
    };
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
  } finally {
    if (buildIds.length) await prisma.builderProject.deleteMany({ where: { id: { in: buildIds } } });
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error('EVALUATION FAILED', error);
  process.exitCode = 1;
});
