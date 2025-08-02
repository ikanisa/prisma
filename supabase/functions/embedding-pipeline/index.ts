import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      text,
      userId,
      domain = 'general',
      chunkSize = 500,
      overlap = 50
    } = await req.json();

    console.log('🔗 Creating embeddings pipeline:', { userId, domain, textLength: text?.length });

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required for embedding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chunk the text for embedding
    const chunks = chunkText(text, chunkSize, overlap);
    console.log('📄 Created text chunks:', chunks.length);

    const embeddings = [];
    const embeddingResults = [];

    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`🔗 Generating embedding ${i + 1}/${chunks.length}`);
        
        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.text,
            encoding_format: 'float'
          }),
        });

        if (!embeddingResponse.ok) {
          throw new Error(`Embedding API error: ${embeddingResponse.statusText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Store embedding in database
        const embeddingRecord = {
          id: `emb_${userId}_${Date.now()}_${i}`,
          chunk_text: chunk.text,
          chunk_index: i,
          embedding: JSON.stringify(embedding), // Store as JSON string
          metadata: {
            userId,
            domain,
            chunkSize,
            totalChunks: chunks.length,
            startPos: chunk.start,
            endPos: chunk.end,
            generatedAt: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        };

        // Insert into agent_document_embeddings table
        const { data: insertedData, error: insertError } = await supabase
          .from('agent_document_embeddings')
          .insert({
            chunk_text: chunk.text,
            chunk_index: i,
            embedding: embedding, // Postgres vector type
            metadata: embeddingRecord.metadata,
            domain: domain
          })
          .select()
          .single();

        if (insertError) {
          console.warn(`⚠️ Failed to store embedding ${i}:`, insertError);
        } else {
          console.log(`✅ Stored embedding ${i + 1}/${chunks.length}`);
        }

        embeddings.push(embedding);
        embeddingResults.push({
          chunkIndex: i,
          chunkText: chunk.text.substring(0, 100) + '...',
          embeddingId: embeddingRecord.id,
          stored: !insertError
        });

      } catch (chunkError) {
        console.error(`❌ Failed to process chunk ${i}:`, chunkError);
        embeddingResults.push({
          chunkIndex: i,
          chunkText: chunk.text.substring(0, 100) + '...',
          error: chunkError.message,
          stored: false
        });
      }
    }

    // Store summary metadata
    if (userId) {
      const { error: memoryError } = await supabase
        .from('agent_memory_enhanced')
        .insert({
          user_id: userId,
          memory_type: 'embedding_metadata',
          memory_key: `embeddings_${Date.now()}`,
          memory_value: {
            content: `Processed ${chunks.length} text chunks for embeddings`,
            metadata: {
              domain,
              totalChunks: chunks.length,
              successfulEmbeddings: embeddingResults.filter(r => r.stored).length,
              failedEmbeddings: embeddingResults.filter(r => !r.stored).length,
              originalTextLength: text.length,
              chunkSize,
              overlap
            }
          },
          importance_weight: 0.7,
          confidence_score: 0.95
        });

      if (memoryError) {
        console.warn('⚠️ Failed to store embedding metadata:', memoryError);
      }
    }

    // Log execution
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'embedding-pipeline',
        input_data: { 
          userId, 
          domain, 
          textLength: text.length,
          chunkSize,
          overlap 
        },
        output_data: { 
          totalChunks: chunks.length,
          successfulEmbeddings: embeddingResults.filter(r => r.stored).length,
          failedEmbeddings: embeddingResults.filter(r => !r.stored).length
        },
        execution_time_ms: 0,
        success_status: true,
        user_id: userId
      });

    console.log('✅ Embedding pipeline completed');

    return new Response(
      JSON.stringify({
        success: true,
        totalChunks: chunks.length,
        successfulEmbeddings: embeddingResults.filter(r => r.stored).length,
        failedEmbeddings: embeddingResults.filter(r => !r.stored).length,
        results: embeddingResults,
        metadata: {
          domain,
          chunkSize,
          overlap,
          originalTextLength: text.length,
          embeddingDimension: embeddings[0]?.length || 0,
          processedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Embedding pipeline error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process embedding pipeline',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function chunkText(text: string, chunkSize: number, overlap: number): Array<{
  text: string;
  start: number;
  end: number;
}> {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    // Try to end at a sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      const questionEnd = text.lastIndexOf('?', end);
      const exclamationEnd = text.lastIndexOf('!', end);
      
      const lastSentence = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      if (lastSentence > start + chunkSize * 0.5) {
        end = lastSentence + 1;
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        start,
        end
      });
    }

    // Move start position with overlap
    start = end - overlap;
    if (start >= end) {
      start = end;
    }
  }

  return chunks;
}