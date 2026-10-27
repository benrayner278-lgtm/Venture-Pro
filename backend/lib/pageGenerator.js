// Writes a complete page for a business: its own layout, styles and graphics, rather than fixed section blocks.
const { getAnthropic } = require('./anthropic');
const { FONTS } = require('./styleOptions');
const { renderPage } = require('./pageRenderer');
const { logUsage } = require('./usageLog');

const PAGE_PROMPT = `You design and build one-page websites for small businesses. You are given the business brief and its brand kit. Design a page that could only belong to this business, and that looks nothing like a generic template.

Start by deciding the kind of page this business needs, then build that:
- image-led landing page: a large picture as the hero, with a short, direct call to action
- type-led page: a big headline, lots of white space and very few elements
- service landing page: a clear promise, a row of trust points, numbered services and a closing call to action
- product or shop page: a promo strip, a grid of product or offer cards and a simple navigation
- editorial page: long-form layout with a strong typographic hierarchy, columns and pull quotes
- data-led page: stats strip, comparison blocks and dense, tidy typography
Pick the one that fits the brief, and vary the layout, spacing, type scale, shape language and decoration so no two pages look the same.

Respond with only a JSON object, no markdown or code fences:
{
  "brand": { "name": string, "tagline": string },
  "nav": [ { "label": string, "href": string } ],
  "palette": { "bg": "#rrggbb", "surface": "#rrggbb", "text": "#rrggbb", "muted": "#rrggbb", "accent": "#rrggbb", "accentText": "#rrggbb", "border": "#rrggbb" },
  "fonts": { "heading": FontKey, "body": FontKey },
  "body": string,
  "css": string
}
FontKey is one of: ${Object.keys(FONTS).join(', ')}.

Rules for "body": the markup inside <body> only. Use semantic tags (header, nav, main, section, footer). Give each section an id, and link to it with href="#id". Links to other sites are not allowed.
Rules for "css": styles for the markup. Use the colour and font variables: var(--bg), var(--surface), var(--text), var(--muted), var(--accent), var(--accent-text), var(--border), var(--font-heading), var(--font-body). Include a mobile layout with @media (max-width: 760px). Do not use @import, external URLs, or any url() other than inline data images.
Rules for pictures:
- Use the owner's uploaded images wherever a picture fits: <img data-image="KEY" alt="what the picture shows">, using a KEY from the list of uploads.
- Where no upload fits, use <img data-stock="two to four search words" alt="what the picture should show">. It is replaced with a licensed stock photo.
- Never draw, paint or describe people, products, places or scenes as illustrations, and never write image files or URLs.
- Decoration is allowed as CSS or simple geometric SVG only: circles, lines, grids, dots, bands and blocks.
Rules for the whole page:
- No JavaScript, no forms, no style attributes, no external images or fonts.
- Palette: text must read clearly on the background (at least 4.5 to 1), and accentText must read clearly on accent (at least 3 to 1). Choose colours from the brand kit.
- Contact: use mailto: or tel: links only if the brief gives an address or number. Otherwise use an in-page call to action. Never invent contact details, testimonials, client names, statistics, awards or prices.
- Copy is British English, clear, confident and specific to this business.`;

const HEX = /^#[0-9a-fA-F]{6}$/;

// The owner's uploads, as a list the model can refer to by key.
const imageList = (images) =>
  images.length
    ? `Images the owner uploaded (use these by key):\n${images.map((image) => `- ${image.key}: ${image.label || 'no description'}`).join('\n')}`
    : 'The owner has not uploaded any images.';

// Reads the model's JSON and checks the parts that the renderer needs.
const parsePage = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const page = JSON.parse(cleaned);
  if (!page || typeof page.body !== 'string' || page.body.trim().length < 50) throw new Error('Page body was missing');
  if (typeof page.css !== 'string') page.css = '';
  if (!page.palette || !Object.values(page.palette).every((value) => HEX.test(value))) throw new Error('Palette was invalid');
  return page;
};

// Calls the model for a page and checks the answer. Used for new pages and for changes.
const askForPage = async (label, system, userText) => {
  const stream = getAnthropic().messages.stream({
    model: 'claude-sonnet-5-5',
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: userText }],
  });
  const response = await stream.finalMessage();
  logUsage(label, response);
  if (response.stop_reason === 'max_tokens') throw new Error('The page was cut off');
  const text = response.content.find((block) => block.type === 'text')?.text || '';
  return parsePage(text);
};

// Writes a new page. `images` is a list of { key, label } for the owner's uploads.
const createPage = async ({ briefText, kitText, images = [] }) => {
  const page = await askForPage('page create', PAGE_PROMPT, `${briefText}\n\nBrand kit:\n${kitText}\n\n${imageList(images)}`);
  return { page };
};

// Changes an existing page as a whole, keeping what the owner did not ask about.
const revisePage = async ({ current, instruction, briefText, kitText, history, images = [] }) => {
  const userText = `${briefText}

Brand kit:
${kitText}

Earlier requests on this page, oldest first:
${history}

${imageList(images)}

Current page as JSON:
${JSON.stringify(current)}

Change request: ${instruction}

Return the whole updated page as JSON. Keep everything the request does not ask to change.`;
  const page = await askForPage('page change', `${PAGE_PROMPT}\n\nYou are changing an existing page. Keep its design unless the request asks for a design change.`, userText);
  return { page };
};

// Renders the page as a standalone document. Images are resolved by the renderer, not here.
const toDocument = (page, images) =>
  renderPage({ brand: page.brand, palette: page.palette, fonts: page.fonts, body: page.body, css: page.css, images });

module.exports = { createPage, revisePage, parsePage, toDocument, PAGE_PROMPT };
