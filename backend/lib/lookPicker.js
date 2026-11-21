// Chooses three looks from the preset bank for a business. The owner picks one, and the generator then uses its colours.
// The AI only chooses from the bank. Any id it invents is dropped, and a keyword match fills the gap if the AI fails.
const { PRESETS } = require('./designPresets');
const { getAnthropic } = require('./anthropic');
const { logUsage } = require('./usageLog');

const SHORTLIST = 3;
const WORD = /[a-z]{4,}/g;

const LOOK_PROMPT = `You choose website looks for a small business. You are given a list of looks. Each has an id, the kind of business it suits, and its mood.
Return ONLY JSON, with no other text: {"picks":[{"id":"...","reason":"one short plain British English sentence"}]}
Pick exactly ${SHORTLIST} different ids from the list. Do not invent ids. Choose for the audience and the feel of the business, not only its type. Put the best fit first.`;

const publicLook = (look, reason) => ({
  id: look.id,
  name: look.name,
  description: look.description,
  reason,
  bg: look.bg,
  surface: look.surface,
  text: look.text,
  accent: look.accent,
  accentText: look.accentText,
});

// Scores each look by how many words of the brief appear in its suits and mood. Used when the AI cannot answer.
const keywordPicks = (brief) => {
  const words = new Set((String(brief || '').toLowerCase().match(WORD) || []));
  return PRESETS
    .map((look) => ({ look, score: (`${look.suits} ${look.mood} ${look.description}`.toLowerCase().match(WORD) || []).filter((w) => words.has(w)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST)
    .map(({ look }) => publicLook(look, `Suits businesses like yours: ${look.suits.toLowerCase()}.`));
};

// Asks the AI to pick. Returns the valid picks, or throws if none are usable.
const aiPicks = async (brief) => {
  const list = PRESETS.map((look) => `${look.id}: ${look.name}. Suits: ${look.suits}. Mood: ${look.mood}.`).join('\n');
  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 600,
    system: LOOK_PROMPT,
    messages: [{ role: 'user', content: `Business:\n${brief}\n\nLooks:\n${list}` }],
  });
  logUsage('website looks', response);
  const raw = response.content.find((block) => block.type === 'text')?.text || '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const picks = JSON.parse(cleaned)?.picks;
  if (!Array.isArray(picks)) throw new Error('No picks returned');
  const seen = new Set();
  const valid = [];
  for (const pick of picks) {
    const look = PRESETS.find((item) => item.id === pick?.id);
    if (!look || seen.has(look.id)) continue;
    seen.add(look.id);
    valid.push(publicLook(look, String(pick.reason || '').slice(0, 200)));
  }
  if (valid.length === 0) throw new Error('No valid picks');
  return valid.slice(0, SHORTLIST);
};

// The three looks to choose from. Always returns three distinct looks.
const shortlistLooks = async ({ brief }) => {
  let picks = [];
  try {
    picks = await aiPicks(brief);
  } catch (error) {
    console.error('Look shortlist fell back to keywords:', error.message);
  }
  if (picks.length < SHORTLIST) {
    const have = new Set(picks.map((pick) => pick.id));
    for (const pick of keywordPicks(brief)) {
      if (picks.length >= SHORTLIST) break;
      if (!have.has(pick.id)) picks.push(pick);
    }
  }
  return picks;
};

// The instructions the generator gets for a look the owner chose. It uses these colours and feel exactly.
const lookDirection = (look) => `The owner chose the look "${look.name}": ${look.description}. It suits ${look.suits.toLowerCase()}. Mood: ${look.mood}.
Use these colours exactly as the design palette, and give the border as a hex colour close to the look's border:
background ${look.bg}, surface ${look.surface}, text ${look.text}, muted ${look.muted}, accent ${look.accent}, accent text ${look.accentText}.
`;

const findLook = (id) => PRESETS.find((look) => look.id === id) || null;

module.exports = { shortlistLooks, lookDirection, findLook, SHORTLIST };
