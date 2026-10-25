const { getAnthropic } = require('../lib/anthropic');
const { cleanLogo, ICONS, FONT_KEYS, LAYOUTS, BACKGROUNDS } = require('../lib/logoSpec');

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

Design a logo that suits the business described. Make it distinctive, simple, and readable at small sizes. Keep the icon to a few clear shapes. Choose a font and colours that suit the business. Text must read clearly on the background.
If you are given a current logo and a change, return the full updated logo, changing only what the change asks for.`;

const parseLogo = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  return cleanLogo(JSON.parse(cleaned));
};

const generateLogo = async (req, res) => {
  try {
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const current = req.body?.current && typeof req.body.current === 'object' ? req.body.current : null;
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    if (!current && description.length < 5) {
      return res.status(400).json({ error: 'Describe your business in a sentence or two' });
    }
    if (description.length > 600 || instruction.length > 400) {
      return res.status(400).json({ error: 'Please keep your description and changes under 600 and 400 characters' });
    }

    const message = current && instruction
      ? `Here is the current logo as JSON:\n${JSON.stringify(cleanLogo(current))}\n\nMake this change and return the full updated logo: ${instruction}`
      : `Design a logo for this business: ${description}`;

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });
    if (response.stop_reason === 'max_tokens') throw new Error('Logo response was cut off');
    const text = response.content.find((block) => block.type === 'text')?.text || '';
    res.json({ logo: parseLogo(text) });
  } catch (error) {
    console.error('Generate logo error:', error);
    res.status(500).json({ error: 'Could not create the logo. Please try again.' });
  }
};

module.exports = { generateLogo };
