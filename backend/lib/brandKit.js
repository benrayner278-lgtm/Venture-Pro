const { getAnthropic } = require('./anthropic');
const { FONT_KEYS } = require('./logoSpec');
const { contrast } = require('./designBrief');

const STRATEGY_PROMPT = `You are a brand strategist for small businesses. From the business brief, decide what this brand should feel like before anyone designs it. Be specific to this business. Avoid the obvious choices a template would make.

Respond with only a JSON object, no markdown or code fences:
{
  "positioning": string,              // one sentence: what the business is and why a customer picks it
  "audience": string,                 // who it is for, in plain words
  "personality": [string],            // three or four words, e.g. "warm", "precise", "playful"
  "voice": string,                    // how the copy should sound, one sentence
  "palette": { "primary": "#rrggbb", "accent": "#rrggbb", "background": "#rrggbb", "rationale": string },
  "logoFont": ${FONT_KEYS.map((key) => `"${key}"`).join(' | ')},   // see the font guide below
  "logoIdea": string,                 // one memorable visual idea for the logo, tied to the business
  "motifs": [string],                 // two or three visual motifs for the website
  "avoid": [string]                   // two or three things this brand should not look like
}
Palette rules: text colour (primary) must read clearly on the background, with a contrast ratio of at least 4.5 to 1. The accent is for the logo mark and highlights.
Font guide, so the logo font is chosen for this business and not by habit:
- inter: neutral, modern sans; tech, software, clinics, professional services
- montserrat: wide, confident sans; fitness, sport, friendly brands with presence
- poppins: rounded geometric sans; warm, approachable, youthful, kids
- space: quirky grotesk with character; creative, independent, tech-led
- oswald: tall condensed sans; trades, garages, bold industrial or sporting names
- bebas: tall all-caps display; loud, short names, strong signage feel
- playfair: high-contrast serif; elegant, romantic, heritage, premium
- dmserif: sturdy display serif; artisan, food, family, traditional craft
Choose the font whose character matches the personality. Do not reach for the serif fonts unless the personality calls for them.`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const list = (value, max, size) => (Array.isArray(value) ? value.map((item) => clip(item, size)).filter(Boolean).slice(0, max) : []);

// Keeps only usable values, and falls back to a safe palette where the colours do not pass the contrast check.
const cleanKit = (raw) => {
  const palette = raw?.palette || {};
  const background = HEX.test(palette.background) ? palette.background : '#ffffff';
  const primary = HEX.test(palette.primary) && contrast(palette.primary, background) >= 4.5 ? palette.primary : '#111111';
  const accent = HEX.test(palette.accent) ? palette.accent : '#2563eb';
  return {
    positioning: clip(raw?.positioning, 300),
    audience: clip(raw?.audience, 300),
    personality: list(raw?.personality, 4, 30),
    voice: clip(raw?.voice, 300),
    palette: { primary, accent, background, rationale: clip(palette.rationale, 300) },
    logoFont: FONT_KEYS.includes(raw?.logoFont) ? raw.logoFont : 'inter',
    logoIdea: clip(raw?.logoIdea, 300),
    motifs: list(raw?.motifs, 3, 80),
    avoid: list(raw?.avoid, 3, 120),
  };
};

// Writes the brand kit for a business. If the strategist fails, the builders carry on without one.
const createBrandKit = async (briefText) => {
  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 2500,
      system: STRATEGY_PROMPT,
      messages: [{ role: 'user', content: briefText }],
    });
    if (response.stop_reason === 'max_tokens') throw new Error('Brand kit was cut off');
    const text = response.content.find((block) => block.type === 'text')?.text || '';
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    return cleanKit(JSON.parse(cleaned));
  } catch (error) {
    console.error('Brand kit error:', error);
    return null;
  }
};

// The kit as plain text for a prompt.
const kitForPrompt = (kit) => {
  if (!kit) return 'No brand kit was written for this business.';
  return `Positioning: ${kit.positioning}
Audience: ${kit.audience}
Personality: ${kit.personality.join(', ')}
Voice: ${kit.voice}
Palette: text ${kit.palette.primary}, accent ${kit.palette.accent}, background ${kit.palette.background}. ${kit.palette.rationale}
Logo font: ${kit.logoFont}
Logo idea: ${kit.logoIdea}
Website motifs: ${kit.motifs.join('; ')}
Avoid: ${kit.avoid.join('; ')}`;
};

module.exports = { createBrandKit, kitForPrompt };
