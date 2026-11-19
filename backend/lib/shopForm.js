// The order form a shop shows at checkout. Each shop gets its own form, written by the AI from what it sells.
// Visitors can only fill in the field types listed here, and every answer is checked again on the server.
const { getAnthropic } = require('./anthropic');
const { logUsage } = require('./usageLog');

const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'date', 'time', 'select'];
const MAX_FIELDS = 8;
const MAX_ANSWER = 1000;
const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

// Every order asks for a name and an email. The AI adds the rest.
const CONTACT_FIELDS = [
  { id: 'name', label: 'Your name', type: 'text', required: true },
  { id: 'email', label: 'Your email', type: 'email', required: true },
];
const NOTES_FIELD = { id: 'notes', label: 'Notes for the business (optional)', type: 'textarea', required: false };

// Used when the AI is not available, so checkout always works.
const PRESETS = {
  default: [NOTES_FIELD],
  products: [
    { id: 'address', label: 'Delivery address', type: 'textarea', required: true },
    NOTES_FIELD,
  ],
  sessions: [
    { id: 'date', label: 'Preferred date', type: 'date', required: true },
    { id: 'time', label: 'Preferred time', type: 'time', required: true },
    NOTES_FIELD,
  ],
};

const defaultForm = () => [...CONTACT_FIELDS, ...PRESETS.default];

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Keeps only valid fields. Adds the name and email fields in front, and never more than MAX_FIELDS extra fields.
const cleanForm = (input) => {
  if (!Array.isArray(input)) return null;
  const seen = new Set(CONTACT_FIELDS.map((field) => field.id));
  const fields = [];
  for (const raw of input) {
    if (fields.length >= MAX_FIELDS) break;
    const type = FIELD_TYPES.includes(raw?.type) ? raw.type : null;
    const label = clip(raw?.label, 80);
    if (!type || !label) continue;
    // The name and email are already asked for, so the AI's copies are dropped.
    if (/^(your\s+)?(full\s+)?(name|e-?mail(\s+address)?)\s*\??$/i.test(label)) continue;
    let id = clip(raw?.id, 32).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!ID_PATTERN.test(id) || seen.has(id)) id = `field_${fields.length + 1}`;
    seen.add(id);
    const field = { id, label, type, required: raw?.required === true };
    if (type === 'select') {
      field.options = (Array.isArray(raw?.options) ? raw.options : []).map((o) => clip(o, 40)).filter(Boolean).slice(0, 12);
      if (field.options.length < 2) continue;
    }
    fields.push(field);
  }
  if (fields.length === 0) return null;
  return [...CONTACT_FIELDS, ...fields];
};

const FORM_PROMPT = `You design the order form for a small business website. Visitors fill it in before paying.
Return ONLY JSON: {"fields":[{"label":"...","type":"...","required":true,"options":["..."]}]}

Rules:
- Write 1 to 6 fields for what this business needs from the buyer to fulfil the order.
- Do not include the buyer's name or email; those are added already.
- type must be one of: text, textarea, email, phone, date, time, select.
- Use "select" only with at least two "options".
- Products that are posted need a delivery address (textarea). Bookings or sessions need a date and a time.
- Never ask for card numbers, bank details, passwords, passport or national ID numbers.
- Keep labels short and plain, in British English.`;

// Writes the form with the AI. Falls back to a preset when the AI fails or its answer is not usable.
const generateShopForm = async ({ shopName, description, itemNames }) => {
  const text = `Business: ${shopName || 'a small business'}
What it sells: ${description || 'see the items below'}
Items: ${itemNames.join(', ') || 'none yet'}`;
  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 800,
      system: FORM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    logUsage('shop order form', response);
    if (response.stop_reason === 'max_tokens') throw new Error('Order form was cut off');
    const raw = response.content.find((block) => block.type === 'text')?.text || '';
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    const form = cleanForm(JSON.parse(cleaned)?.fields);
    if (form) return form;
    throw new Error('Order form had no usable fields');
  } catch (error) {
    console.error('Shop order form error:', error);
    const text = String(description || '');
    if (/deliver|post|ship|send/i.test(text)) return cleanForm(PRESETS.products) || defaultForm();
    if (/session|booking|book|appointment|lesson|class|date|time/i.test(text)) return cleanForm(PRESETS.sessions) || defaultForm();
    return defaultForm();
  }
};

// Checks what a visitor typed into the form. Returns the cleaned answers, or an error naming the field.
const checkAnswers = (form, body) => {
  const answers = {};
  for (const field of form) {
    const value = clip(body?.[`f_${field.id}`], MAX_ANSWER);
    if (!value) {
      if (field.required) return { error: `Please fill in: ${field.label}` };
      continue;
    }
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: 'Please enter a valid email address' };
    if (field.type === 'phone' && !/^[+0-9 ()-]{6,25}$/.test(value)) return { error: `Please check: ${field.label}` };
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `Please choose a date for: ${field.label}` };
    if (field.type === 'time' && !/^\d{2}:\d{2}$/.test(value)) return { error: `Please choose a time for: ${field.label}` };
    if (field.type === 'select' && !(field.options || []).includes(value)) return { error: `Please choose an option for: ${field.label}` };
    answers[field.id] = { label: field.label, value };
  }
  return { answers };
};

module.exports = { cleanForm, defaultForm, generateShopForm, checkAnswers, PRESETS, CONTACT_FIELDS, MAX_ANSWER };
