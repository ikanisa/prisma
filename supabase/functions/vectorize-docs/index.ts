import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log('Starting document vectorization process...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch un-embedded documents
    const { data: documents, error: fetchError } = await supabase
      .from('agent_documents')
      .select('*')
      .eq('embedding_ok', false)
      .limit(10);

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      throw fetchError;
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
          .from('uploads/docs')
          .download(doc.storage_path.replace('uploads/docs/', ''));

        if (downloadError) {
          console.error(`Error downloading file ${doc.storage_path}:`, downloadError);
          continue;
        }

        // Convert file to text (assuming text files for now)
        const text = new TextDecoder().decode(await fileData.arrayBuffer());
        console.log(`File content length: ${text.length} characters`);

        // Split into chunks (800 characters each)
        const chunks = [];
        for (let i = 0; i < text.length; i += 800) {
          chunks.push(text.slice(i, i + 800));
        }

        console.log(`Split into ${chunks.length} chunks`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          try {
            // Generate embedding using OpenAI
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: chunk,
              }),
            });

            if (!embeddingResponse.ok) {
              console.error(`OpenAI API error: ${embeddingResponse.status}`);
              continue;
            }

            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;

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

        // Mark document as embedded
        const { error: updateError } = await supabase
          .from('agent_documents')
          .update({ embedding_ok: true })
          .eq('id', doc.id);

        if (updateError) {
          console.error('Error updating document status:', updateError);
        } else {
          processedCount++;
          console.log(`Successfully processed document: ${doc.title}`);
        }

      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
      }
    }

    const result = {
      message: `Processed ${processedCount}/${documents.length} documents`,
      processed: processedCount,
      total: documents.length,
    };

    console.log('Vectorization complete:', result);

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