const { getAnthropic } = require('../lib/anthropic');
const prisma = require('../lib/prisma');
const { FONTS } = require('../lib/styleOptions');
const { sanitizeDesign, sanitizeSections } = require('../lib/designBrief');
const { randomCreativeBrief } = require('../lib/creativeBrief');
const { SECTION_TYPES, WEBSITE_EDIT_TOOLS, applyWebsiteTool } = require('../lib/websiteEdits');
const { runToolLoop } = require('../lib/agentLoop');
const { openBuild, historyForPrompt, recordChange } = require('../lib/builderMemory');
const { createBrandKit, kitForPrompt } = require('../lib/brandKit');
const { createPage, revisePage } = require('../lib/pageGenerator');
const { sanitizeBody, sanitizeCss } = require('../lib/pageSanitizer');
const { logUsage } = require('../lib/usageLog');

const EDIT_PROMPT = `You change a website for a small business. You are given the business brief, the earlier requests on this website, and the current website as JSON. Make the change the user asks for, and only that change. Keep everything else that still fits, including the design, unless the request is about the design.

Work with the section tools. Sections are numbered from 0. Use update_section to rewrite a section in place, add_section and remove_section to change what is on the page, move_section to reorder, and update_site for the brand name, tagline, navigation, footer or design. Make all the changes you need before you reply. Write copy that is clear, confident and specific to this business, in British English. Do not invent testimonials, client names, statistics, awards or prices.

When the changes are done, call reply_to_user with one or two plain sentences saying what you changed. If the request is unclear, choose the most sensible reading and say what you chose. If the user refers to something from an earlier request, use the earlier requests to find it.`;

// Keeps only the parts of a site the AI may change, and makes them safe to store and render.
const cleanSiteState = (content) => {
  const { design, ...rest } = content && typeof content === 'object' ? content : {};
  const sections = (Array.isArray(rest.sections) ? rest.sections : []).filter((section) => SECTION_TYPES.includes(section?.type));
  const cleanDesign = sanitizeDesign(design);
  return {
    ...rest,
    brand: rest.brand && typeof rest.brand === 'object' ? rest.brand : { name: '', tagline: '' },
    sections: sanitizeSections(sections),
    ...(cleanDesign ? { design: cleanDesign } : {}),
  };
};

const outlineOf = (sections) =>
  sections.map((section, index) => `${index}: ${section.type}${section.layout ? ` (${section.layout})` : ''}${section.title || section.headline ? ` - ${section.title || section.headline}` : ''}`).join('\n');

// New websites use the page format unless WEBSITE_FORMAT=sections is set, which keeps the section builder available.
const SITE_FORMAT = process.env.WEBSITE_FORMAT === 'sections' ? 'sections' : 'page';

// Keeps only what a page needs to be edited and rendered, with the markup and styles made safe.
const cleanPageState = (content) => ({
  format: 'page',
  brand: content.brand && typeof content.brand === 'object' ? content.brand : { name: '', tagline: '' },
  nav: Array.isArray(content.nav) ? content.nav : [],
  palette: content.palette,
  fonts: content.fonts,
  body: sanitizeBody(content.body),
  css: sanitizeCss(content.css),
  images: content.images && typeof content.images === 'object' ? content.images : {},
});

const imageListOf = (images) => Object.keys(images || {}).map((key) => ({ key, label: 'uploaded photo' }));

const SYSTEM_PROMPT = `You design and write websites for small businesses. Before writing, think about this business and every request in the brief: what the site must show, who it is for, and what action the visitor should take. Then build a page plan of sections that fits that business, in a sensible order. Do not use a fixed template.

Respond with only a JSON object, no markdown or code fences:
{
  "brand": { "name": string, "tagline": string },
  "nav": [string],
  "sections": [ Section ],
  "footer": { "note": string },
  "design": Design
}

Design is the design brief for this business. Design the site around this business: its character, its customers and what the visitor should do. Do not fall back to a generic look. Every site must look different from the others. Use this shape:
{
  "mood": string,                       // three or four words, e.g. "warm, rustic, small-batch"
  "palette": { "bg": hex, "surface": hex, "text": hex, "muted": hex, "accent": hex, "accentText": hex, "border": hex },
  "fonts": { "heading": FontKey, "body": FontKey },
  "headingCase": "none" | "uppercase" | "capitalize",
  "headingWeight": 500 | 600 | 700 | 800 | 900,
  "radius": number,                     // corner roundness in pixels, 0 (square) to 32 (very round)
  "density": "airy" | "balanced" | "dense",
  "effect": "none" | "reveal" | "stack"
}
FontKey is one of: ${Object.keys(FONTS).join(', ')}.
Palette rules: every colour is a six-digit hex code like #1e3a8a. Text must read clearly on the background (at least 4.5 to 1 contrast). accentText must read clearly on accent (at least 3 to 1). Choose colours that suit the business, not the same ones every time. Always include the design field.

Effect: set "reveal" when the owner asks for sections to fade or rise in as the visitor scrolls, and "stack" when they ask for sections to overlap. Use "none" otherwise, unless motion clearly suits the business.

Each Section is one of these shapes (the "type" field is required):
Every section may also have a "layout" string, chosen from the list for its type. Pick the layout that suits the content, and vary layouts so the page does not repeat the same arrangement. Layouts by type: hero (centred, split, editorial), text (centred, columns), cards (grid, list, numbered), steps (timeline, columns), gallery (grid, featured, list), pricing (cards, rows), faq (accordion, columns), contact (centred, split), cta (banner, inline).
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
  content.sections = sanitizeSections(content.sections);
  content.design = sanitizeDesign(content.design);
  if (!content.design) delete content.design;
  return content;
};

const generateWebsite = async (req, res) => {
  try {
    const { businessName, tagline, features, callToAction, requests, currentContent, instruction, buildId } = req.body || {};

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

    const briefFields = { businessName, tagline, features, callToAction, requests: requests || '' };
    const brief = `Business name: ${businessName}
