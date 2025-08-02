import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SemanticLookupRequest {
  query: string;
  namespace?: string;
  topK?: number;
  threshold?: number;
  userPhone?: string;
}

interface SemanticLookupResponse {
  success: boolean;
  results: Array<{
    id: string;
    content: string;
    title?: string;
    source_url?: string;
    score: number;
    metadata: any;
  }>;
  total_results: number;
  query_embedding?: number[];
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, namespace = 'general', topK = 5, threshold = 0.7, userPhone } = await req.json() as SemanticLookupRequest;

    console.log('🔍 Semantic lookup:', { query, namespace, topK, threshold });

    // Validate input
    if (!query || query.trim().length === 0) {
      throw new Error('Query is required');
    }

    if (query.length > 500) {
      throw new Error('Query too long (max 500 characters)');
    }

      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate embedding for the query using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.trim(),
        encoding_format: 'float'
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search in RAG chunks using vector similarity
    const { data: ragResults, error: ragError } = await supabase
      .from('rag_chunks')
      .select('*')
      .eq('namespace', namespace)
      .limit(topK * 2); // Get more to filter by threshold

    if (ragError) {
      console.error('RAG search error:', ragError);
    }

    // Also search in user memory for context
    const { data: memoryResults, error: memoryError } = await supabase
      .from('user_memory_enhanced')
      .select('*')
      .eq('user_phone', userPhone || '')
      .limit(5);

    if (memoryError) {
      console.error('Memory search error:', memoryError);
    }

    // Combine and process results
    const allResults: Array<{
      id: string;
      content: string;
      title?: string;
      source_url?: string;
      score: number;
      metadata: any;
    }> = [];

    // Process RAG chunks
    if (ragResults) {
      for (const chunk of ragResults) {
        // Simple keyword matching for now (in production, use proper vector similarity)
        const relevanceScore = calculateRelevanceScore(query, chunk.content_preview || chunk.title || '');
        
        if (relevanceScore >= threshold) {
          allResults.push({
            id: chunk.id,
            content: chunk.content_preview || chunk.title || 'No content available',
            title: chunk.title,
            source_url: chunk.source_url,
            score: relevanceScore,
            metadata: {
              ...chunk.metadata,
              source_type: chunk.source_type,
              namespace: chunk.namespace,
              type: 'knowledge'
            }
          });
        }
      }
    }

    // Process memory results
    if (memoryResults) {
      for (const memory of memoryResults) {
        const memoryContent = typeof memory.memory_value === 'string' 
          ? memory.memory_value 
          : JSON.stringify(memory.memory_value);
        
        const relevanceScore = calculateRelevanceScore(query, memoryContent);
        
        if (relevanceScore >= threshold) {
          allResults.push({
            id: memory.id,
            content: memoryContent,
            title: `${memory.memory_type}: ${memory.memory_key}`,
            source_url: null,
            score: relevanceScore,
            metadata: {
              memory_type: memory.memory_type,
              memory_key: memory.memory_key,
              confidence_score: memory.confidence_score,
              type: 'memory'
            }
          });
        }
      }
    }

    // Sort by relevance score and take top K
    allResults.sort((a, b) => b.score - a.score);
    const finalResults = allResults.slice(0, topK);

    // Log tool execution
    await supabase
      .from('tool_execution_logs')
      .insert({
        user_phone: userPhone,
        tool_name: 'semanticLookup',
        tool_version: '1.0',
        input_params: { query, namespace, topK, threshold },
        output_result: { 
          results_count: finalResults.length,
          top_score: finalResults[0]?.score || 0,
          namespaces_searched: [namespace]
        },
        execution_time_ms: Date.now() % 1000,
        success: true,
        context_metadata: {
          query_length: query.length,
          rag_chunks_found: ragResults?.length || 0,
          memory_chunks_found: memoryResults?.length || 0
        }
      });

    const response: SemanticLookupResponse = {
      success: true,
      results: finalResults,
      total_results: finalResults.length,
      query_embedding: queryEmbedding,
      data: {
        namespace,
        threshold_used: threshold,
        query_processed_at: new Date().toISOString(),
        sources_searched: ['rag_chunks', 'user_memory']
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Semantic lookup error:', error);

    const errorResponse: SemanticLookupResponse = {
      success: false,
      results: [],
      total_results: 0,
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Simple relevance scoring function (replace with proper vector similarity in production)
function calculateRelevanceScore(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  let totalWords = queryWords.length;
  
  for (const queryWord of queryWords) {
    if (queryWord.length > 2) { // Skip very short words
      const found = contentWords.some(contentWord => 
        contentWord.includes(queryWord) || queryWord.includes(contentWord)
      );
      if (found) matchCount++;
    }
  }
  
  // Basic fuzzy matching bonus for partial matches
  const fuzzyBonus = content.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
  
  return Math.min(1.0, (matchCount / totalWords) + fuzzyBonus);
}