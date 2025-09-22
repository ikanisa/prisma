import { runAgent as invokeAgent } from '../lib/agent';

/**
 * Wrapper to invoke the OpenAI Assistant agent for a thread.
 * Returns the assistant response message.
 */
export async function openaiAgent(thread_id: string, text: string) {
  const message = await invokeAgent(thread_id, text);
  return message;
}
