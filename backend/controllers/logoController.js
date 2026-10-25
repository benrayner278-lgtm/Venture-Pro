const { getAnthropic } = require('../lib/anthropic');
const { cleanLogo, ICONS, FONT_KEYS, LAYOUTS, BACKGROUNDS } = require('../lib/logoSpec');
const { runToolLoop } = require('../lib/agentLoop');
const { LOGO_EDIT_TOOLS, applyLogoTool } = require('../lib/logoEdits');
const { openBuild, historyForPrompt, recordChange } = require('../lib/builderMemory');

const SYSTEM_PROMPT = `You design logos for small businesses. Respond with only a JSON object, no markdown or code fences.

The logo has a name, an optional tagline and a mark (the icon). Use this shape:
{
  "name": string,
  "tagline": string,
  "icon": ${ICONS.map((icon) => `"${icon}"`).join(' | ')} | "custom",
  "shapes": [Shape],                  // only when icon is "custom", up to 8 shapes
  "layout": ${LAYOUTS.map((layout) => `"${layout}"`).join(' | ')},
  "font": ${FONT_KEYS.map((font) => `"${font}"`).join(' | ')},
  "primary": "#rrggbb",               // text colour
  "accent": "#rrggbb",                // icon colour
  "background": ${BACKGROUNDS.map((background) => `"${background}"`).join(' | ')},
  "uppercase": boolean
}

Shapes are drawn inside a 100 by 100 box. Each shape is one of:
- { "type": "path", "d": string }  using only the letters M L H V C S Q T Z and numbers, spaces, commas, dots and minus signs
- { "type": "circle", "cx": n, "cy": n, "r": n }
- { "type": "ellipse", "cx": n, "cy": n, "rx": n, "ry": n }
- { "type": "rect", "x": n, "y": n, "width": n, "height": n, "rx": n }
- { "type": "polygon", "points": "x,y x,y x,y" }
- { "type": "line", "x1": n, "y1": n, "x2": n, "y2": n }
All numbers are between 0 and 100.

Design a logo that suits the business described. Make it distinctive, simple, and readable at small sizes. Keep the icon to a few clear shapes. Choose a font and colours that suit the business. Text must read clearly on the background.`;

const EDIT_PROMPT = `You change a logo for a small business. You are given the business, the earlier requests on this logo and the current logo as JSON. Make the change the user asks for, and only that change. Keep everything else the same unless the request says otherwise, so the logo still feels like the one the user has been shaping.

Use update_logo with only the fields that change. Make all the changes you need in one call where you can. Then call reply_to_user with one or two plain sentences saying what you changed. If the request is unclear, choose the most sensible reading and say what you chose. Keep the logo simple and readable at small sizes, and keep the text clear against its background.`;

const parseLogo = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  return cleanLogo(JSON.parse(cleaned));
};

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

    // A change to an existing logo goes through the tools. A new logo is designed in one go.
    const isChange = Boolean(instruction) && Boolean(current || buildId);
    if (!isChange) {
      if (description.length < 5) return res.status(400).json({ error: 'Describe your business in a sentence or two' });

      const response = await getAnthropic().messages.create({
        model: 'claude-sonnet-5-5',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Design a logo for this business: ${description}` }],
      });
      if (response.stop_reason === 'max_tokens') throw new Error('Logo response was cut off');
      const text = response.content.find((block) => block.type === 'text')?.text || '';
      const logo = parseLogo(text);

      const build = await openBuild({ userId, kind: 'logo', brief: { description }, state: logo });
      await recordChange(build, { request: description, reply: `Designed a logo for ${logo.name || 'the business'}.`, actions: ['created the logo'], state: logo });
      return res.json({ logo, buildId: build.id, reply: `Designed a logo for ${logo.name || 'the business'}.` });
    }

    const build = await openBuild({ userId, kind: 'logo', buildId, state: current ? cleanLogo(current) : undefined });
    let logo = cleanLogo(build.state);
    const context = `Business: ${build.brief?.description || 'not recorded'}

Earlier requests on this logo, oldest first:
${historyForPrompt(build)}

Current logo as JSON:
${JSON.stringify(logo)}`;

    const outcome = await runToolLoop({
      system: EDIT_PROMPT,
      context,
      request: `Change request: ${instruction}`,
      tools: LOGO_EDIT_TOOLS,
      label: 'logo edit',
      apply: (name, input) => {
        const result = applyLogoTool(logo, name, input);
        if (result.logo) logo = result.logo;
        return result;
      },
    });

    const reply = outcome.reply || (outcome.actions.length ? 'I made the changes you asked for.' : 'I could not make that change. Try describing it more specifically.');
    await recordChange(build, { request: instruction, reply, actions: outcome.actions, state: logo });
    res.json({ logo, buildId: build.id, reply });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Generate logo error:', error);
    res.status(500).json({ error: 'Could not create the logo. Please try again.' });
  }
};

module.exports = { generateLogo };
