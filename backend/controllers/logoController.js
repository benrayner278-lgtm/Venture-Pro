const { cleanLogo } = require('../lib/logoSpec');
const { runToolLoop } = require('../lib/agentLoop');
const { LOGO_EDIT_TOOLS, applyLogoTool } = require('../lib/logoEdits');
const { openBuild, historyForPrompt, recordChange } = require('../lib/builderMemory');
const { createBrandKit, kitForPrompt } = require('../lib/brandKit');

// The designer works from the brand kit, draws the mark, and checks its own preview before it replies.
const DESIGN_PROMPT = `You design logos for small businesses, the way a good independent designer would. You are given a brand kit for the business: its positioning, audience, personality, palette and logo idea. Design from the kit, not from a template. The logo should carry one clear idea that fits this business.

How to work:
1. Turn the logo idea into a simple mark. Draw it with update_logo, using icon "custom" and a few shapes (usually three to eight). Keep it bold and readable at small sizes.
2. Choose the font, colours, layout and background to suit the personality. Text must read clearly on the background.
3. Call preview_logo to see the result. If the mark is unclear, the text is cramped or too small, or the colours clash, fix it with update_logo and preview again. Stop when it works.
4. Call reply_to_user with one or two plain sentences: the idea behind the logo and what you chose.

For a change request on an existing logo, keep everything the user did not ask about, and say what you changed.`;

const generateLogo = async (req, res) => {
  try {
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const current = req.body?.current && typeof req.body.current === 'object' ? req.body.current : null;
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId : undefined;
    const userId = req.userId;

    if (description.length > 600 || instruction.length > 400) {
      return res.status(400).json({ error: 'Please keep your description and changes under 600 and 400 characters' });
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
      build = await openBuild({ userId, kind: 'logo', brief: { description, kit }, state: cleanLogo({}) });
      context = `Business: ${description}\n\nBrand kit:\n${kitForPrompt(kit)}`;
      request = 'Design the logo for this business.';
    } else {
      build = await openBuild({ userId, kind: 'logo', buildId, state: current ? cleanLogo(current) : undefined });
      context = `Business: ${build.brief?.description || 'not recorded'}

Brand kit:
${kitForPrompt(build.brief?.kit)}

Earlier requests on this logo, oldest first:
${historyForPrompt(build)}`;
      request = `Change request: ${instruction}`;
    }

    let logo = cleanLogo(build.state);
    const outcome = await runToolLoop({
      system: DESIGN_PROMPT,
      context: `${context}\n\nCurrent logo as JSON:\n${JSON.stringify(logo)}`,
      request,
      tools: [...LOGO_EDIT_TOOLS],
      label: isChange ? 'logo change' : 'logo create',
      apply: (name, input) => {
        const result = applyLogoTool(logo, name, input);
        if (result.logo) logo = result.logo;
        return result;
      },
    });

    if (!logo.name) logo = { ...logo, name: 'Your business' };
    const reply = outcome.reply || (outcome.actions.length ? 'I made the changes you asked for.' : 'I could not make that change. Try describing it more specifically.');
    await recordChange(build, {
      request: isChange ? instruction : description,
      reply,
      actions: isChange ? outcome.actions : ['designed the logo', ...outcome.actions],
      state: logo,
    });
    res.json({ logo, buildId: build.id, reply });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Generate logo error:', error);
    res.status(500).json({ error: 'Could not create the logo. Please try again.' });
  }
};

module.exports = { generateLogo };
