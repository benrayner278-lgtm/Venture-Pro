const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You write website content for small businesses. Respond with only a JSON object, no markdown or code fences, matching this shape:
{
  "brand": { "name": string, "tagline": string },
  "hero": { "headline": string, "subheadline": string, "primaryCta": string, "secondaryCta": string },
  "problem": { "title": string, "points": [string, string, string] },
  "solution": { "title": string, "body": string },
  "features": [{ "title": string, "description": string }],
  "benefits": [{ "title": string, "description": string }],
  "faq": [{ "question": string, "answer": string }],
  "finalCta": { "headline": string, "button": string },
  "footer": { "note": string }
}
Rules: "features" has 3 to 6 items, "benefits" has 3 to 4, "faq" has 3 to 5. Keep headlines under 10 words. Do not invent testimonials, customer names, statistics or prices. Write clear, confident, conversion-focused copy in British English.`;

const REQUIRED_KEYS = ['brand', 'hero', 'problem', 'solution', 'features', 'benefits', 'faq', 'finalCta', 'footer'];

const parseContent = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const content = JSON.parse(cleaned);
  const missing = REQUIRED_KEYS.filter((key) => !(key in content));
  if (missing.length) {
    throw new Error(`Missing sections: ${missing.join(', ')}`);
  }
  return content;
};

const generateWebsite = async (req, res) => {
  try {
    const { businessName, tagline, features, callToAction, currentContent, instruction } = req.body;

    if (!businessName || !tagline || !features || !callToAction) {
      return res.status(400).json({ error: 'Business name, tagline, features and call to action are required' });
    }

    const brief = `Business name: ${businessName}
Tagline: ${tagline}
Key features: ${features}
Call to action: ${callToAction}`;

    const userMessage = currentContent && instruction
      ? `Here is the current website content as JSON:\n${JSON.stringify(currentContent)}\n\nApply this change and return the full updated JSON: ${instruction}\n\nBusiness brief:\n${brief}`
      : `Create the website content for this business:\n${brief}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const content = parseContent(text);

    res.json({ content });
  } catch (error) {
    console.error('Generate website error:', error);
    res.status(500).json({ error: `Failed to generate website: ${error.message}` });
  }
};

module.exports = { generateWebsite };
