/**
 * Knowledge Retrieval Tools
 * 
 * Tools for searching knowledge bases (IFRS/ISA/tax rules)
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from './types';
import { getSupabaseServiceClient } from './database';

/**
 * search_knowledge_base - Search knowledge base (IFRS/ISA/tax rules)
 */
export const searchKnowledgeBaseDefinition: ToolDefinition = {
  name: 'search_knowledge_base',
  description: 'Search knowledge base for IFRS/ISA/tax rules and guidance',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      knowledgeBase: {
        type: 'string',
        enum: ['IFRS', 'ISA', 'TAX', 'ALL'],
        description: 'Knowledge base to search',
        default: 'ALL',
      },
      jurisdiction: {
        type: 'string',
        description: 'Filter by jurisdiction (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 10,
      },
    },
    required: ['query'],
  },
  idempotent: true,
};

export const searchKnowledgeBase: ToolHandler = async (input, context) => {
  const { query, knowledgeBase = 'ALL', jurisdiction, limit = 10 } = input;

  if (!query) {
    return {
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'query is required',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Search knowledge documents (if table exists)
  // This is a simplified search - in production, would use vector search/RAG
  let searchQuery = supabase
    .from('kb_documents')
    .select('*', { count: 'exact' })
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(limit);

  // Filter by knowledge base type if specified
  if (knowledgeBase !== 'ALL') {
    searchQuery = searchQuery.eq('category', knowledgeBase);
  }

  // Filter by jurisdiction if specified
  if (jurisdiction) {
    searchQuery = searchQuery.eq('jurisdiction', jurisdiction);
  }

  // Filter by organization if user has one
  if (context.organizationId) {
    searchQuery = searchQuery.eq('org_id', context.organizationId);
  }

  const { data, error, count } = await searchQuery;

  if (error) {
    // If table doesn't exist, return empty results (graceful degradation)
    if (error.code === '42P01') {
      return {
        success: true,
        data: {
          query,
          knowledgeBase,
          jurisdiction,
          results: [],
          total: 0,
          limit,
          note: 'Knowledge base table not found',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to search knowledge base: ${error.message}`,
        details: error,
      },
    };
  }

  // Format results
  const results = (data || []).map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content?.substring(0, 500), // Truncate for preview
    category: doc.category,
    jurisdiction: doc.jurisdiction,
    relevanceScore: 1.0, // Would be calculated by vector search
  }));

  return {
    success: true,
    data: {
      query,
      knowledgeBase,
      jurisdiction,
      results,
      total: count || 0,
      limit,
    },
  };
};

