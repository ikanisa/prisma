/**
 * Entry point for OpenAI Agent SDK wrapper.
 */
export * from "@openai/ai";

import { createAgent, createFunctionTools } from "@openai/ai";
import { getButtons } from "@easymo/wa-utils";
import { createClient } from "@supabase/supabase-js";

/**
 * Ask an OpenAI agent for the next action (template/text/call) based on phone & message.
 */
export async function askAgent(
  params: { phone: string; text: string }
): Promise<
  | { type: "TEMPLATE"; id: string; variables?: Record<string, any>; buttons?: any[] }
  | { type: "TEXT"; text: string; buttons?: any[] }
  | { type: "CALL"; fnName: string; args: any }
> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tools = createFunctionTools({
    supabase: async (fn: string, args: any) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    wa_getButtons: getButtons,
  });

  const agent = createAgent({
    assistantId: process.env.OPENAI_ASSISTANT_ID,
    tools,
  });

  const result = await agent.call({ input: params.text, memory: { phone: params.phone } });
  return result as any;
}
