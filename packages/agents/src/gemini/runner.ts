import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiAgentConfig } from "./factory.js";
import { toolsToGeminiFunctions, executeTool } from "../tools/index.js";

export type GeminiRunOptions = {
  input: string;
  metadata?: {
    jurisdictionCode?: string;
    userId?: string;
    sessionId?: string;
  };
};

export type GeminiRunResult = {
  agentId: string;
  output: string;
  toolCalls?: Array<{
    tool: string;
    input: unknown;
    output: unknown;
  }>;
  metadata?: Record<string, unknown>;
};

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Run a Gemini agent with the given input
 * Uses Gemini 1.5 Pro with function calling
 */
export async function runGeminiAgent(
  config: GeminiAgentConfig,
  options: GeminiRunOptions
): Promise<GeminiRunResult> {
  try {
    // Use gemini-1.5-pro as default (more stable quota)
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";

    // Convert agent tools to Gemini function declarations
    const tools = toolsToGeminiFunctions(config.tools);

    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    });

    // Build prompt with system instructions and user input
    let prompt = config.systemPrompt;

    // Add jurisdiction context if provided
    if (options.metadata?.jurisdictionCode) {
      prompt += `\n\nContext: User is operating in jurisdiction: ${options.metadata.jurisdictionCode}`;
    }

    prompt += `\n\nUser Question: ${options.input}`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      // Execute function calls
      const executedToolCalls: Array<{
        tool: string;
        input: unknown;
        output: unknown;
      }> = [];

      for (const call of functionCalls) {
        const toolResult = await executeTool(call.name, call.args, {
          jurisdictionCode: options.metadata?.jurisdictionCode,
          userId: options.metadata?.userId,
          sessionId: options.metadata?.sessionId,
        });

        executedToolCalls.push({
          tool: call.name,
          input: call.args,
          output: toolResult,
        });
      }

      // Continue conversation with function results
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
          {
            role: "model",
            parts: response.candidates?.[0]?.content?.parts || [],
          },
        ],
      });

      // Send function responses
      const functionResponseParts = executedToolCalls.map((tc) => ({
        functionResponse: {
          name: tc.tool,
          response: tc.output,
        },
      }));

      const finalResult = await chat.sendMessage(functionResponseParts);
      const finalText = finalResult.response.text();

      return {
        agentId: config.entry.id,
        output: finalText || "[No response after tool execution]",
        toolCalls: executedToolCalls,
        metadata: {
          model: modelName,
          candidates: finalResult.response.candidates?.length || 0,
          usageMetadata: finalResult.response.usageMetadata,
          toolCallsCount: executedToolCalls.length,
        },
      };
    }

    // No function calls - return direct response
    const text = response.text();

    return {
      agentId: config.entry.id,
      output: text || "[No response]",
      toolCalls: undefined,
      metadata: {
        model: modelName,
        candidates: response.candidates?.length || 0,
        usageMetadata: response.usageMetadata,
      },
    };
  } catch (error) {
    console.error(`Gemini agent execution failed for ${config.entry.id}:`, error);

    // Check for quota errors and provide helpful message
    if (error instanceof Error && error.message.includes("quota")) {
      throw new Error(
        `Gemini API quota exceeded. Please check your API key quota at https://ai.dev/usage. Error: ${error.message}`
      );
    }

    throw new Error(
      `Agent execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
