const prisma = require('./prisma');

const HISTORY_LIMIT = 20;
const HISTORY_IN_PROMPT = 12;

// Errors the app raises on purpose are marked expose, so their status and message can reach the browser.
const forbidden = () => Object.assign(new Error('Forbidden'), { status: 403, expose: true });

// Opens the build the browser is working on, or starts a new one. When the browser sends its version of the
// logo or site, that version becomes the current state, so edits made by hand are kept.
const openBuild = async ({ userId, kind, buildId, brief, state }) => {
  const existing = buildId ? await prisma.builderProject.findUnique({ where: { id: buildId } }) : null;
  if (existing && existing.userId !== userId) throw forbidden();
  if (existing && existing.kind === kind) {
    return state === undefined
      ? existing
      : prisma.builderProject.update({ where: { id: existing.id }, data: { state } });
  }
  return prisma.builderProject.create({ data: { userId, kind, brief: brief || {}, state: state || {} } });
};

// What the AI should know about earlier requests on this build, oldest first.
const historyForPrompt = (build) => {
  const history = Array.isArray(build.history) ? build.history.slice(-HISTORY_IN_PROMPT) : [];
  if (history.length === 0) return 'No earlier requests on this build.';
  return history
    .map((entry, index) => {
      const changes = entry.actions?.length ? ` (changes: ${entry.actions.join('; ')})` : '';
      return `${index + 1}. Request: ${entry.request}\n   Result: ${entry.reply}${changes}`;
    })
    .join('\n');
};

// Adds one request and its result to the history, and saves the new state.
const recordChange = (build, { request, reply, actions, state }) => {
  const history = [
    ...(Array.isArray(build.history) ? build.history : []),
    { request, reply, actions, at: new Date().toISOString() },
  ].slice(-HISTORY_LIMIT);
  return prisma.builderProject.update({ where: { id: build.id }, data: { state, history } });
};

module.exports = { openBuild, historyForPrompt, recordChange, forbidden };
