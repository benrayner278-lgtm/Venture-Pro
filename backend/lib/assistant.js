// The account assistant. It can read the owner's sites and propose changes to them. It cannot change anything
// itself: a proposal is saved, and the owner approves it before it goes live (see controllers/assistantController.js).
const prisma = require('./prisma');
const { getAnthropic } = require('./anthropic');
const { WEBSITE_EDIT_TOOLS, applyWebsiteTool } = require('./websiteEdits');
const { runToolLoop } = require('./agentLoop');
const { revisePage } = require('./pageGenerator');
const { fillStockPhotos } = require('./stockPhotos');

const MODEL = 'claude-sonnet-5-5';
// The assistant remembers the conversation for seven days. A cap stops the stored history growing without limit.
const HISTORY_DAYS = 7;
const HISTORY_CAP = 200;
const MAX_STEPS = 6;
const SITE_JSON_LIMIT = 12000;

const SYSTEM = `You are the assistant inside Venture-Pro, helping a small business owner run their websites. Answer clearly and briefly, in British English. Use the tools to look at the owner's sites.
You cannot change a site directly. When the owner asks for a change, call propose_site_change with the site id and a clear description of the change. The change is saved as a proposal that the owner approves before it goes live, so tell them that in your reply. Never invent facts about the business, its prices, reviews or clients.`;

const EDIT_SYSTEM = `You change one website for a small business. You are given the current website as JSON. Make the change the owner asked for and nothing else. Keep the design unless asked to change it. Call reply_to_user with one or two plain sentences saying what you changed.`;

const TOOLS = [
  {
    name: 'list_sites',
    description: "List the owner's websites with their ids, titles and addresses.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'read_site',
    description: "Read one website's content as JSON: its brand, sections and navigation.",
    input_schema: { type: 'object', properties: { siteId: { type: 'string' } }, required: ['siteId'] },
  },
  {
    name: 'propose_site_change',
    description: 'Propose a change to one website. Describe the change in plain words. Nothing changes until the owner approves it.',
    input_schema: {
      type: 'object',
      properties: { siteId: { type: 'string' }, instruction: { type: 'string' } },
      required: ['siteId', 'instruction'],
    },
  },
];

const ownedSite = (userId, siteId) => prisma.site.findFirst({ where: { id: String(siteId || ''), userId } });

// Compares content without the design key, which is recalculated each time a site is saved.
const contentKey = (content) => JSON.stringify({ ...(content || {}), design: undefined });

const saveProposal = async (userId, site, working, summary) => {
  const proposal = await prisma.assistantProposal.create({
    data: { userId, siteId: site.id, summary, before: site.content, after: working },
  });
  return `Saved proposal ${proposal.id} for "${site.title}": ${summary}. The owner must approve it before it goes live.`;
};

// Page-format sites (a whole page written by the website builder) are changed the same way the builder changes them.
const proposePageChange = async (userId, site, instruction) => {
  const current = JSON.parse(JSON.stringify(site.content));
  const images = Object.keys(current.images || {}).map((key) => ({ key, label: 'uploaded photo' }));
  const { page } = await revisePage({
    current,
    instruction,
    briefText: `Business: ${site.title}`,
    kitText: 'Not recorded.',
    history: 'None.',
    images,
  });
  const stock = await fillStockPhotos(page.body, current.stock);
  // The owner's contact details, portfolio, style and photos are kept unless the page itself changes them.
  const working = { ...current, ...page, format: 'page', stock, images: current.images, contact: current.contact, portfolio: current.portfolio, style: current.style };
  if (contentKey(working) === contentKey(site.content)) return 'No change was made. Ask for a more specific change.';
  return saveProposal(userId, site, working, `Updated the page: ${instruction}`);
};

// Runs the section tools on a copy of the site, and saves the result as a proposal for the owner to approve.
const proposeChange = async (userId, site, instruction) => {
  if (site.content?.format === 'page') return proposePageChange(userId, site, instruction);
  let working = JSON.parse(JSON.stringify(site.content));
  const outcome = await runToolLoop({
    system: EDIT_SYSTEM,
    context: `Current website as JSON:\n${JSON.stringify(site.content)}`,
    request: `Change request: ${instruction}`,
    tools: WEBSITE_EDIT_TOOLS,
    label: 'assistant site change',
    apply: (name, input) => {
      const result = applyWebsiteTool(working, name, input);
      if (result.content) working = result.content;
      return result;
    },
  });
  if (outcome.actions.length === 0) {
    return `No change was made. ${outcome.reply || 'Ask for a more specific change.'}`;
  }
  if (contentKey(working) === contentKey(site.content)) return 'No change was made. Ask for a more specific change.';

  return saveProposal(userId, site, working, outcome.reply || outcome.actions.join('; '));
};

const runTool = async (userId, name, input) => {
  if (name === 'list_sites') {
    const sites = await prisma.site.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, slug: true, content: true } });
    if (sites.length === 0) return 'This account has no websites yet.';
    return JSON.stringify(sites.map((site) => ({ id: site.id, title: site.title, address: `${site.slug}.venture-pro.io`, format: site.content?.format || 'sections' })));
  }
  const site = await ownedSite(userId, input.siteId);
  if (!site) return 'No website with that id belongs to this account.';
  if (name === 'read_site') return JSON.stringify(site.content).slice(0, SITE_JSON_LIMIT);
  if (name === 'propose_site_change') return proposeChange(userId, site, String(input.instruction || '').slice(0, 1000));
  return 'Unknown tool.';
};

// Turns the message and its prepared files into content for Claude. Photos and PDFs are sent as they are; other files as text.
const contentFor = (message, attachments) => {
  if (!attachments.length) return message;
  const blocks = [];
  for (const file of attachments) {
    if (file.kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: file.data } });
    } else if (file.kind === 'pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } });
    } else {
      blocks.push({ type: 'text', text: `File "${file.name}":\n${file.text}` });
    }
  }
  blocks.push({ type: 'text', text: message || 'Please look at the attached file(s).' });
  return blocks;
};

// Answers one message. `history` is the earlier conversation as plain text turns. `attachments` are files the owner
// attached, prepared by lib/fileText.js: { name, kind, type, data, text }.
const runTurn = async ({ userId, message, history, attachments = [] }) => {
  const messages = [...history.map((turn) => ({ role: turn.role, content: turn.text })), { role: 'user', content: contentFor(message, attachments) }];
  let reply = '';

  for (let step = 0; step < MAX_STEPS && !reply; step++) {
    const response = await getAnthropic().messages.create({ model: MODEL, max_tokens: 4000, system: SYSTEM, tools: TOOLS, messages });
    messages.push({ role: 'assistant', content: response.content });

    const calls = response.content.filter((block) => block.type === 'tool_use');
    if (calls.length === 0) {
      reply = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim();
      break;
    }
    const results = [];
    for (const call of calls) {
      let text;
      try {
        text = await runTool(userId, call.name, call.input || {});
      } catch (error) {
        console.error(`Assistant tool ${call.name} failed:`, error.message);
        text = 'That step failed. Tell the owner and ask them to try again.';
      }
      results.push({ type: 'tool_result', tool_use_id: call.id, content: text });
    }
    messages.push({ role: 'user', content: results });
  }

  return reply || 'I could not finish that. Try asking for one change at a time.';
};

module.exports = { runTurn, contentKey, HISTORY_DAYS, HISTORY_CAP };
