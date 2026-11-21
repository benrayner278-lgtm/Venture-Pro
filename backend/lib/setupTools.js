// The tools the setup assistant uses to fill in a shop draft. Nothing is saved here. The owner applies the draft
// with a click, and the existing save routes check it again.
const { cleanItems } = require('./shop');
const { cleanForm } = require('./shopForm');
const { cleanClasses, ruleFromText, expandRule, RuleError, MAX_OCCURRENCES } = require('./classSchedule');

const TOOLS = [
  {
    name: 'set_shop_items',
    description: 'Record the products the business sells, with prices in pounds. Replaces the earlier list. Use this for things that are posted or collected, with no date or time.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: 12,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Short name, such as "Tennis shoes".' },
              description: { type: 'string', description: 'One short line, optional.' },
              price: { type: 'number', description: 'Price in pounds, for example 25.50.' },
            },
            required: ['name', 'price'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'set_classes',
    description: 'Record classes or sessions that happen at set times. Give each one its own name, length, number of places, price, and a plain description of when it runs. The dates are worked out from that description.',
    input_schema: {
      type: 'object',
      properties: {
        classes: {
          type: 'array',
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              minutes: { type: 'number', description: 'How long each class lasts, 15 to 480.' },
              capacity: { type: 'number', description: 'How many people can join at once, 1 to 500. Ask the owner if unknown.' },
              price: { type: 'number', description: 'Price in pounds, 0 for free.' },
              when: { type: 'string', description: 'When it runs, in the owner\'s words, for example "every weekday from 6am to 10am, every hour, until the new year".' },
            },
            required: ['name', 'minutes', 'capacity', 'when'],
          },
        },
      },
      required: ['classes'],
    },
  },
  {
    name: 'set_order_form',
    description: 'Record the questions a customer answers before paying. Name and email are always asked, so do not include them. A delivery address is added automatically for items.',
    input_schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              type: { type: 'string', enum: ['text', 'textarea', 'email', 'phone', 'date', 'time', 'select'] },
              required: { type: 'boolean' },
              options: { type: 'array', items: { type: 'string' }, description: 'Only for select.' },
            },
            required: ['label', 'type', 'required'],
          },
        },
      },
      required: ['fields'],
    },
  },
];

// Turns the tool's input into a checked draft. Returns { draft } or { error } where error is shown to the AI and the owner.
const applyTool = async ({ name, input, draft, timezone, nowMs }) => {
  if (name === 'set_shop_items') {
    const list = (Array.isArray(input.items) ? input.items : []).map((item) => ({
      name: item?.name,
      description: item?.description || '',
      pricePence: Math.round(Number(item?.price) * 100),
    }));
    const cleaned = cleanItems(list);
    if (cleaned.error) return { error: cleaned.error };
    return { draft: { ...draft, shopItems: cleaned.value }, text: `Recorded ${cleaned.value.length} item${cleaned.value.length === 1 ? '' : 's'}.` };
  }

  if (name === 'set_classes') {
    const built = [];
    for (const raw of Array.isArray(input.classes) ? input.classes : []) {
      const minutes = Math.round(Number(raw?.minutes));
      try {
        const rule = await ruleFromText({ instruction: String(raw?.when || ''), timezone, nowMs });
        const occurrences = expandRule(rule, { minutes, timezone, nowMs });
        if (occurrences.length === 0) return { error: `${raw?.name || 'A class'}: no dates fall in "${raw?.when}". Ask the owner to describe it again.` };
        built.push({
          name: raw?.name,
          minutes,
          capacity: Math.round(Number(raw?.capacity)),
          pricePence: Math.round(Number(raw?.price || 0) * 100),
          instruction: String(raw?.when || ''),
          occurrences: occurrences.slice(0, MAX_OCCURRENCES),
        });
      } catch (error) {
        if (error instanceof RuleError) return { error: `${raw?.name || 'A class'}: ${error.message}. Ask the owner to say the days, times and how long it runs.` };
        throw error;
      }
    }
    const cleaned = cleanClasses(built, nowMs);
    if (cleaned.error) return { error: cleaned.error };
    const total = cleaned.value.reduce((sum, cls) => sum + cls.occurrences.length, 0);
    return { draft: { ...draft, classes: cleaned.value }, text: `Recorded ${cleaned.value.length} class${cleaned.value.length === 1 ? '' : 'es'} with ${total} dates.` };
  }

  if (name === 'set_order_form') {
    // cleanForm adds the name and email itself, and drops any copies the AI includes.
    const fields = (Array.isArray(input.fields) ? input.fields : []).map((field) => ({
      ...field,
      id: String(field?.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32),
    }));
    const cleaned = cleanForm(fields);
    if (!cleaned) return { error: 'The order form needs at least one valid question.' };
    return { draft: { ...draft, shopForm: cleaned }, text: `Recorded the order form with ${cleaned.length - 2} question${cleaned.length - 2 === 1 ? '' : 's'}.` };
  }

  return { error: `Unknown tool ${name}` };
};

// The short summary of a draft the assistant reads back, so it knows what is already recorded.
const summarise = (draft) => {
  const parts = [];
  if (draft.shopItems) parts.push(`Items: ${draft.shopItems.map((item) => `${item.name} £${(item.pricePence / 100).toFixed(2)}`).join(', ') || 'none'}`);
  if (draft.classes) parts.push(`Classes: ${draft.classes.map((cls) => `${cls.name} (${cls.occurrences.length} dates, ${cls.capacity} places)`).join(', ') || 'none'}`);
  if (draft.shopForm) parts.push(`Order form questions: ${draft.shopForm.slice(2).map((field) => field.label).join(', ') || 'none'}`);
  return parts.length ? parts.join('\n') : 'Nothing recorded yet.';
};

module.exports = { TOOLS, applyTool, summarise };
