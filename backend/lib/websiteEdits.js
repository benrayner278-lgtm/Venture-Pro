const { sanitizeDesign, sanitizeSections } = require('./designBrief');

const SECTION_TYPES = ['hero', 'text', 'cards', 'steps', 'gallery', 'pricing', 'faq', 'contact', 'cta', 'custom'];
const MIN_SECTIONS = 5;
const MAX_SECTIONS = 9;

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const sectionLabel = (section) => `${section.type}${section.title || section.headline ? ` "${section.title || section.headline}"` : ''}`;

const SECTION_SCHEMA = {
  type: 'object',
  description: 'A complete section. "type" is required and must be one of the section types. Fields follow the section shapes used when the site was built.',
  properties: {
    type: { type: 'string', enum: SECTION_TYPES },
    layout: { type: 'string', description: 'Optional layout for the type, e.g. centred, split, grid, list, banner.' },
  },
  required: ['type'],
  additionalProperties: true,
};

const WEBSITE_EDIT_TOOLS = [
  {
    name: 'update_section',
    description: 'Replace one section, keeping its place on the page. Send the whole new section.',
    input_schema: {
      type: 'object',
      properties: { index: { type: 'integer', description: 'Section number, counting from 0.' }, section: SECTION_SCHEMA },
      required: ['index', 'section'],
    },
  },
  {
    name: 'add_section',
    description: 'Insert a new section so it appears at this position. Other sections move down.',
    input_schema: {
      type: 'object',
      properties: { index: { type: 'integer', description: 'Where to insert it, from 0 to the number of sections.' }, section: SECTION_SCHEMA },
      required: ['index', 'section'],
    },
  },
  {
    name: 'remove_section',
    description: 'Delete one section from the page.',
    input_schema: {
      type: 'object',
      properties: { index: { type: 'integer', description: 'Section number, counting from 0.' } },
      required: ['index'],
    },
  },
  {
    name: 'move_section',
    description: 'Move a section to a new position.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'integer', description: 'Current section number, counting from 0.' },
        to: { type: 'integer', description: 'New section number, counting from 0.' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'update_site',
    description: 'Change the brand name or tagline, the navigation links, the footer note, or the design. Send only the parts that change. Design colours and fonts you send are merged with the current ones.',
    input_schema: {
      type: 'object',
      properties: {
        brand: { type: 'object', properties: { name: { type: 'string' }, tagline: { type: 'string' } } },
        nav: { type: 'array', maxItems: 8, items: { type: 'string' }, description: 'Navigation link labels, in order.' },
        footer: { type: 'object', properties: { note: { type: 'string' } } },
        design: {
          type: 'object',
          description: 'The design brief: mood, palette, fonts, headingCase, headingWeight, radius, density, effect.',
          additionalProperties: true,
        },
      },
    },
  },
];

const checkIndex = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;

// Applies a design change. A colour or font that does not pass the checks keeps the current one.
const mergeDesign = (current, patch) => {
  const merged =
    sanitizeDesign({
      ...current,
      ...patch,
      palette: { ...(current?.palette || {}), ...(patch.palette || {}) },
      fonts: { ...(current?.fonts || {}), ...(patch.fonts || {}) },
    }) || {};
  return sanitizeDesign({ palette: current?.palette, fonts: current?.fonts, ...merged });
};

// Applies one tool call to the website. Returns the new content (when it changed), the text Claude sees back,
// and a note for the history. A failed call returns an error and leaves the content as it was.
const applyWebsiteTool = (content, name, input) => {
  const sections = content.sections;
  const count = sections.length;
  const sizeNote = (n) =>
    n < MIN_SECTIONS || n > MAX_SECTIONS ? ` The page now has ${n} sections; most pages have ${MIN_SECTIONS} to ${MAX_SECTIONS}.` : '';

  const cleanSection = (section) => {
    if (!section || !SECTION_TYPES.includes(section.type)) return null;
    return sanitizeSections([section])[0];
  };

  switch (name) {
    case 'update_section': {
      if (!checkIndex(input.index, count - 1)) return { text: `There is no section ${input.index}. Sections run from 0 to ${count - 1}.`, error: true };
      const section = cleanSection(input.section);
      if (!section) return { text: 'The section needs a valid type.', error: true };
      const next = sections.map((item, i) => (i === input.index ? section : item));
      return {
        content: { ...content, sections: next },
        text: `Section ${input.index} is now ${sectionLabel(section)}.`,
        action: `updated section ${input.index} (${section.type})`,
      };
    }
    case 'add_section': {
      if (!checkIndex(input.index, count)) return { text: `Choose a position from 0 to ${count}.`, error: true };
      const section = cleanSection(input.section);
      if (!section) return { text: 'The section needs a valid type.', error: true };
      const next = [...sections.slice(0, input.index), section, ...sections.slice(input.index)];
      return {
        content: { ...content, sections: next },
        text: `Added ${sectionLabel(section)} as section ${input.index}.${sizeNote(next.length)}`,
        action: `added section ${input.index} (${section.type})`,
      };
    }
    case 'remove_section': {
      if (!checkIndex(input.index, count - 1)) return { text: `There is no section ${input.index}. Sections run from 0 to ${count - 1}.`, error: true };
      if (count === 1) return { text: 'A website needs at least one section.', error: true };
      const removed = sections[input.index];
      const next = sections.filter((_, i) => i !== input.index);
      return {
        content: { ...content, sections: next },
        text: `Removed section ${input.index} (${sectionLabel(removed)}).${sizeNote(next.length)}`,
        action: `removed section ${input.index} (${removed.type})`,
      };
    }
    case 'move_section': {
      if (!checkIndex(input.from, count - 1) || !checkIndex(input.to, count - 1)) {
        return { text: `Sections run from 0 to ${count - 1}.`, error: true };
      }
      const next = [...sections];
      const [moved] = next.splice(input.from, 1);
      next.splice(input.to, 0, moved);
      return {
        content: { ...content, sections: next },
        text: `Moved section ${input.from} to position ${input.to}.`,
        action: `moved section ${input.from} to ${input.to}`,
      };
    }
    case 'update_site': {
      const changed = [];
      const next = { ...content };
      if (input.brand && typeof input.brand === 'object') {
        const brand = { ...content.brand };
        if (input.brand.name !== undefined) brand.name = clip(input.brand.name, 60);
        if (input.brand.tagline !== undefined) brand.tagline = clip(input.brand.tagline, 80);
        next.brand = brand;
        changed.push('brand');
      }
      if (Array.isArray(input.nav)) {
        next.nav = input.nav.map((item) => clip(item, 40)).filter(Boolean).slice(0, 8);
        changed.push('navigation');
      }
      if (input.footer && typeof input.footer === 'object') {
        next.footer = { ...content.footer, note: clip(input.footer.note, 200) };
        changed.push('footer');
      }
      if (input.design && typeof input.design === 'object') {
        const design = mergeDesign(content.design, input.design);
        if (design) next.design = design;
        changed.push('design');
      }
      if (changed.length === 0) return { text: 'No brand, navigation, footer or design fields were given, so nothing changed.', error: true };
      return { content: next, text: `Updated the ${changed.join(', ')}.`, action: `updated ${changed.join(', ')}` };
    }
    default:
      return { text: `Unknown tool ${name}`, error: true };
  }
};

module.exports = { SECTION_TYPES, WEBSITE_EDIT_TOOLS, applyWebsiteTool, MIN_SECTIONS, MAX_SECTIONS };
