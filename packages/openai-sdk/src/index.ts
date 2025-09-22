import { OpenAI, type ChatCompletionMessageParam } from 'openai';
import type { ReplyButton } from '@easyMO/wa-utils';

import {
  createQr as paymentsCreateQr,
  processQrScan as paymentsProcessQrScan
} from '@easyMO/payments-sdk';

/**
 * Possible agent response types
 */
export type AgentResponse =
  | { type: 'TEMPLATE'; id: string; variables?: Record<string, any>; buttons?: ReplyButton[] }
  | { type: 'TEXT'; text: string; buttons?: ReplyButton[] }
  | { type: 'CALL'; fnName: string; args: any };

// ---------------------------------------------------------------------------
// Tool registration – payments.create_qr & payments.process_qr_scan
// ---------------------------------------------------------------------------

/**
 * JSON schema definitions for the payments-related tools that can be invoked
 * by the OpenAI assistant.  The schemas purposefully stay **very** small so
 * that the prompt footprint remains compact.
 */
const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'payments.create_qr',
      description:
        'Generate a MoMo QR payment for the user and return the QR image URL, USSD fallback string and payment reference.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'Internal user identifier' },
          amount: { type: 'number', description: 'Payment amount in the smallest currency unit' },
          currency: {
            type: 'string',
            description: 'ISO-4217 currency code (defaults to RWF)',
            enum: ['RWF', 'USD', 'EUR']
          }
        },
        required: ['user_id', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'payments.process_qr_scan',
      description:
        'Decode the scanned QR string and return the corresponding payment id so that its status can be looked up.',
      parameters: {
        type: 'object',
        properties: {
          scanned_data: { type: 'string', description: 'Raw data string obtained from the QR scanner' }
        },
        required: ['scanned_data']
      }
    }
  }
] as const;

export const registeredTools = toolDefinitions;

type ToolCallResult = Record<string, any>;

/** Mapping from tool name ➜ local implementation */
const toolHandlers: Record<string, (args: any) => Promise<ToolCallResult> | ToolCallResult> = {
  'payments.create_qr': ({ user_id, amount, currency }) =>
    paymentsCreateQr(user_id, amount, currency),
  'payments.process_qr_scan': ({ scanned_data }) => paymentsProcessQrScan({ scanned_data })
};

/**
 * Thin wrapper around OpenAI Assistant SDK for our WA agent.
 */
export async function askAgent(
  assistantId: string,
  userId: string,
  text: string
): Promise<AgentResponse> {
  const client = new OpenAI({});

  const messages: ChatCompletionMessageParam[] = [
    { role: 'user', content: text }
  ];

  // We perform **at most** one function call + one follow-up completion to
  // keep latency down.  More sophisticated multi-step orchestration can be
  // added later once the overall design is proven in production.

  // First round – allow tool calls
  const first = await client.chat.completions.create({
    model: assistantId,
    messages,
    tools: toolDefinitions as any,
    tool_choice: 'auto'
  });

  let msg = first.choices[0].message as any;

  // Handle a potential function/tool call
  if (msg.tool_calls?.length ?? 0) {
    const call = msg.tool_calls[0];
    const { name, arguments: argStr } = call.function;
    try {
      const args = JSON.parse(argStr ?? '{}');
      const handler = toolHandlers[name];
      if (handler) {
        const result = await handler(args);
        // push tool response
        messages.push(msg);
        messages.push({
          role: 'tool',
          name,
          content: JSON.stringify(result)
        } as any);

        // Second round – final assistant response
        const second = await client.chat.completions.create({
          model: assistantId,
          messages,
          tool_choice: 'none'
        });
        msg = second.choices[0].message;
      }
    } catch (err) {
      // If anything goes wrong we fall back to the original assistant message
      console.error('[openai-sdk] tool handler failed', err);
    }
  }

  // Map the assistant message back into the WA-agent response envelope.
  return { type: 'TEXT', text: msg.content ?? '' };
}