Tagline: ${tagline}
What the business offers: ${features}
Main call to action: ${callToAction}
Specific requests: ${requests || 'none'}`;

    // A change to an existing website goes through the section tools, with the build's earlier requests as memory.
    const isChange = Boolean(instruction) && Boolean(currentContent || buildId);
    if (isChange) {
      const build = await openBuild({
        userId: req.userId,
        kind: 'website',
        buildId: typeof buildId === 'string' ? buildId : undefined,
        brief: briefFields,
        state: currentContent ? (currentContent.format === 'page' ? cleanPageState(currentContent) : cleanSiteState(currentContent)) : undefined,
      });
      if (build.state?.format === 'page') {
        const current = build.state;
        const { page } = await revisePage({
          current,
          instruction,
          briefText: brief,
          kitText: kitForPrompt(build.brief?.kit),
          history: historyForPrompt(build),
          images: imageListOf(current.images),
        });
        const content = { ...cleanPageState(page), images: current.images };
        const reply = `Updated the page for ${content.brand?.name || businessName}.`;
        await recordChange(build, { request: instruction, reply, actions: ['updated the page'], state: content });
        return res.json({ content, buildId: build.id, reply });
      }
      let content = cleanSiteState(build.state);
      if (content.sections.length === 0) return res.status(400).json({ error: 'Build a website first, then ask for changes' });

      const context = `Business brief:
${brief}

Brand kit:
${kitForPrompt(build.brief?.kit)}

Earlier requests on this website, oldest first:
${historyForPrompt(build)}

Current website, sections numbered from 0:
${outlineOf(content.sections)}

Full website as JSON:
${JSON.stringify(content)}`;

      const outcome = await runToolLoop({
        system: EDIT_PROMPT,
        context,
        request: `Change request: ${instruction}`,
        tools: WEBSITE_EDIT_TOOLS,
        label: 'website edit',
        apply: (name, input) => {
          const result = applyWebsiteTool(content, name, input);
          if (result.content) content = result.content;
          return result;
        },
      });

      const reply = outcome.reply || (outcome.actions.length ? 'I made the changes you asked for.' : 'I could not make that change. Try describing it more specifically.');
      await recordChange(build, { request: instruction, reply, actions: outcome.actions, state: content });
      return res.json({ content, buildId: build.id, reply });
    }

    if (SITE_FORMAT === 'page') {
      const kit = await createBrandKit(brief);
      const { page } = await createPage({ briefText: `${brief}\n\n${randomCreativeBrief()}`, kitText: kitForPrompt(kit) });
      const content = cleanPageState({ ...page, images: {} });
      const reply = `Designed a new page for ${content.brand?.name || businessName}. Ask for changes below.`;
      const build = await openBuild({ userId: req.userId, kind: 'website', brief: { ...briefFields, kit }, state: content });
      await recordChange(build, { request: 'Built the website from the brief.', reply, actions: ['designed the page'], state: content });
      return res.json({ content, buildId: build.id, reply });
    }

    const kit = await createBrandKit(brief);
    const userMessage = `Plan and write the website for this business. Build a completely new website for it, designed from scratch.\n\n${randomCreativeBrief()}\n\nBrand kit:\n${kitForPrompt(kit)}\n\nBusiness brief:\n${brief}`;

    let content;
    let lastError;
    for (let attempt = 0; attempt < 2 && !content; attempt++) {
      const response = await getAnthropic().messages.create({
        model: 'claude-sonnet-5-5',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      logUsage(`website create attempt ${attempt + 1}`, response);
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

    const reply = `Built a new website for ${businessName}.`;
    const build = await openBuild({ userId: req.userId, kind: 'website', brief: { ...briefFields, kit }, state: content });
    await recordChange(build, { request: 'Built the website from the brief.', reply, actions: ['built the website'], state: content });
    res.json({ content, buildId: build.id, reply });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
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
    logUsage('proofread', response);
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
