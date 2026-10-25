// Gives each new website its own creative starting point, so two builds for the same business do not come out alike.
const crypto = require('crypto');

const DIRECTIONS = [
  'Swiss grid: strict columns, a clean sans-serif, black and white with one bright accent, hairline rules and large numerals.',
  'Brutalist: raw and bold, thick borders, a monospace or grotesque face, high contrast and square corners.',
  'Soft Scandinavian: pale grey-blue or warm white, rounded cards, generous spacing and a calm sans-serif.',
  'Retro print: a 1970s palette of mustard, teal and brick, chunky display serif headings and colour blocks.',
  'Luxury minimal: deep charcoal or ivory, a thin high-contrast serif display face and gold hairline details.',
  'Playful pop: saturated primaries, rounded display type, sticker-style badges and bouncy shapes.',
  'Editorial magazine: dramatic type scale, pull quotes, asymmetric columns and a restrained palette.',
  'Organic nature: sage, clay and bone, soft arches and hand-drawn-feel dividers.',
  'Neon night: near-black backgrounds, an electric accent with a glow, condensed headings.',
  'Industrial workshop: concrete greys, safety orange, stencil-style capitals and exposed structure.',
  'Nordic winter: icy blues, frosted surfaces, light-weight type and crisp white space.',
  'Tropical bright: lime, coral and deep teal, large rounded shapes and bold colour blocks.',
  'Monochrome photographic: black and white, large image frames with captions and strong contrast.',
  'Vintage apothecary: green and cream labels, small-caps serif, ruled borders and tidy tables.',
  'Startup gradient: a dark base with a bold gradient hero, modern sans-serif and crisp cards.',
  'Hand-crafted: warm paper tones, underlined accents, a friendly serif and generous margins.',
  'Corporate trust: navy and white, structured cards, clear icon areas and understated accents.',
  'Japanese minimal: off-white, a single red accent, lots of empty space and a thin sans-serif.',
  'Art deco: black and gold, geometric borders, display capitals and symmetrical layouts.',
  'Pastel boutique: blush, mint and lilac, soft shadows and gentle rounded corners.',
  'Desert modern: sand, rust and cactus green, wide headings and open horizontal bands.',
  'Bold typographic: oversized headline type as the main visual, very little decoration.',
  'Cyber mono: green on black, monospace headings, visible grid lines and a terminal feel.',
  'Cozy maker: warm wood browns, rounded forms and a handwritten-feel accent face.',
];

const SIGNATURES = [
  'big figures that highlight the business strengths',
  'a horizontal timeline of how the service works',
  'a full-width quote band between sections',
  'an oversized pull quote in the middle of the page',
  'a row of three icon-style blocks',
  'a split screen with a tall colour panel',
  'a sticky side label for each section heading',
  'a stacked list with large index numbers',
  'a bold call-to-action band in the accent colour',
  'a grid of short tiles with a single word each',
  'an FAQ laid out as two columns of questions',
  'a centred hero with a large round badge',
];

const pick = (items) => items[crypto.randomInt(0, items.length)];

// A fresh creative brief for one new site. Call it for new sites only, not for tweaks.
const randomCreativeBrief = () => {
  const hue = crypto.randomInt(0, 360);
  const sectionCount = crypto.randomInt(5, 9);
  const signatures = [pick(SIGNATURES), pick(SIGNATURES.filter((_, i) => i % 3 !== 0))];
  return [
    'Creative direction for this new website (follow it, and do not fall back to a default look):',
    `- Direction: ${pick(DIRECTIONS)}`,
    `- Accent colour: a hue around ${hue} degrees on the colour wheel.`,
    `- Use ${sectionCount} sections in total, including the hero and the call to action.`,
    `- Include these signature elements: ${signatures.join('; ')}.`,
    '- This site must look clearly different from any other website. Avoid the cream-and-terracotta, serif-heading look unless the direction above asks for it.',
  ].join('\n');
};

module.exports = { randomCreativeBrief, DIRECTIONS };
