const Anthropic = require('@anthropic-ai/sdk');

// Lazily create the Anthropic client so the server can boot without a key
let client;
const getAnthropic = () => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    // Keys that are not scoped to a workspace need the workspace ID on every request.
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}),
    });
  }
  return client;
};
module.exports = { getAnthropic };
