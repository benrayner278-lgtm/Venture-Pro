// Designs and changes a business logo. Used by the Logo Builder page (new logo, and changes made with the form)
// and by the shared assistant (changes asked for in chat). The logo is a private draft until the owner uses it on a site.
const { cleanLogo } = require('./logoSpec');
const { runToolLoop } = require('./agentLoop');
const { LOGO_EDIT_TOOLS, applyLogoTool } = require('./logoEdits');
const { openBuild, historyForPrompt, recordChange } = require('./builderMemory');
const { createBrandKit, kitForPrompt } = require('./brandKit');
const prisma = require('./prisma');

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

// The owner's most recent logo draft, or null if they have not designed one yet.
const latestLogoBuild = (userId) => prisma.builderProject.findFirst({ where: { userId, kind: 'logo' }, orderBy: { updatedAt: 'desc' } });

// Creates a logo (when there is no buildId and no current logo) or changes the existing one.
// Returns the logo, the build id and the reply for the owner. The name always comes from the owner, never from the AI.
const designLogo = async ({ userId, name, description = '', current = null, instruction = '', buildId }) => {
  // A change to an existing logo goes through the design loop. A new logo starts from the brand kit.
  const isChange = Boolean(instruction) && Boolean(current || buildId);

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
  return { logo, buildId: build.id, reply };
};

module.exports = { designLogo, latestLogoBuild };
