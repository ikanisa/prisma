import OpenAI from "openai";
import type { Agent } from "./factory.js";
import { toolsToOpenAIFunctions, executeTool } from "../tools/index.js";

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

    // Convert agent tools to OpenAI function format
    const tools = toolsToOpenAIFunctions(agent.tools);

    // Call OpenAI with function calling enabled
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      tools: tools.length > 0 ? tools : undefined,
    });

    const response = completion.choices[0]?.message;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Handle tool calls if present
    const executedToolCalls: Array<{
      tool: string;
      input: unknown;
      output: unknown;
    }> = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        const result = await executeTool(toolName, toolArgs, {
          jurisdictionCode: options.metadata?.jurisdictionCode,
          userId: options.metadata?.userId,
          sessionId: options.metadata?.sessionId,
        });

        executedToolCalls.push({
          tool: toolName,
          input: toolArgs,
          output: result,
        });

        // Add tool result to messages
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Get final response with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const finalResponse = finalCompletion.choices[0]?.message;

      return {
        agentId: agent.id,
        output: finalResponse?.content || "[No response after tool execution]",
        toolCalls: executedToolCalls,
        metadata: {
          model: completion.model,
          usage: finalCompletion.usage,
          finishReason: finalCompletion.choices[0]?.finish_reason,
          toolCallsCount: executedToolCalls.length,
        },
      };
    }

    return {
      agentId: agent.id,
      output: response.content || "[No response]",
      toolCalls: undefined,
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
