const { cleanLogo } = require('../lib/logoSpec');
const { designLogo } = require('../lib/logoDesign');
const { openBuild } = require('../lib/builderMemory');
const prisma = require('../lib/prisma');

const generateLogo = async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const current = req.body?.current && typeof req.body.current === 'object' ? req.body.current : null;
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId : undefined;

    if (description.length > 600 || instruction.length > 400) {
      return res.status(400).json({ error: 'Please keep your description and changes under 600 and 400 characters' });
    }
    if (name.length < 1 || name.length > 60) {
      return res.status(400).json({ error: 'Enter the business name, up to 60 characters' });
    }
    // A new logo needs a description. A change needs the current logo or an existing build.
    const isChange = Boolean(instruction) && Boolean(current || buildId);
    if (!isChange && description.length < 5) {
      return res.status(400).json({ error: 'Describe your business in a sentence or two' });
    }

    const result = await designLogo({ userId: req.userId, name, description, current, instruction, buildId });
    res.json(result);
  } catch (error) {
    // Only our own errors pass through. An AI error (such as a rejected API key, which is also a 401) must not look like a login problem.
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('Generate logo error:', error);
    res.status(500).json({ error: 'Could not create the logo. Please try again.' });
  }
};

// The user's most recent logo, so the builder can pick up where they left off.
const getLogoDraft = async (req, res) => {
  try {
    const build = await prisma.builderProject.findFirst({
      where: { userId: req.userId, kind: 'logo' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!build) return res.json({ buildId: null, logo: null });
    res.json({ buildId: build.id, logo: cleanLogo(build.state) });
  } catch (error) {
    console.error('Get logo draft error:', error);
    res.status(500).json({ error: 'Could not load your logo' });
  }
};

// Saves the logo as the user edits it, so leaving the page does not lose it. Only the logo is stored here.
const saveLogoDraft = async (req, res) => {
  try {
    const logo = req.body?.logo;
    if (!logo || typeof logo !== 'object') return res.status(400).json({ error: 'Send the logo to save' });
    const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId : undefined;
    const build = await openBuild({ userId: req.userId, kind: 'logo', buildId, state: cleanLogo(logo) });
    res.json({ buildId: build.id });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('Save logo draft error:', error);
    res.status(500).json({ error: 'Could not save your logo' });
  }
};

module.exports = { generateLogo, getLogoDraft, saveLogoDraft };
