import type {
  Tool,
  DeepSearchParams,
  ToolExecutionContext,
  ToolResult,
} from "./types.js";

/**
 * DeepSearch tool - integrates with RAG service
 * Performs semantic + keyword search across knowledge base
 */
export class DeepSearchTool implements Tool {
  name = "deepsearch";
  description =
    "Search the knowledge base for relevant documents, laws, standards, and guidelines. Use for factual information about tax, audit, accounting, or corporate services.";

  private ragServiceUrl: string;

  constructor(ragServiceUrl?: string) {
    this.ragServiceUrl =
      ragServiceUrl || process.env.RAG_SERVICE_URL || "http://localhost:3002";
  }

  async execute(
    params: unknown,
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const { query, topK = 5, filters } = params as DeepSearchParams;

      if (!query || typeof query !== "string") {
        return {
          success: false,
          error: "Query parameter is required and must be a string",
        };
      }

      // Call RAG service deep search endpoint
      const response = await fetch(`${this.ragServiceUrl}/api/deep-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          top_k: topK,
          filters: {
            ...filters,
            jurisdiction: filters?.jurisdiction || context?.jurisdictionCode,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG service error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          results: data.results || [],
          query,
          count: data.results?.length || 0,
        },
        metadata: {
          tool: "deepsearch",
          topK,
          filters,
        },
      };
    } catch (error) {
      console.error("DeepSearch tool error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const deepsearchTool = new DeepSearchTool();
