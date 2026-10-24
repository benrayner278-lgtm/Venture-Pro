const { getAnthropic } = require('../lib/anthropic');
const prisma = require('../lib/prisma');
const { EFFECTS } = require('../lib/designPresets');

const SECTION_TYPES = [
  'hero', 'text', 'cards', 'steps', 'gallery', 'pricing', 'faq', 'contact', 'cta', 'custom',
];

const SYSTEM_PROMPT = `You design and write websites for small businesses. Before writing, think about this business and every request in the brief: what the site must show, who it is for, and what action the visitor should take. Then build a page plan of sections that fits that business, in a sensible order. Do not use a fixed template.

Respond with only a JSON object, no markdown or code fences:
{
  "brand": { "name": string, "tagline": string },
  "nav": [string],
  "sections": [ Section ],
  "footer": { "note": string },
  "design": { "effect": "none" | "reveal" | "stack" }
}

The "design" field is optional. Set "effect" to "reveal" when the owner asks for sections to fade or rise in as the visitor scrolls. Set it to "stack" when they ask for sections to overlap or slide over each other as the visitor scrolls. Use "none" when they ask for no motion. Leave it out otherwise.

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
  if (!EFFECTS.includes(content.design?.effect)) {
    delete content.design;
  }
  return content;
};

const generateWebsite = async (req, res) => {
  try {
    const { businessName, tagline, features, callToAction, requests, currentContent, instruction } = req.body || {};

    // If a project is given, it must belong to the caller
    const { projectId } = req.body || {};
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (project.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    }

    if (!businessName || !tagline || !features || !callToAction) {
      return res.status(400).json({ error: 'Business name, tagline, features and call to action are required' });
    }

    const brief = `Business name: ${businessName}
Tagline: ${tagline}
What the business offers: ${features}
Main call to action: ${callToAction}
Specific requests: ${requests || 'none'}`;

    const userMessage = currentContent && instruction
      ? `Here is the current website as JSON:\n${JSON.stringify(currentContent)}\n\nApply this change to the website and return the full updated JSON. The returned JSON must differ from the current one in the part the change is about. Keep everything else that still fits. Change: ${instruction}\n\nBusiness brief:\n${brief}`
      : `Plan and write the website for this business:\n${brief}`;

    let content;
    let lastError;
    for (let attempt = 0; attempt < 2 && !content; attempt++) {
      const response = await getAnthropic().messages.create({
        model: 'claude-sonnet-5-5',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      const text = response.content.find((block) => block.type === 'text')?.text || '';
      try {
        if (response.stop_reason === 'max_tokens') {
          throw new Error('Response was cut off before the JSON finished');
        }
        content = parseContent(text);
      } catch (error) {
        lastError = error;
      }
    }

    if (!content) {
      throw lastError;
    }

    res.json({ content });
  } catch (error) {
    console.error('Generate website error:', error);
    res.status(500).json({ error: 'Failed to generate website' });
  }
};

const PROOFREAD_PROMPT = `You check text for spelling and punctuation mistakes. Fix only spelling, capitalisation, punctuation and obvious typos. Keep the meaning, wording, tone and British English spelling. Do not rephrase anything.

Respond with only a JSON object, no markdown or code fences:
{"corrected": string, "changes": [{"from": string, "to": string}]}
If the text is already correct, return it unchanged with an empty changes array.`;

const MAX_PROOFREAD_CHARS = 2000;

const proofreadText = async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    if (!text.trim()) return res.status(400).json({ error: 'There is no text to check' });
    if (text.length > MAX_PROOFREAD_CHARS) {
      return res.status(400).json({ error: `Check up to ${MAX_PROOFREAD_CHARS} characters at a time` });
    }

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 2000,
      system: PROOFREAD_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    if (response.stop_reason === 'max_tokens') throw new Error('Proofread response was cut off');
    const reply = response.content.find((block) => block.type === 'text')?.text || '';
    const cleaned = reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    const result = JSON.parse(cleaned);
    if (typeof result.corrected !== 'string') throw new Error('Proofread response had no corrected text');

    const changes = (Array.isArray(result.changes) ? result.changes : [])
      .filter((change) => change && typeof change.from === 'string' && typeof change.to === 'string')
      .slice(0, 20);
    res.json({ corrected: result.corrected, changes });
  } catch (error) {
    console.error('Proofread error:', error);
    res.status(500).json({ error: 'Could not check the text' });
  }
};

module.exports = { generateWebsite, proofreadText };
