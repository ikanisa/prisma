import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting vector refresh process...');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get documents that need embedding or re-embedding
    const { data: documents, error: docError } = await supabase
      .from('centralized_documents')
      .select('*')
      .or('embedded_at.is.null,needs_reembedding.eq.true')
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const doc of documents || []) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.doc_type})`);

        // Generate embedding using OpenAI
        const embedding = await generateEmbedding(doc.content || doc.summary || doc.title);

        if (embedding) {
          // Store or update embedding
          const embeddingData = {
            document_id: doc.id,
            content: doc.content || doc.summary || doc.title,
            embedding: JSON.stringify(embedding),
            domain: doc.domain || 'general',
            lang: doc.lang || 'en',
            metadata: {
              doc_type: doc.doc_type,
              title: doc.title,
              tags: doc.tags,
              processed_at: new Date().toISOString()
            }
          };

          const { error: embeddingError } = await supabase
            .from('agent_document_embeddings')
            .upsert(embeddingData, { onConflict: 'document_id' });

          if (!embeddingError) {
            // Update document to mark as embedded
            await supabase
              .from('centralized_documents')
              .update({
                embedded_at: new Date().toISOString(),
                needs_reembedding: false
              })
              .eq('id', doc.id);

            processedCount++;
            console.log(`✅ Embedded document: ${doc.title}`);
          } else {
            console.error(`Failed to store embedding for ${doc.title}:`, embeddingError);
            errorCount++;
          }
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (docProcessError) {
        console.error(`Error processing document ${doc.id}:`, docProcessError);
        errorCount++;
      }
    }

    // Update knowledge base statistics
    await updateKnowledgeBaseStats();

    // Log the refresh run
    const { error: logError } = await supabase
      .from('automated_tasks')
      .insert({
        task_type: 'vector_refresh',
        status: processedCount > 0 || errorCount === 0 ? 'completed' : 'completed_with_errors',
        metadata: {
          documents_processed: processedCount,
          errors: errorCount,
          total_documents: documents?.length || 0,
          run_time: new Date().toISOString()
        }
      });

    if (logError) {
      console.warn('Failed to log vector refresh run:', logError);
    }

    console.log(`✅ Vector refresh complete: ${processedCount} documents processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        documentsProcessed: processedCount,
        errors: errorCount,
        totalDocuments: documents?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Vector refresh error:', error);
    
    // Log the failure
    await supabase.from('automated_tasks').insert({
      task_type: 'vector_refresh',
      status: 'failed',
      metadata: {
        error: error.message,
        run_time: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit input length
        encoding_format: 'float'
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    return data.data[0]?.embedding || null;

  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function updateKnowledgeBaseStats() {
  try {
    // Count total documents and embeddings
    const [docsResult, embeddingsResult] = await Promise.all([
      supabase.from('centralized_documents').select('id', { count: 'exact', head: true }),
      supabase.from('agent_document_embeddings').select('id', { count: 'exact', head: true })
    ]);

    const totalDocs = docsResult.count || 0;
    const totalEmbeddings = embeddingsResult.count || 0;
    const embeddingCoverage = totalDocs > 0 ? Math.round((totalEmbeddings / totalDocs) * 100) : 0;

    // Update or insert knowledge base statistics
    const stats = {
      total_documents: totalDocs,
      total_embeddings: totalEmbeddings,
      embedding_coverage_percent: embeddingCoverage,
      last_refresh: new Date().toISOString()
    };

    console.log('Knowledge base stats:', stats);

  } catch (error) {
    console.error('Error updating knowledge base stats:', error);
  }
}