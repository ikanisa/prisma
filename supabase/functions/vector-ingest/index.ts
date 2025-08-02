import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const { documents } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const pineconeKey = Deno.env.get('PINECONE_API_KEY');
    
    if (!openAIApiKey || !pineconeKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing API keys',
        openai: !!openAIApiKey,
        pinecone: !!pineconeKey
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 Starting vector ingest for ${documents?.length || 'all'} documents`);

    // Step 1: Get documents to process
    let docsToProcess;
    if (documents && documents.length > 0) {
      const { data } = await supabase
        .from('agent_documents')
        .select('*')
        .in('id', documents)
        .eq('embedding_ok', false);
      docsToProcess = data || [];
    } else {
      const { data } = await supabase
        .from('agent_documents')
        .select('*')
        .eq('embedding_ok', false)
        .limit(10);
      docsToProcess = data || [];
    }

    console.log(`📄 Found ${docsToProcess.length} documents to process`);

    let processed = 0;
    let errors: any[] = [];

    for (const doc of docsToProcess) {
      try {
        console.log(`📝 Processing document: ${doc.title}`);
        
        // Step 2: Get document content from storage
        let content = '';
        if (doc.storage_path) {
          const { data: fileData } = await supabase.storage
            .from('agent-docs')
            .download(doc.storage_path);
          
          if (fileData) {
            content = await fileData.text();
          }
        }

        if (!content && doc.title) {
          content = doc.title; // Fallback to title
        }

        if (!content) {
          console.log(`⚠️ No content found for document ${doc.id}`);
          continue;
        }

        // Step 3: Create text chunks (simple splitting for now)
        const chunks = createTextChunks(content, 512, 64);
        console.log(`🔧 Created ${chunks.length} chunks for ${doc.title}`);

        // Step 4: Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const hash = await generateHash(chunk);

          // Check if chunk already exists
          const { data: existing } = await supabase
            .from('knowledge_documents')
            .select('id')
            .eq('hash', hash)
            .maybeSingle();

          if (existing) {
            console.log(`⏭️ Chunk ${i} already exists, skipping`);
            continue;
          }

          // Step 5: Generate embedding
          const embedding = await generateEmbedding(chunk, openAIApiKey);
          
          // Step 6: Store in knowledge_documents
          const { error: insertError } = await supabase
            .from('knowledge_documents')
            .insert({
              source_type: 'doc',
              source_ref: doc.id,
              chunk_index: i,
              domain: 'core',
              lang: 'en',
              content: chunk,
              hash: hash
            });

          if (insertError) {
            console.error(`❌ Error storing chunk ${i}:`, insertError);
            errors.push({ doc_id: doc.id, chunk: i, error: insertError.message });
            continue;
          }

          // Step 7: Store in Pinecone (optional - if configured)
          try {
            const pineconeUrl = 'https://api.pinecone.io/indexes/easymo-memory/vectors/upsert';
            await fetch(pineconeUrl, {
              method: 'POST',
              headers: {
                'Api-Key': pineconeKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                vectors: [{
                  id: hash,
                  values: embedding,
                  metadata: {
                    source_type: 'doc',
                    source_ref: doc.id,
                    chunk_index: i,
                    domain: 'core',
                    content: chunk.substring(0, 100) // Truncate for metadata
                  }
                }],
                namespace: 'omni-agent'
              })
            });
            console.log(`✅ Stored chunk ${i} in Pinecone`);
          } catch (pineconeError) {
            console.log(`⚠️ Pinecone storage failed for chunk ${i}:`, pineconeError);
            // Continue processing even if Pinecone fails
          }
        }

        // Step 8: Mark document as processed
        await supabase
          .from('agent_documents')
          .update({ embedding_ok: true })
          .eq('id', doc.id);

        processed++;
        console.log(`✅ Completed processing ${doc.title}`);

      } catch (error) {
        console.error(`❌ Error processing document ${doc.id}:`, error);
        errors.push({ doc_id: doc.id, error: error.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      total: docsToProcess.length,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Vector ingest error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createTextChunks(text: string, maxSize: number = 512, overlap: number = 64): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += maxSize - overlap) {
    const chunk = words.slice(i, i + maxSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks.length > 0 ? chunks : [text];
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}