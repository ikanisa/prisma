import { createClient } from "@supabase/supabase-js";
import type {
  Tool,
  SemanticSearchParams,
  KeywordSearchParams,
  ToolExecutionContext,
  ToolResult,
} from "./types.js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

/**
 * Supabase Semantic Search - uses pgvector for similarity search
 */
export class SupabaseSemanticSearchTool implements Tool {
  name = "supabase_semantic_search";
  description =
    "Perform semantic (vector) search in the knowledge base. Returns similar documents based on meaning, not just keywords.";

  async execute(
    params: unknown,
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const { query, topK = 5, categories } = params as SemanticSearchParams;

      if (!query || typeof query !== "string") {
        return {
          success: false,
          error: "Query parameter is required and must be a string",
        };
      }

      // Call Supabase edge function for semantic search
      const { data, error } = await supabase.functions.invoke(
        "semantic-search",
        {
          body: {
            query,
            top_k: topK,
            categories,
            jurisdiction: context?.jurisdictionCode,
          },
        }
      );

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          results: data?.results || [],
          query,
          count: data?.results?.length || 0,
        },
        metadata: {
          tool: "supabase_semantic_search",
          topK,
          categories,
        },
      };
    } catch (error) {
      console.error("Supabase semantic search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Supabase Keyword Search - full-text search
 */
export class SupabaseKeywordSearchTool implements Tool {
  name = "supabase_keyword_search";
  description =
    "Perform keyword (full-text) search in the knowledge base. Good for finding specific terms, codes, or exact phrases.";

  async execute(
    params: unknown,
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const { query, limit = 10, categories } = params as KeywordSearchParams;

      if (!query || typeof query !== "string") {
        return {
          success: false,
          error: "Query parameter is required and must be a string",
        };
      }

      // Build query with filters
      let queryBuilder = supabase
        .from("knowledge_web_sources")
        .select("url, title, description, category, tags")
        .textSearch("fts", query)
        .limit(limit);

      // Add category filter if provided
      if (categories && categories.length > 0) {
        queryBuilder = queryBuilder.in("category", categories);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          results: data || [],
          query,
          count: data?.length || 0,
        },
        metadata: {
          tool: "supabase_keyword_search",
          limit,
          categories,
        },
      };
    } catch (error) {
      console.error("Supabase keyword search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const semanticSearchTool = new SupabaseSemanticSearchTool();
export const keywordSearchTool = new SupabaseKeywordSearchTool();
