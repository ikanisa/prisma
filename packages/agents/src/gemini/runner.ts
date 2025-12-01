import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiAgentConfig } from "./factory.js";

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
    
    const model = genAI.getGenerativeModel({
      model: modelName,
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
    const text = response.text();

    // Extract function calls if present
    const functionCalls = response.functionCalls();
    const toolCalls = functionCalls?.map((call) => ({
      tool: call.name,
      input: call.args,
      output: null, // Would be populated after tool execution
    }));

    return {
      agentId: config.entry.id,
      output: text || "[No response]",
      toolCalls,
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

/**
 * Execute a Gemini tool call
 * This integrates with actual tool implementations (DeepSearch, Supabase, etc.)
 */
export async function executeGeminiToolCall(params: {
  name: string;
  args: Record<string, unknown>;
}): Promise<{
  functionResponseName: string;
  response: unknown;
}> {
  try {
    // Tool execution will be implemented when tool executors are ready
    // For now, return a structured response
    console.log(`Executing tool: ${params.name} with args:`, params.args);

    // TODO: Route to actual tool implementations:
    // - semantic_supabase_search -> Supabase semantic search
    // - keyword_supabase_search -> Supabase keyword search
    // - deepsearch -> RAG service DeepSearch
    // - calculator -> Safe math evaluation

    return {
      functionResponseName: params.name,
      response: {
        status: "pending_implementation",
        message: `Tool ${params.name} ready for integration`,
        args: params.args,
      },
    };
  } catch (error) {
    console.error(`Tool execution failed for ${params.name}:`, error);
    return {
      functionResponseName: params.name,
      response: {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
