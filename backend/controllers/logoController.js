const { cleanLogo } = require('../lib/logoSpec');
const { runToolLoop } = require('../lib/agentLoop');
const { LOGO_EDIT_TOOLS, applyLogoTool } = require('../lib/logoEdits');
const { openBuild, historyForPrompt, recordChange } = require('../lib/builderMemory');
const { createBrandKit, kitForPrompt } = require('../lib/brandKit');
const prisma = require('../lib/prisma');

// The designer works from the brand kit, draws the mark, and checks its own preview before it replies.
const DESIGN_PROMPT = `You design logos for small businesses, the way a good independent designer would. You are given a brand kit for the business: its positioning, audience, personality, palette and logo idea. Design from the kit, not from a template. The logo should carry one clear idea that fits this business.

The business name is fixed. It is given to you and must appear on the logo exactly as written. Never change it, shorten it, translate it or invent a name, and never add a tagline or slogan. The user sets the name and tagline themselves.

How to work:
1. Turn the logo idea into a simple mark. Draw it with update_logo, using icon "custom" and a few shapes (usually three to eight). Keep it bold and readable at small sizes.
2. Keep the font from the brand kit (the logo starts with it). Change it only if the mark cannot work in that font, and say why in your reply. Choose the colours, layout and background to suit the personality. Text must read clearly on the background.
3. Call preview_logo to see the result. If the mark is unclear, the text is cramped or too small, or the colours clash, fix it with update_logo and preview again. Stop when it works.
4. Call reply_to_user with one or two plain sentences: the idea behind the logo and what you chose.

For a change request on an existing logo, keep everything the user did not ask about, and say what you changed.
If the user asks a question or wants ideas without asking for a change, answer in reply_to_user and do not call update_logo.`;

const generateLogo = async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const current = req.body?.current && typeof req.body.current === 'object' ? req.body.current : null;
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId : undefined;
    const userId = req.userId;

    if (description.length > 600 || instruction.length > 400) {
      return res.status(400).json({ error: 'Please keep your description and changes under 600 and 400 characters' });
    }
    if (name.length < 1 || name.length > 60) {
      return res.status(400).json({ error: 'Enter the business name, up to 60 characters' });
    }

    // A change to an existing logo goes through the design loop. A new logo starts from the brand kit.
    const isChange = Boolean(instruction) && Boolean(current || buildId);
    if (!isChange && description.length < 5) {
      return res.status(400).json({ error: 'Describe your business in a sentence or two' });
    }

    let build;
    let context;
    let request;
    if (!isChange) {
      const kit = await createBrandKit(`Business description: ${description}`);
      build = await openBuild({ userId, kind: 'logo', brief: { description, kit }, state: cleanLogo({ font: kit?.logoFont, name }) });
      context = `Business name (fixed, on the logo exactly as written): ${name}\nBusiness: ${description}\n\nBrand kit:\n${kitForPrompt(kit)}`;
      request = 'Design the logo for this business.';
    } else {
      build = await openBuild({ userId, kind: 'logo', buildId, state: current ? cleanLogo({ ...current, name }) : undefined });
      context = `Business name (fixed, on the logo exactly as written): ${name}
Business: ${build.brief?.description || 'not recorded'}

Brand kit:
${kitForPrompt(build.brief?.kit)}

Earlier requests on this logo, oldest first:
${historyForPrompt(build)}`;
      request = `Change request: ${instruction}`;
    }

    // The name always comes from the user, never from the AI.
    let logo = { ...cleanLogo(build.state), name };
    const outcome = await runToolLoop({
      system: DESIGN_PROMPT,
      context: `${context}\n\nCurrent logo as JSON:\n${JSON.stringify(logo)}`,
      request,
      tools: [...LOGO_EDIT_TOOLS],
      label: isChange ? 'logo change' : 'logo create',
      apply: (toolName, input) => {
        const result = applyLogoTool(logo, toolName, input);
        if (result.logo) logo = result.logo;
        return result;
      },
    });

    logo = { ...logo, name };
    const reply = outcome.reply || (outcome.actions.length ? 'I made the changes you asked for.' : 'I could not make that change. Try describing it more specifically.');
    await recordChange(build, {
      request: isChange ? instruction : description,
      reply,
      actions: isChange ? outcome.actions : ['designed the logo', ...outcome.actions],
      state: logo,
    });
    res.json({ logo, buildId: build.id, reply });
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
