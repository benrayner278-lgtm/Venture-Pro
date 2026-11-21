// The tools the setup assistant uses to fill in a shop draft. Nothing is saved here. The owner applies the draft
// with a click, and the existing save routes check it again.
const { cleanItems } = require('./shop');
const { cleanForm } = require('./shopForm');
const { cleanClasses, ruleFromText, expandRule, RuleError, MAX_OCCURRENCES } = require('./classSchedule');
const { cleanSettings } = require('../controllers/bookingController');

const PHONE_PATTERN = /^\+?[0-9 ()-]{8,25}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TOOLS = [
  {
    name: 'set_contact',
    description: 'Record the email address and phone number customers use for enquiries. Use this when the business takes enquiries rather than online sales, or as a backup. Ask the owner for both if either is missing.',
    input_schema: {
      type: 'object',
      properties: { email: { type: 'string' }, phone: { type: 'string', description: 'Include the area code.' } },
      required: ['email', 'phone'],
    },
  },
  {
    name: 'set_booking',
    description: 'Turn on online booking for appointments or services, with the times the business is open and what each service costs. Replaces the earlier booking settings. Days are 24-hour times, or null for a closed day.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'object',
          description: 'For each day, [opens, closes] such as ["09:00","17:00"], or null when closed.',
          properties: Object.fromEntries(DAYS.map((day) => [day, { type: ['array', 'null'], items: { type: 'string' }, maxItems: 2 }])),
        },
        services: {
          type: 'array',
          maxItems: 10,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              minutes: { type: 'number', description: 'Length, 15 to 480.' },
              price: { type: 'number', description: 'Price in pounds, 0 for free.' },
            },
            required: ['name', 'minutes', 'price'],
          },
        },
        slotMinutes: { type: 'number', enum: [15, 30, 60], description: 'How often a booking can start.' },
      },
      required: ['days', 'services'],
    },
  },
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
const applyTool = async ({ name, input, draft, timezone, nowMs, current = {} }) => {
  if (name === 'set_contact') {
    const email = String(input.email || '').trim();
    const phone = String(input.phone || '').trim();
    if (!EMAIL_PATTERN.test(email)) return { error: 'That email address does not look right. Ask the owner to check it.' };
    if (!PHONE_PATTERN.test(phone)) return { error: 'That phone number does not look right. Ask for it with the area code.' };
    return { draft: { ...draft, contact: { email, phone } }, text: 'Recorded the enquiry email and phone number.' };
  }

  if (name === 'set_booking') {
    const hours = {};
    for (const day of DAYS) hours[day] = Array.isArray(input.days?.[day]) ? input.days[day] : null;
    const services = (Array.isArray(input.services) ? input.services : []).map((service) => ({
      name: service?.name,
      minutes: Math.round(Number(service?.minutes)),
      price: service?.price ? `£${Number(service.price).toFixed(2)}` : '',
      pricePence: Math.round(Number(service?.price || 0) * 100),
    }));
    const result = cleanSettings({
      enabled: true,
      preset: current.preset,
      template: current.template,
      kind: 'appointments',
      callDetails: current.callDetails || '',
      timezone: current.timezone || timezone,
      slotMinutes: input.slotMinutes || current.slotMinutes || 30,
      daysAhead: current.daysAhead || 14,
      hours,
      services,
      sessions: [],
    });
    if (result.error) return { error: result.error };
    return { draft: { ...draft, bookingSettings: result.value }, text: `Recorded online booking for ${services.length} service${services.length === 1 ? '' : 's'}.` };
  }

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
  if (draft.contact) parts.push(`Enquiry contact: ${draft.contact.email}, ${draft.contact.phone}`);
  if (draft.bookingSettings) parts.push(`Online booking: ${draft.bookingSettings.services.map((service) => `${service.name} ${service.minutes} min`).join(', ')}`);
  if (draft.shopItems) parts.push(`Items: ${draft.shopItems.map((item) => `${item.name} £${(item.pricePence / 100).toFixed(2)}`).join(', ') || 'none'}`);
  if (draft.classes) parts.push(`Classes: ${draft.classes.map((cls) => `${cls.name} (${cls.occurrences.length} dates, ${cls.capacity} places)`).join(', ') || 'none'}`);
  if (draft.shopForm) parts.push(`Order form questions: ${draft.shopForm.slice(2).map((field) => field.label).join(', ') || 'none'}`);
  return parts.length ? parts.join('\n') : 'Nothing recorded yet.';
};

module.exports = { TOOLS, applyTool, summarise };
