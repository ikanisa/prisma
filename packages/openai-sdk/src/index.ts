import { OpenAI, ChatCompletionResponseMessage } from 'openai';
import type { ReplyButton } from '@easyMO/wa-utils';

/**
 * Possible agent response types
 */
export type AgentResponse =
  | { type: 'TEMPLATE'; id: string; variables?: Record<string, any>; buttons?: ReplyButton[] }
  | { type: 'TEXT'; text: string; buttons?: ReplyButton[] }
  | { type: 'CALL'; fnName: string; args: any };

/**
 * Thin wrapper around OpenAI Assistant SDK for our WA agent.
 */
export async function askAgent(
  assistantId: string,
  phone: string,
  text: string
): Promise<AgentResponse> {
  const client = new OpenAI({});
  // TODO: implement function-calling with supabase.query & wa.getButtons tools
  const res = await client.chat.completions.create({
    model: assistantId,
    messages: [{ role: 'user', content: text }]
  });
  const msg: ChatCompletionResponseMessage = res.choices[0].message;
  // Simplest fallback
  return { type: 'TEXT', text: msg.content ?? '' };
}
