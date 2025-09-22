import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_ENVIRONMENT = Deno.env.get('PINECONE_ENVIRONMENT');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface RefreshRequest {
  namespace: string;
  agent_id?: string;
}

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { namespace, agent_id }: RefreshRequest = await req.json();
    console.log(`Starting namespace refresh for: ${namespace}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }


    // Log the execution
    await supabase.from('agent_execution_log').insert({
      function_name: 'namespace-refresh',
      input_data: { namespace, agent_id },
      user_id: agent_id || 'system',
      timestamp: new Date().toISOString()
    });

    const startTime = Date.now();
    let vectorsProcessed = 0;
    let errors: string[] = [];

    try {
      // Fetch all learning modules and documents that need re-embedding
      const modulesToProcess = await fetchModulesForNamespace(supabase, namespace);
      console.log(`Found ${modulesToProcess.length} modules to process`);

      // Clear existing vectors for this namespace in Pinecone (if configured)
      if (PINECONE_API_KEY) {
        await clearPineconeNamespace(namespace);
      }

      // Process each module
      for (const module of modulesToProcess) {
        try {
          const chunks = await createTextChunks(module.content || module.summary || '', 500, 50);
          
          for (let i = 0; i < chunks.length; i++) {
            const embedding = await generateEmbedding(chunks[i]);
            
            if (PINECONE_API_KEY) {
              await upsertToPinecone(namespace, `${module.id}-chunk-${i}`, embedding, {
                module_id: module.id,
                title: module.title,
                chunk_index: i,
                content: chunks[i],
                agent_scope: module.agent_scope || 'general'
              });
            }
            
            vectorsProcessed++;
          }

          // Update module with vector count
          await supabase
            .from('learning_modules')
            .update({ 
              vector_count: chunks.length,
              vector_ns: namespace,
              updated_at: new Date().toISOString()
            })
            .eq('id', module.id);

        } catch (error) {
          console.error(`Error processing module ${module.id}:`, error);
          errors.push(`Module ${module.id}: ${error.message}`);
        }
      }

      const executionTime = Date.now() - startTime;

      // Log completion
      await supabase.from('agent_execution_log').insert({
        function_name: 'namespace-refresh',
        input_data: { namespace, agent_id, vectors_processed: vectorsProcessed },
        success_status: errors.length === 0,
        execution_time_ms: executionTime,
        error_details: errors.length > 0 ? errors.join('; ') : null,
        user_id: agent_id || 'system',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        namespace,
        vectors_processed: vectorsProcessed,
        modules_updated: modulesToProcess.length,
        execution_time_ms: executionTime,
        errors: errors.length > 0 ? errors : undefined
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error in namespace refresh:', error);
      
      // Log error
      await supabase.from('agent_execution_log').insert({
        function_name: 'namespace-refresh',
        input_data: { namespace, agent_id },
        success_status: false,
        execution_time_ms: Date.now() - startTime,
        error_details: error.message,
        user_id: agent_id || 'system',
        timestamp: new Date().toISOString()
      });

      throw error;
    }

  } catch (error) {
    console.error('Error in namespace-refresh:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchModulesForNamespace(supabase: any, namespace: string) {
  const { data: modules, error } = await supabase
    .from('learning_modules')
    .select('*')
    .or(`agent_scope.eq.${namespace},agent_scope.eq.general`)
    .eq('status', 'uploaded');

  if (error) {
    throw new Error(`Failed to fetch modules: ${error.message}`);
  }

  return modules || [];
}

async function clearPineconeNamespace(namespace: string) {
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT) {
    console.log('Pinecone not configured, skipping namespace clear');
    return;
  }

  try {
    const response = await fetch(
      `https://${PINECONE_ENVIRONMENT}.pinecone.io/vectors/delete`,
      {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace,
          deleteAll: true
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pinecone delete failed: ${response.statusText}`);
    }

    console.log(`Cleared Pinecone namespace: ${namespace}`);
  } catch (error) {
    console.error('Error clearing Pinecone namespace:', error);
    // Don't throw - continue with refresh even if clear fails
  }
}

async function createTextChunks(text: string, maxChunkSize = 500, overlap = 50): Promise<string[]> {
  if (!text || text.length <= maxChunkSize) {
    return [text || ''];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at word boundary
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start + maxChunkSize * 0.5) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = Math.max(start + maxChunkSize - overlap, end);
  }

  return chunks.filter(chunk => chunk.length > 0);
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function upsertToPinecone(namespace: string, id: string, embedding: number[], metadata: any) {
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT) {
    console.log('Pinecone not configured, skipping vector upsert');
    return;
  }

  try {
    const response = await fetch(
      `https://${PINECONE_ENVIRONMENT}.pinecone.io/vectors/upsert`,
      {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vectors: [{
            id,
            values: embedding,
            metadata
          }],
          namespace
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pinecone upsert failed: ${response.statusText}`);
    }

  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
    throw error;
  }
}