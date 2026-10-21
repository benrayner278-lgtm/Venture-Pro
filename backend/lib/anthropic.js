const Anthropic = require('@anthropic-ai/sdk');

// Lazily create the Anthropic client so the server can boot without a key
let client;
const getAnthropic = () => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
};
module.exports = { getAnthropic };
