// Shop items a site owner sells. Prices are in pence (GBP) and are only ever read from the database, never from the form a visitor posts.
const crypto = require('crypto');
const { cleanPhotos } = require('./photos');

const MAX_ITEMS = 12;
const MIN_PENCE = 50; // £0.50
const MAX_PENCE = 500000; // £5,000

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Checks the owner's items and keeps only valid ones. Returns an error when something is wrong.
const cleanItems = (input) => {
  if (!Array.isArray(input)) return { error: 'Shop items are missing' };
  if (input.length > MAX_ITEMS) return { error: `Add up to ${MAX_ITEMS} items` };
  const items = [];
  for (const item of input) {
    const name = clip(item?.name, 60);
    const description = clip(item?.description, 200);
    const pricePence = Math.round(Number(item?.pricePence));
    if (!name) return { error: 'Every item needs a name' };
    if (!Number.isFinite(pricePence) || pricePence < MIN_PENCE || pricePence > MAX_PENCE) {
      return { error: `${name}: the price must be between £0.50 and £5,000` };
    }
    items.push({ id: clip(item?.id, 36) || crypto.randomUUID(), name, description, pricePence, photos: cleanPhotos(item?.photos) });
  }
  return { value: items };
};

// The items a visitor can buy, from the stored list.
const itemsOf = (site) => (Array.isArray(site?.shopItems) ? site.shopItems : []);

const formatPrice = (pence) => `£${(pence / 100).toFixed(2)}`;

const MAX_LINES = 12;
const MAX_QTY = 20;

// Turns the basket a visitor sent into lines. Product lines have an id and quantity; slot lines have a start time and a service.
// Products get their real names and prices from the database. Slot prices are added later, from the booking settings.
const basketLines = (site, rawBasket) => {
  let parsed;
  try {
    parsed = typeof rawBasket === 'string' ? JSON.parse(rawBasket) : rawBasket;
  } catch {
    return { error: 'Your basket could not be read. Please try again.' };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return { error: 'Your basket is empty' };
  if (parsed.length > MAX_LINES) return { error: 'Your basket has too many different items' };
  const catalogue = new Map(itemsOf(site).map((item) => [item.id, item]));
  const lines = [];
  const slots = [];
  for (const entry of parsed) {
    if (entry && entry.slot !== undefined) {
      const startMs = Date.parse(String(entry.slot));
      const service = String(entry.service || '').slice(0, 60);
      if (!Number.isFinite(startMs) || !service) return { error: 'One of the times in your basket could not be read. Please check your basket.' };
      if (slots.some((slot) => slot.startMs === startMs && slot.service === service)) continue;
      slots.push({ startMs, service });
      continue;
    }
    const item = catalogue.get(String(entry?.id || ''));
    const qty = Math.round(Number(entry?.qty));
    if (!item) return { error: 'One of the items is no longer for sale. Please check your basket.' };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Choose between 1 and ${MAX_QTY} of ${item.name}` };
    lines.push({ id: item.id, name: item.name, pricePence: item.pricePence, qty });
  }
  if (lines.length + slots.length === 0) return { error: 'Your basket is empty' };
  if (slots.length > MAX_LINES) return { error: 'Your basket has too many bookings' };
  const totalPence = lines.reduce((sum, line) => sum + line.pricePence * line.qty, 0);
  return { lines, slots, totalPence };
};

module.exports = { cleanItems, itemsOf, formatPrice, basketLines, MAX_ITEMS };
