const prisma = require('../lib/prisma');
const { runTurn, contentKey, ATTACHMENT_TYPES, HISTORY_DAYS, HISTORY_CAP } = require('../lib/assistant');
const { saveSiteContent } = require('./sitesController');

const MESSAGE_LIMIT = 2000;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BASE64 = 9 * 1024 * 1024;
const NAME_LIMIT = 120;

// Checks the files the owner attached. Returns the cleaned list, or an error message.
const cleanAttachments = (input) => {
  if (input === undefined || input === null) return { files: [] };
  if (!Array.isArray(input) || input.length > MAX_FILES) return { error: `Attach up to ${MAX_FILES} files at a time` };
  let total = 0;
  const files = [];
  for (const file of input) {
    if (!file || typeof file.data !== 'string' || typeof file.type !== 'string') return { error: 'One of the files could not be read. Please attach it again' };
    if (!ATTACHMENT_TYPES.has(file.type)) return { error: 'The assistant can read photos, PDFs and plain text files (.txt, .md, .csv, .json)' };
    if (file.data.length > MAX_FILE_BYTES * 4 / 3) return { error: 'Each file must be 3 MB or smaller' };
    total += file.data.length;
    files.push({ name: String(file.name || 'file').slice(0, NAME_LIMIT), type: file.type, data: file.data });
  }
  if (total > MAX_TOTAL_BASE64) return { error: 'The files together must be 9 MB or smaller' };
  return { files };
};

// The messages from the last seven days, oldest first.
const storedMessages = (thread) => {
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return messages.filter((turn) => Date.parse(turn.at) >= cutoff).slice(-HISTORY_CAP);
};

// The owner talks to the assistant. Its answer may include proposals waiting for approval.
const postMessage = async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const { files, error } = cleanAttachments(req.body?.attachments);
    if (error) return res.status(400).json({ error });
    if ((!message && files.length === 0) || message.length > MESSAGE_LIMIT) {
      return res.status(400).json({ error: `Write a message of up to ${MESSAGE_LIMIT} characters, or attach a file` });
    }
    const userId = req.userId;
    const thread = await prisma.assistantThread.findUnique({ where: { userId } });
    const history = storedMessages(thread);
    const startedAt = new Date();

    const reply = await runTurn({ userId, message, history, attachments: files });

    // The conversation keeps the names of attached files, not their contents.
    const note = files.length ? `${message ? ' ' : ''}[Attached: ${files.map((file) => file.name).join(', ')}]` : '';
    const now = new Date().toISOString();
    const messages = [...history, { role: 'user', text: `${message}${note}`, at: now }, { role: 'assistant', text: reply, at: now }].slice(-HISTORY_CAP);
    await prisma.assistantThread.upsert({
      where: { userId },
      create: { userId, messages },
      update: { messages },
    });

    const proposals = await prisma.assistantProposal.findMany({
      where: { userId, status: 'pending', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, siteId: true, summary: true },
    });
    res.json({ reply, proposals });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('Assistant message error:', error);
    res.status(500).json({ error: 'The assistant could not answer. Please try again.' });
  }
};

const getThread = async (req, res) => {
  try {
    const thread = await prisma.assistantThread.findUnique({ where: { userId: req.userId } });
    res.json({ messages: storedMessages(thread) });
  } catch (error) {
    console.error('Assistant thread error:', error);
    res.status(500).json({ error: 'Could not load the conversation' });
  }
};

// Proposals waiting for a decision, plus the last few decided ones so the owner can undo a recent change.
const listProposals = async (req, res) => {
  try {
    const proposals = await prisma.assistantProposal.findMany({
      where: { userId: req.userId, OR: [{ status: 'pending' }, { status: 'applied' }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, siteId: true, summary: true, status: true, createdAt: true },
    });
    const sites = await prisma.site.findMany({ where: { userId: req.userId }, select: { id: true, title: true } });
    const titles = Object.fromEntries(sites.map((site) => [site.id, site.title]));
    res.json({ proposals: proposals.map((proposal) => ({ ...proposal, siteTitle: titles[proposal.siteId] || 'Website' })) });
  } catch (error) {
    console.error('List proposals error:', error);
    res.status(500).json({ error: 'Could not load the proposals' });
  }
};

// Loads a proposal that belongs to the caller and is in one of the allowed states.
const loadProposal = async (req, res, allowed) => {
  const proposal = await prisma.assistantProposal.findUnique({ where: { id: req.params.id } });
  if (!proposal || proposal.userId !== req.userId) {
    res.status(404).json({ error: 'Proposal not found' });
    return null;
  }
  if (!allowed.includes(proposal.status)) {
    res.status(409).json({ error: `This change is already ${proposal.status}` });
    return null;
  }
  return proposal;
};

// Applies a proposal, but only if the site has not changed since it was proposed.
const applyTo = async (req, res, proposal, content, nextStatus) => {
  const site = await prisma.site.findFirst({ where: { id: proposal.siteId, userId: req.userId } });
  if (!site) {
    res.status(404).json({ error: 'That website no longer exists' });
    return;
  }
  const expected = nextStatus === 'applied' ? proposal.before : proposal.after;
  if (contentKey(site.content) !== contentKey(expected)) {
    res.status(409).json({ error: 'The website has changed since this was proposed. Ask the assistant again.' });
    return;
  }
  const result = await saveSiteContent(site, content, { themeId: site.themeId, shuffle: site.shuffle });
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  await prisma.assistantProposal.update({ where: { id: proposal.id }, data: { status: nextStatus, decidedAt: new Date() } });
  res.json({ ok: true, status: nextStatus, url: `https://${result.site.slug}.venture-pro.io` });
};

const approveProposal = async (req, res) => {
  try {
    const proposal = await loadProposal(req, res, ['pending']);
    if (!proposal) return;
    await applyTo(req, res, proposal, proposal.after, 'applied');
  } catch (error) {
    console.error('Approve proposal error:', error);
    res.status(500).json({ error: 'Could not apply the change' });
  }
};

const rejectProposal = async (req, res) => {
  try {
    const proposal = await loadProposal(req, res, ['pending']);
    if (!proposal) return;
    await prisma.assistantProposal.update({ where: { id: proposal.id }, data: { status: 'rejected', decidedAt: new Date() } });
    res.json({ ok: true, status: 'rejected' });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({ error: 'Could not reject the change' });
  }
};

// Puts the site back the way it was before an applied change.
const undoProposal = async (req, res) => {
  try {
    const proposal = await loadProposal(req, res, ['applied']);
    if (!proposal) return;
    await applyTo(req, res, proposal, proposal.before, 'undone');
  } catch (error) {
    console.error('Undo proposal error:', error);
    res.status(500).json({ error: 'Could not undo the change' });
  }
};

module.exports = { postMessage, getThread, listProposals, approveProposal, rejectProposal, undoProposal };
