import type { Tool } from "./types.js";
import { deepsearchTool } from "./deepsearch.js";
import { semanticSearchTool, keywordSearchTool } from "./supabase-search.js";
import { calculatorTool } from "./calculator.js";
import { computeVatReturnTool } from "./compute-vat-tool.js";
import { computeIncomeTaxTool } from "./compute-income-tax-tool.js";
import { computeWithholdingTaxTool } from "./compute-withholding-tax-tool.js";
import { createAgentMessage, agentMessageBus } from "../core/agent-message-bus.js";
import { validateDeterministicManifest, type DeterministicManifest } from "./deterministic-manifest.js";

/**
 * Registry of all available tools
 */
export const toolRegistry: Record<string, Tool> = {
  deepsearch: deepsearchTool,
  supabase_semantic_search: semanticSearchTool,
  supabase_keyword_search: keywordSearchTool,
  calculator: calculatorTool,
  compute_vat_return: computeVatReturnTool,
  compute_income_tax: computeIncomeTaxTool,
  compute_withholding_tax: computeWithholdingTaxTool,
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

  const result = await tool.execute(params, context);

  if (tool.requiresManifest) {
    const manifest =
      result.metadata && "manifest" in result.metadata
        ? (result.metadata.manifest as DeterministicManifest | undefined)
        : undefined;
    const validation = validateDeterministicManifest(manifest);

    if (!validation.valid) {
      result.metadata = {
        ...(result.metadata ?? {}),
        manifestMissing: true,
        manifestError: validation.reason,
        manifestComputedHash: validation.computedHash ?? null,
      };

      await agentMessageBus.publish(
        createAgentMessage({
          agentId: tool.name,
          taskType: "AUTONOMY_ALERT",
          context: {
            clientId: context?.userId ?? "unknown",
            fiscalYear: String(new Date().getFullYear()),
            jurisdiction: context?.jurisdictionCode,
          },
          data: {
            tool: tool.name,
            reason: validation.reason,
          },
          priority: "HIGH",
          autonomyLevel: "HUMAN_REVIEW",
          traceId: context?.sessionId,
          correlationId: context?.sessionId,
        })
      );
    }
  }

  return result;
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

        case "compute_vat_return":
          return {
            type: "function" as const,
            function: {
              name: "compute_vat_return",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  jurisdiction: {
                    type: "string",
                    description: "Jurisdiction code (e.g., MT, RW, CA)",
                  },
                  period: {
                    type: "object",
                    properties: {
                      start: { type: "string", description: "Period start date (YYYY-MM-DD)" },
                      end: { type: "string", description: "Period end date (YYYY-MM-DD)" },
                    },
                    required: ["start", "end"],
                  },
                  evidenceIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "Evidence document IDs supporting the computation",
                  },
                  sales: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        grossAmount: { type: "number" },
                        vatRate: { type: "number" },
                        isExempt: { type: "boolean" },
                      },
                      required: ["description", "grossAmount", "vatRate"],
                    },
                  },
                  purchases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        grossAmount: { type: "number" },
                        vatRate: { type: "number" },
                        isDeductible: { type: "boolean" },
                      },
                      required: ["description", "grossAmount", "vatRate"],
                    },
                  },
                  adjustments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        amount: { type: "number" },
                        isOutput: { type: "boolean" },
                      },
                      required: ["type", "amount", "isOutput"],
                    },
                  },
                },
                required: ["jurisdiction", "period", "sales", "purchases"],
              },
            },
          };

        case "compute_income_tax":
          return {
            type: "function" as const,
            function: {
              name: "compute_income_tax",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  jurisdiction: {
                    type: "string",
                    description: "Jurisdiction code (e.g., MT, RW, CA)",
                  },
                  taxYear: {
                    type: "number",
                    description: "Tax year (YYYY)",
                  },
                  taxableIncome: {
                    type: "number",
                    description: "Taxable income before adjustments",
                  },
                  adjustments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        amount: { type: "number" },
                        type: { type: "string", enum: ["add", "deduct"] },
                      },
                      required: ["description", "amount", "type"],
                    },
                  },
                  credits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        amount: { type: "number" },
                        refundable: { type: "boolean" },
                      },
                      required: ["description", "amount"],
                    },
                  },
                  rateOverride: {
                    type: "number",
                    description: "Override corporate tax rate as decimal (e.g., 0.3)",
                  },
                  evidenceIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["jurisdiction", "taxYear", "taxableIncome"],
              },
            },
          };

        case "compute_withholding_tax":
          return {
            type: "function" as const,
            function: {
              name: "compute_withholding_tax",
              description: tool.description,
              parameters: {
                type: "object",
                properties: {
                  jurisdiction: {
                    type: "string",
                    description: "Jurisdiction code (e.g., MT, RW, CA)",
                  },
                  paymentType: {
                    type: "string",
                    description: "Payment type (dividends, interest, royalties, services, fees)",
                  },
                  grossAmount: {
                    type: "number",
                    description: "Gross payment amount",
                  },
                  domesticRate: {
                    type: "number",
                    description: "Domestic withholding rate (decimal)",
                  },
                  treatyRate: {
                    type: "number",
                    description: "Treaty withholding rate (decimal)",
                  },
                  applyTreaty: {
                    type: "boolean",
                    description: "Apply treaty rate if provided",
                  },
                  evidenceIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["jurisdiction", "paymentType", "grossAmount"],
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

        case "compute_vat_return":
          return {
            name: "compute_vat_return",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                jurisdiction: {
                  type: "STRING" as const,
                  description: "Jurisdiction code (e.g., MT, RW, CA)",
                },
                period: {
                  type: "OBJECT" as const,
                  properties: {
                    start: { type: "STRING" as const, description: "Period start date (YYYY-MM-DD)" },
                    end: { type: "STRING" as const, description: "Period end date (YYYY-MM-DD)" },
                  },
                  required: ["start", "end"],
                },
                evidenceIds: {
                  type: "ARRAY" as const,
                  items: { type: "STRING" as const },
                  description: "Evidence document IDs supporting the computation",
                },
                sales: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      description: { type: "STRING" as const },
                      grossAmount: { type: "NUMBER" as const },
                      vatRate: { type: "NUMBER" as const },
                      isExempt: { type: "BOOLEAN" as const },
                    },
                    required: ["description", "grossAmount", "vatRate"],
                  },
                },
                purchases: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      description: { type: "STRING" as const },
                      grossAmount: { type: "NUMBER" as const },
                      vatRate: { type: "NUMBER" as const },
                      isDeductible: { type: "BOOLEAN" as const },
                    },
                    required: ["description", "grossAmount", "vatRate"],
                  },
                },
                adjustments: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      type: { type: "STRING" as const },
                      amount: { type: "NUMBER" as const },
                      isOutput: { type: "BOOLEAN" as const },
                    },
                    required: ["type", "amount", "isOutput"],
                  },
                },
              },
              required: ["jurisdiction", "period", "sales", "purchases"],
            },
          };

        case "compute_income_tax":
          return {
            name: "compute_income_tax",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                jurisdiction: {
                  type: "STRING" as const,
                  description: "Jurisdiction code (e.g., MT, RW, CA)",
                },
                taxYear: {
                  type: "NUMBER" as const,
                  description: "Tax year (YYYY)",
                },
                taxableIncome: {
                  type: "NUMBER" as const,
                  description: "Taxable income before adjustments",
                },
                adjustments: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      description: { type: "STRING" as const },
                      amount: { type: "NUMBER" as const },
                      type: { type: "STRING" as const },
                    },
                    required: ["description", "amount", "type"],
                  },
                },
                credits: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      description: { type: "STRING" as const },
                      amount: { type: "NUMBER" as const },
                      refundable: { type: "BOOLEAN" as const },
                    },
                    required: ["description", "amount"],
                  },
                },
                rateOverride: {
                  type: "NUMBER" as const,
                  description: "Override corporate tax rate as decimal (e.g., 0.3)",
                },
                evidenceIds: {
                  type: "ARRAY" as const,
                  items: { type: "STRING" as const },
                },
              },
              required: ["jurisdiction", "taxYear", "taxableIncome"],
            },
          };

        case "compute_withholding_tax":
          return {
            name: "compute_withholding_tax",
            description: tool.description,
            parameters: {
              type: "OBJECT" as const,
              properties: {
                jurisdiction: {
                  type: "STRING" as const,
                  description: "Jurisdiction code (e.g., MT, RW, CA)",
                },
                paymentType: {
                  type: "STRING" as const,
                  description: "Payment type (dividends, interest, royalties, services, fees)",
                },
                grossAmount: {
                  type: "NUMBER" as const,
                  description: "Gross payment amount",
                },
                domesticRate: {
                  type: "NUMBER" as const,
                  description: "Domestic withholding rate (decimal)",
                },
                treatyRate: {
                  type: "NUMBER" as const,
                  description: "Treaty withholding rate (decimal)",
                },
                applyTreaty: {
                  type: "BOOLEAN" as const,
                  description: "Apply treaty rate if provided",
                },
                evidenceIds: {
                  type: "ARRAY" as const,
                  items: { type: "STRING" as const },
                },
              },
              required: ["jurisdiction", "paymentType", "grossAmount"],
            },
          };

        default:
          return null;
      }
    })
    .filter((fn) => fn !== null);
}
