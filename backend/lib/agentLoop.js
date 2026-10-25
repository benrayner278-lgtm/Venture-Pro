const { getAnthropic } = require('./anthropic');

// Lets Claude finish with a message for the user. The loop stops when this tool is called.
const REPLY_TOOL = {
  name: 'reply_to_user',
  description: 'Send a short message to the user saying what you changed and why. Call this once, after the last change. Keep it to one or two plain sentences.',
  input_schema: {
    type: 'object',
    properties: { message: { type: 'string', description: 'A short plain-English summary of the changes.' } },
    required: ['message'],
  },
};

const MAX_STEPS = 8;

// Runs Claude with tools until it calls reply_to_user. `apply(name, input)` makes each change and returns
// { text, error, action }: `text` is what Claude sees back, `error` marks a failed call, and `action` is a short
// note about the change for the build history.
const runToolLoop = async ({ system, context, request, tools, apply, label }) => {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: request },
      ],
    },
  ];
  const actions = [];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let reply = '';
  let steps = 0;

  while (steps < MAX_STEPS && !reply) {
    steps += 1;
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4000,
      system,
      tools: [...tools, REPLY_TOOL],
      messages,
    });
    usage.input += response.usage?.input_tokens || 0;
    usage.output += response.usage?.output_tokens || 0;
    usage.cacheRead += response.usage?.cache_read_input_tokens || 0;
    usage.cacheWrite += response.usage?.cache_creation_input_tokens || 0;
    if (response.stop_reason === 'max_tokens') throw new Error('The AI response was cut off');

    const calls = response.content.filter((block) => block.type === 'tool_use');
    if (calls.length === 0) {
      reply = response.content.find((block) => block.type === 'text')?.text?.trim() || '';
      break;
    }

    messages.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const call of calls) {
      if (call.name === 'reply_to_user') {
        reply = String(call.input?.message || '').trim();
        continue;
      }
      const outcome = apply(call.name, call.input || {});
      if (outcome.action) actions.push(outcome.action);
      results.push({ type: 'tool_result', tool_use_id: call.id, content: outcome.text, is_error: Boolean(outcome.error) });
    }
    if (reply) break;
    messages.push({ role: 'user', content: results });
  }

  console.log(
    `Builder AI usage: ${label} steps=${steps} input=${usage.input} output=${usage.output} cacheRead=${usage.cacheRead} cacheWrite=${usage.cacheWrite}`,
  );
  return { reply, actions, steps };
};

module.exports = { runToolLoop };
