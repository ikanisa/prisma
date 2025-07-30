import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getOpenAI, createEmbedding } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();
    console.log('Starting OpenAI-powered document vectorization...', { document_id });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch specific document or un-embedded documents
    let documents;
    if (document_id) {
      const { data: singleDoc, error: singleError } = await supabase
        .from('agent_documents')
        .select('*')
        .eq('id', document_id)
        .single();
      
      if (singleError) throw singleError;
      documents = singleDoc ? [singleDoc] : [];
    } else {
      const { data: allDocs, error: fetchError } = await supabase
        .from('agent_documents')
        .select('*')
        .eq('embedding_ok', false)
        .limit(10);
      
      if (fetchError) throw fetchError;
      documents = allDocs || [];
    }

    if (!documents?.length) {
      console.log('No documents to embed');
      return new Response(JSON.stringify({ message: 'No documents to embed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${documents.length} documents to process`);
    let processedCount = 0;

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.id})`);
        
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('persona-docs')
          .download(doc.storage_path);

        if (downloadError) {
          console.error(`Error downloading file ${doc.storage_path}:`, downloadError);
          continue;
        }

        // Convert file to text with proper handling
        let text: string;
        if (doc.drive_mime?.includes('application/pdf')) {
          // For PDFs, we'll extract text (simplified approach)
          const arrayBuffer = await fileData.arrayBuffer();
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(arrayBuffer);
        } else {
          text = new TextDecoder().decode(await fileData.arrayBuffer());
        }
        
        console.log(`File content length: ${text.length} characters`);

        // Smart text chunking with overlap
        const chunks = createTextChunks(text, 1000, 100);

        console.log(`Split into ${chunks.length} chunks`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          try {
            // Generate embedding using OpenAI SDK
            console.log(`🔢 Creating embeddings: {
  model: "text-embedding-3-small",
  inputType: "string",
  inputLength: ${chunk.length}
}`);
            
            const embeddingData = await createEmbedding(chunk, 'text-embedding-3-small');
            const embedding = embeddingData.data[0].embedding;
            
            console.log(`✅ Embedding created: {
  model: "text-embedding-3-small",
  usage: { prompt_tokens: ${embeddingData.usage?.prompt_tokens}, total_tokens: ${embeddingData.usage?.total_tokens} },
  dataLength: ${embeddingData.data.length}
}`);

            // Store embedding in Pinecone (if available) and local vector store
            try {
              // Store in local vector store
              const { error: upsertError } = await supabase.rpc('upsert_embedding', {
                doc_id: doc.id,
                chunk: chunk,
                embedding: embedding,
              });

              if (upsertError) {
                console.error('Error storing embedding:', upsertError);
              } else {
                console.log(`Stored embedding for chunk ${i + 1}/${chunks.length}`);
              }

              // Also try to store in Pinecone if credentials are available
              const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
              const pineconeEnv = Deno.env.get('PINECONE_ENV');
              
              if (pineconeApiKey && pineconeEnv) {
                try {
                  const pineconeResponse = await fetch(`https://easymo-memory-${pineconeEnv}.svc.pinecone.io/vectors/upsert`, {
                    method: 'POST',
                    headers: {
                      'Api-Key': pineconeApiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      namespace: doc.agent_id || 'default',
                      vectors: [{
                        id: `${doc.id}-${i}`,
                        values: embedding,
                        metadata: {
                          doc_id: doc.id,
                          chunk_index: i,
                          text: chunk.substring(0, 100), // Store first 100 chars as metadata
                        }
                      }]
                    }),
                  });

                  if (pineconeResponse.ok) {
                    console.log(`Stored in Pinecone: chunk ${i + 1}/${chunks.length}`);
                  } else {
                    console.error(`Pinecone error: ${pineconeResponse.status}`);
                  }
                } catch (pineconeError) {
                  console.error('Pinecone request failed:', pineconeError);
                }
              }
            } catch (storeError) {
              console.error('Error storing embedding:', storeError);
            }
          } catch (chunkError) {
            console.error(`Error processing chunk ${i}:`, chunkError);
          }
        }

        // Mark document as embedded and update with metadata
        const { error: updateError } = await supabase
          .from('agent_documents')
          .update({ 
            embedding_ok: true,
            vector_count: chunks.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error('Error updating document status:', updateError);
        } else {
          processedCount++;
          console.log(`✅ Successfully processed document: ${doc.title} with ${chunks.length} embeddings`);
          
          // Add to knowledge base for RAG
          try {
            await supabase.functions.invoke('knowledge-manager', {
              body: {
                action: 'add',
                topic: doc.title,
                content: text.slice(0, 2000), // First 2000 chars as summary
                source: 'document_upload',
                confidence: 0.9,
                tags: ['document', 'vectorized', doc.drive_mime?.split('/')[1] || 'unknown']
              }
            });
            console.log('📚 Added to knowledge base for RAG');
          } catch (kbError) {
            console.error('Knowledge base addition failed:', kbError);
          }
        }

      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
      }
    }

    const result = {
      success: true,
      message: `OpenAI vectorization complete: ${processedCount}/${documents.length} documents`,
      processed: processedCount,
      total: documents.length,
      integration: 'openai_embeddings',
      rag_enabled: true
    };

    console.log('🎉 OpenAI vectorization complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Vectorization error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Document vectorization failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function createTextChunks(text: string, maxSize = 1000, overlap = 100): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      if (sentenceEnd > start + maxSize * 0.5) {
        end = sentenceEnd + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = Math.max(start + maxSize - overlap, end);
  }

  return chunks.filter(chunk => chunk.length > 0);
}