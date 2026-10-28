const { cleanLogo, ICONS, FONT_KEYS, LAYOUTS, BACKGROUNDS } = require('./logoSpec');
const { renderLogoPng } = require('./logoRender');

const UPDATE_FIELDS = {
  name: { type: 'string' },
  tagline: { type: 'string' },
  icon: { type: 'string', enum: ['custom', ...ICONS] },
  shapes: {
    type: 'array',
    maxItems: 16,
    description: 'Only used when icon is "custom". Each shape has a "type" of path, circle, ellipse, rect, polygon or line, drawn in a 100 by 100 box. Use several shapes together for a richer mark.',
    items: { type: 'object' },
  },
  layout: { type: 'string', enum: LAYOUTS },
  font: { type: 'string', enum: FONT_KEYS },
  primary: { type: 'string', description: 'Text colour, e.g. #1f2937' },
  accent: { type: 'string', description: 'Icon colour, e.g. #16a34a' },
  background: { type: 'string', enum: BACKGROUNDS },
  customBackground: { type: 'string', description: 'Background colour used when background is custom, e.g. #f4efe6' },
  uppercase: { type: 'boolean' },
};

const LOGO_EDIT_TOOLS = [
  {
    name: 'update_logo',
    description: 'Change the logo. Send only the fields that change; everything else stays as it is. Use icon "custom" with shapes to draw a new mark. Colours must be six-digit hex codes.',
    input_schema: { type: 'object', properties: UPDATE_FIELDS },
  },
  {
    name: 'preview_logo',
    description: 'See the logo as it stands now, as an image. Use it after you change the logo, check the mark and the text, and fix anything that is unclear, cramped or hard to read.',
    input_schema: { type: 'object', properties: {} },
  },
];

// Applies one tool call to the logo. Returns the new logo (when it changed), the text Claude sees back, an image when it
// asked for a preview, and a note for the history.
const applyLogoTool = (logo, name, input) => {
  if (name === 'preview_logo') {
    return { text: `Preview of the logo as it stands: ${JSON.stringify(logo)}`, image: renderLogoPng(logo) };
  }
  if (name !== 'update_logo') return { text: `Unknown tool ${name}`, error: true };

  const changes = {};
  for (const key of Object.keys(UPDATE_FIELDS)) {
    if (input[key] !== undefined) changes[key] = input[key];
  }
  if (Object.keys(changes).length === 0) return { text: 'No fields were given, so nothing changed.', error: true };

  const next = cleanLogo({ ...logo, ...changes });
  const changed = Object.keys(changes).join(', ');
  return {
    logo: next,
    text: `Logo updated (${changed}). The logo is now: ${JSON.stringify(next)}`,
    action: `updated ${changed}`,
  };
};

module.exports = { LOGO_EDIT_TOOLS, applyLogoTool };
