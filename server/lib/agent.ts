import { OpenAI } from 'openai';
import { env } from '../utils/env';
import { tools, toolHandlers } from './tools';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Run the assistant for a given thread with a user prompt.
 * Executes function calls if require and returns final assistant message.
 */
export async function runAgent(thread_id: string, user_input: string) {
  // Initial prompt
  const systemMsg = {
    role: 'system' as const,
    content: 'You are a helpful WhatsApp assistant. Use the available tools when necessary.'
  };
  const userMsg = { role: 'user' as const, content: user_input };

  // First pass: ask GPT which action to take
  const initial = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [systemMsg, userMsg],
    functions: tools,
    function_call: 'auto'
  });
  let message = initial.choices[0].message;

  // If GPT called a function, execute it and pass result back
  if (message.function_call) {
    const fnName = message.function_call.name;
    const args = JSON.parse(message.function_call.arguments || '{}');
    const result = await toolHandlers[fnName](args);
    const functionMsg = {
      role: 'function' as const,
      name: fnName,
      content: JSON.stringify(result)
    };

    const followup = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemMsg, userMsg, message, functionMsg]
    });
    message = followup.choices[0].message;
  }

  return message;
}
