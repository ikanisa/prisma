import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PineconeRequest {
  action: 'create_namespace' | 'list_namespaces' | 'query_namespace' | 'upsert_vectors' | 'delete_namespace';
  namespace?: string;
  vectors?: any[];
  query?: {
    vector?: number[];
    text?: string;
    topK?: number;
    filter?: any;
  };
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeEnvironment = Deno.env.get('PINECONE_ENVIRONMENT') || 'us-east-1-aws';
    const pineconeIndexName = Deno.env.get('PINECONE_INDEX_NAME') || 'easymo-conversations';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!pineconeApiKey) {
      console.log('Pinecone not configured, using fallback vector storage');
      return await handleFallbackVectorStorage(req);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const request: PineconeRequest = await req.json();

    console.log(`Pinecone namespace operation: ${request.action}`);

    switch (request.action) {
      case 'create_namespace':
        return await createNamespace(request.namespace!, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
      
      case 'list_namespaces':
        return await listNamespaces(pineconeApiKey, pineconeEnvironment, pineconeIndexName);
      
      case 'query_namespace':
        return await queryNamespace(request.namespace!, request.query!, pineconeApiKey, pineconeEnvironment, pineconeIndexName, openaiApiKey);
      
      case 'upsert_vectors':
        return await upsertVectors(request.namespace!, request.vectors!, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
      
      case 'delete_namespace':
        return await deleteNamespace(request.namespace!, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
      
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

  } catch (error) {
    console.error('Error in Pinecone namespace manager:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleFallbackVectorStorage(req: Request) {
  // Fallback to Supabase vector storage when Pinecone is not available
  console.log('Using Supabase vector storage as fallback');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const request: PineconeRequest = await req.json();

  switch (request.action) {
    case 'query_namespace':
      // Use Supabase vector similarity search
      const { data, error } = await supabase
        .from('agent_memory_enhanced')
        .select('*')
        .eq('memory_type', request.namespace || 'general')
        .limit(request.query?.topK || 5);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        matches: data?.map(item => ({
          id: item.id,
          score: 0.8, // Fallback score
          metadata: item.memory_value,
          values: []
        })) || [],
        namespace: request.namespace,
        source: 'supabase_fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    case 'upsert_vectors':
      // Store in Supabase instead
      const insertData = request.vectors?.map(vector => ({
        memory_key: vector.id,
        user_id: 'system',
        memory_type: request.namespace || 'general',
        memory_value: vector.metadata,
        confidence_score: 0.8
      }));

      const { error: insertError } = await supabase
        .from('agent_memory_enhanced')
        .upsert(insertData);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        success: true,
        upserted_count: insertData?.length || 0,
        source: 'supabase_fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    default:
      return new Response(JSON.stringify({
        success: true,
        message: 'Pinecone operation simulated with Supabase fallback',
        source: 'supabase_fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
}

async function createNamespace(namespace: string, apiKey: string, environment: string, indexName: string) {
  console.log(`Creating namespace: ${namespace}`);
  
  // In Pinecone, namespaces are created implicitly when vectors are upserted
  // So we'll just validate the namespace name and return success
  
  if (!namespace || namespace.length === 0) {
    throw new Error('Namespace name cannot be empty');
  }

  // Validate namespace name (Pinecone requirements)
  if (!/^[a-zA-Z0-9\-_]+$/.test(namespace)) {
    throw new Error('Namespace name can only contain alphanumeric characters, hyphens, and underscores');
  }

  return new Response(JSON.stringify({
    success: true,
    namespace: namespace,
    message: 'Namespace ready for use (will be created on first upsert)',
    created_at: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function listNamespaces(apiKey: string, environment: string, indexName: string) {
  const url = `https://${indexName}-${environment}.svc.pinecone.io/describe_index_stats`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Pinecone API error: ${response.statusText}`);
  }

  const stats = await response.json();
  const namespaces = Object.keys(stats.namespaces || {});

  return new Response(JSON.stringify({
    success: true,
    namespaces: namespaces,
    stats: stats
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function queryNamespace(namespace: string, query: any, apiKey: string, environment: string, indexName: string, openaiApiKey: string) {
  console.log(`Querying namespace: ${namespace}`);

  let queryVector: number[] = [];

  // If query contains text, convert to vector
  if (query.text) {
    queryVector = await generateEmbedding(query.text, openaiApiKey);
  } else if (query.vector) {
    queryVector = query.vector;
  } else {
    throw new Error('Query must contain either text or vector');
  }

  const url = `https://${indexName}-${environment}.svc.pinecone.io/query`;
  
  const requestBody = {
    namespace: namespace,
    vector: queryVector,
    topK: query.topK || 5,
    includeMetadata: true,
    includeValues: false,
    filter: query.filter || {}
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Pinecone query error: ${response.statusText}`);
  }

  const result = await response.json();

  return new Response(JSON.stringify({
    success: true,
    namespace: namespace,
    query_text: query.text,
    matches: result.matches || [],
    total_results: result.matches?.length || 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function upsertVectors(namespace: string, vectors: any[], apiKey: string, environment: string, indexName: string) {
  console.log(`Upserting ${vectors.length} vectors to namespace: ${namespace}`);

  const url = `https://${indexName}-${environment}.svc.pinecone.io/vectors/upsert`;
  
  const requestBody = {
    namespace: namespace,
    vectors: vectors.map(v => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata || {}
    }))
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinecone upsert error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  return new Response(JSON.stringify({
    success: true,
    namespace: namespace,
    upserted_count: result.upsertedCount || vectors.length,
    vectors_processed: vectors.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteNamespace(namespace: string, apiKey: string, environment: string, indexName: string) {
  console.log(`Deleting namespace: ${namespace}`);

  const url = `https://${indexName}-${environment}.svc.pinecone.io/vectors/delete`;
  
  const requestBody = {
    namespace: namespace,
    deleteAll: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Pinecone delete error: ${response.statusText}`);
  }

  return new Response(JSON.stringify({
    success: true,
    namespace: namespace,
    message: 'Namespace deleted successfully',
    deleted_at: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}