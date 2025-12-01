import type { Tool } from "./types.js";
import { deepsearchTool } from "./deepsearch.js";
import { semanticSearchTool, keywordSearchTool } from "./supabase-search.js";
import { calculatorTool } from "./calculator.js";

/**
 * Registry of all available tools
 */
export const toolRegistry: Record<string, Tool> = {
  deepsearch: deepsearchTool,
  supabase_semantic_search: semanticSearchTool,
  supabase_keyword_search: keywordSearchTool,
  calculator: calculatorTool,
};

/**
 * Get tool by name
 */
export function getTool(name: string): Tool | undefined {
  return toolRegistry[name];
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  params: unknown,
  context?: Parameters<Tool["execute"]>[1]
) {
  const tool = getTool(name);
  if (!tool) {
    return {
      success: false,
      error: `Tool '${name}' not found`,
    };
  }

  return tool.execute(params, context);
}

/**
 * Convert tools to OpenAI function calling format
 */
export function toolsToOpenAIFunctions(toolNames: string[]) {
  return toolNames
    .map((name) => {
      const tool = getTool(name);
      if (!tool) return null;

      // Map tool names to OpenAI function schemas
      switch (name) {
        case "deepsearch":
          return {
            type: "function" as const,
            function: {
              name: "deepsearch",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query for the knowledge base",
                  },
                  topK: {
                    type: "number",
                    description: "Number of results to return (default: 5)",
                  },
                  filters: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        description: "Filter by category (tax, audit, accounting, corporate)",
                      },
                      jurisdiction: {
                        type: "string",
                        description: "Filter by jurisdiction code (e.g., MT, RW, GLOBAL)",
                      },
                    },
                  },
                },
                required: ["query"],
              },
            },
          };

        case "supabase_semantic_search":
          return {
            type: "function" as const,
            function: {
              name: "supabase_semantic_search",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Semantic search query",
                  },
                  topK: {
                    type: "number",
                    description: "Number of results (default: 5)",
                  },
                  categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filter by categories",
                  },
                },
                required: ["query"],
              },
            },
          };

        case "supabase_keyword_search":
          return {
            type: "function" as const,
            function: {
              name: "supabase_keyword_search",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Keyword search query",
                  },
                  limit: {
                    type: "number",
                    description: "Max results (default: 10)",
                  },
                  categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filter by categories",
                  },
                },
                required: ["query"],
              },
            },
          };

        case "calculator":
          return {
            type: "function" as const,
            function: {
              name: "calculator",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  expression: {
                    type: "string",
                    description:
                      "Mathematical expression to evaluate (e.g., '(100000 * 0.35) + 5000')",
                  },
                  context: {
                    type: "object",
                    properties: {
                      variables: {
                        type: "object",
                        description: "Variables to substitute in the expression",
                      },
                    },
                  },
                },
                required: ["expression"],
              },
            },
          };

        default:
          return null;
      }
    })
    .filter((fn) => fn !== null);
}

/**
 * Convert tools to Gemini function declarations
 */
export function toolsToGeminiFunctions(toolNames: string[]) {
  return toolNames
    .map((name) => {
      const tool = getTool(name);
      if (!tool) return null;

      // Map tool names to Gemini function declarations
      switch (name) {
        case "deepsearch":
          return {
            name: "deepsearch",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                query: {
                  type: "STRING" as const,
                  description: "Search query for the knowledge base",
                },
                topK: {
                  type: "NUMBER" as const,
                  description: "Number of results to return (default: 5)",
                },
                filters: {
                  type: "OBJECT" as const,
                  properties: {
                    category: {
                      type: "STRING" as const,
                      description: "Filter by category",
                    },
                    jurisdiction: {
                      type: "STRING" as const,
                      description: "Filter by jurisdiction code",
                    },
                  },
                },
              },
              required: ["query"],
            },
          };

        case "supabase_semantic_search":
          return {
            name: "supabase_semantic_search",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                query: {
                  type: "STRING" as const,
                  description: "Semantic search query",
                },
                topK: {
                  type: "NUMBER" as const,
                  description: "Number of results",
                },
                categories: {
                  type: "ARRAY" as const,
                  items: { type: "STRING" as const },
                  description: "Filter by categories",
                },
              },
              required: ["query"],
            },
          };

        case "supabase_keyword_search":
          return {
            name: "supabase_keyword_search",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                query: {
                  type: "STRING" as const,
                  description: "Keyword search query",
                },
                limit: {
                  type: "NUMBER" as const,
                  description: "Max results",
                },
                categories: {
                  type: "ARRAY" as const,
                  items: { type: "STRING" as const },
                  description: "Filter by categories",
                },
              },
              required: ["query"],
            },
          };

        case "calculator":
          return {
            name: "calculator",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                expression: {
                  type: "STRING" as const,
                  description: "Mathematical expression to evaluate",
                },
                context: {
                  type: "OBJECT" as const,
                  properties: {
                    variables: {
                      type: "OBJECT" as const,
                      description: "Variables to substitute",
                    },
                  },
                },
              },
              required: ["expression"],
            },
          };

        default:
          return null;
      }
    })
    .filter((fn) => fn !== null);
}
