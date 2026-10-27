// Logs the token counts of one Claude call, in the same format as the builder loop, so costs can be totalled from the logs.
const logUsage = (label, response) => {
  const usage = response?.usage || {};
  console.log(
    `Builder AI usage: ${label} input=${usage.input_tokens || 0} output=${usage.output_tokens || 0} cacheRead=${usage.cache_read_input_tokens || 0} cacheWrite=${usage.cache_creation_input_tokens || 0}`,
  );
};

module.exports = { logUsage };
