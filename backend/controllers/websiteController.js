const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SECTION_TYPES = [
  'hero', 'text', 'cards', 'steps', 'gallery', 'pricing', 'faq', 'contact', 'cta', 'custom',
];

const SYSTEM_PROMPT = `You design and write websites for small businesses. Before writing, think about this business and every request in the brief: what the site must show, who it is for, and what action the visitor should take. Then build a page plan of sections that fits that business, in a sensible order. Do not use a fixed template.

Respond with only a JSON object, no markdown or code fences:
{
  "brand": { "name": string, "tagline": string },
  "nav": [string],
  "sections": [ Section ],
  "footer": { "note": string }
}

Each Section is one of these shapes (the "type" field is required):
- { "type": "hero", "eyebrow": string, "headline": string, "subheadline": string, "primaryCta": string, "secondaryCta": string }
- { "type": "text", "title": string, "paragraphs": [string] }
- { "type": "cards", "title": string, "intro": string, "items": [{ "title": string, "description": string }] }  (use for features, benefits, services, values)
- { "type": "steps", "title": string, "items": [{ "title": string, "description": string }] }  (use for how it works or a process)
- { "type": "gallery", "title": string, "intro": string, "items": [{ "title": string, "description": string, "tag": string }] }  (use for showing work, projects, case studies, portfolio pieces; describe each item in plain words, never claim real clients)
- { "type": "pricing", "title": string, "tiers": [{ "name": string, "price": string, "description": string, "features": [string] }] }
- { "type": "faq", "title": string, "items": [{ "question": string, "answer": string }] }
- { "type": "contact", "title": string, "body": string, "email": string, "phone": string }
- { "type": "cta", "headline": string, "body": string, "button": string }
- { "type": "custom", "title": string, "paragraphs": [string] }  (use only when nothing else fits)

Rules:
- Every feature, service or request in the brief must appear somewhere on the page. If the brief asks for something like "show our work", include a gallery section for it.
- Include a hero first and a cta near the end. Use between 5 and 9 sections in total.
- Keep headlines under 10 words and copy clear, confident and specific to this business. Use British English.
- Do not invent testimonials, client names, statistics, awards, or prices. Use "pricing" only if the brief supplies prices; otherwise skip it.
- Do not invent email addresses or phone numbers; leave them as empty strings unless the brief gives them.
- For gallery items, describe the kind of work the business does, using placeholder-style descriptions the owner can edit.`;

const parseContent = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const content = JSON.parse(cleaned);
  if (!content.brand || !Array.isArray(content.sections) || content.sections.length === 0) {
    throw new Error('Response was missing brand or sections');
  }
  content.sections = content.sections.filter((section) => SECTION_TYPES.includes(section.type));
  if (content.sections.length === 0) {
    throw new Error('No valid sections returned');
  }
  return content;
};

const generateWebsite = async (req, res) => {
  try {
    const { businessName, tagline, features, callToAction, requests, currentContent, instruction } = req.body;

    if (!businessName || !tagline || !features || !callToAction) {
      return res.status(400).json({ error: 'Business name, tagline, features and call to action are required' });
    }

    const brief = `Business name: ${businessName}
Tagline: ${tagline}
What the business offers: ${features}
Main call to action: ${callToAction}
Specific requests: ${requests || 'none'}`;

    const userMessage = currentContent && instruction
      ? `Here is the current website as JSON:\n${JSON.stringify(currentContent)}\n\nMake this change, keeping everything else that still fits, and return the full updated JSON: ${instruction}\n\nBusiness brief:\n${brief}`
      : `Plan and write the website for this business:\n${brief}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 6000,
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
