const prisma = require('./prisma');

// Logs the token counts of one Claude call, and saves them to the ai_usage table so costs can be totalled per action.
// The save runs in the background and never fails or slows the request that made the call.
const logUsage = (label, response, userId) => {
  const usage = response?.usage || {};
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  console.log(`Builder AI usage: ${label} input=${input} output=${output} cacheRead=${cacheRead} cacheWrite=${cacheWrite}`);

  if (!response) return;
  prisma.aiUsage
    .create({
      data: {
        userId: userId || null,
        action: String(label).slice(0, 100),
        model: String(response.model || 'unknown').slice(0, 100),
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
      },
    })
    .catch((error) => console.error('Could not save AI usage:', error.message));
};

module.exports = { logUsage };
