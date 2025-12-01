import OpenAI from "openai";
import type { Agent } from "./factory.js";

export type RunOptions = {
  input: string;
  metadata?: {
    jurisdictionCode?: string;
    userId?: string;
    sessionId?: string;
  };
};

export type RunResult = {
  agentId: string;
  output: string;
  toolCalls?: Array<{
    tool: string;
    input: unknown;
    output: unknown;
  }>;
  metadata?: Record<string, unknown>;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Run an OpenAI agent with the given input
 * Uses GPT-4 with function calling for tool integration
 */
export async function runOpenAIAgent(
  agent: Agent,
  options: RunOptions
): Promise<RunResult> {
  try {
    // Build messages with agent instructions and user input
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: agent.instructions,
      },
      {
        role: "user",
        content: options.input,
      },
    ];

    // Add jurisdiction context if provided
    if (options.metadata?.jurisdictionCode) {
      messages.splice(1, 0, {
        role: "system",
        content: `Context: User is operating in jurisdiction: ${options.metadata.jurisdictionCode}`,
      });
    }

    // Call OpenAI with function calling enabled
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      // Tools will be added here when tool executors are implemented
      // tools: agent.tools.map(tool => toolToOpenAIFunction(tool)),
    });

    const response = completion.choices[0]?.message;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Extract tool calls if any
    const toolCalls = response.tool_calls?.map((call) => ({
      tool: call.function.name,
      input: JSON.parse(call.function.arguments),
      output: null, // Would be populated after tool execution
    }));

    return {
      agentId: agent.id,
      output: response.content || "[No response]",
      toolCalls,
      metadata: {
        model: completion.model,
        usage: completion.usage,
        finishReason: completion.choices[0]?.finish_reason,
      },
    };
  } catch (error) {
    console.error(`OpenAI agent execution failed for ${agent.id}:`, error);
    throw new Error(
      `Agent execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
