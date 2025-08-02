import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Text chunking utility
function createTextChunks(text: string, maxChunkSize = 300, overlap = 50): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  
  let currentChunk: string[] = []
  let currentSize = 0
  
  for (const word of words) {
    if (currentSize + word.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
      
      // Keep some overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 5))
      currentChunk = overlapWords
      currentSize = overlapWords.join(' ').length
    }
    
    currentChunk.push(word)
    currentSize += word.length + 1
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }
  
  return chunks.filter(chunk => chunk.trim().length > 20) // Filter very short chunks
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { module_id } = await req.json()

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get module content
    const { data: module, error: moduleError } = await supabase
      .from('learning_modules')
      .select('content, vector_ns, title, auto_tags')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      throw new Error(`Module not found: ${moduleError?.message}`)
    }

    if (!module.content || module.content.length < 100) {
      throw new Error('Insufficient content for embedding')
    }

    // Create text chunks
    const chunks = createTextChunks(module.content, 300, 50)
    console.log(`Created ${chunks.length} chunks for module ${module_id}`)

    // Check if we have Pinecone configuration
    const pineconeKey = Deno.env.get('PINECONE_API_KEY')
    if (!pineconeKey) {
      console.warn('Pinecone not configured, skipping vector embedding')
      
      // Just update the vector count to show processing completed
      await supabase
        .from('learning_modules')
        .update({ vector_count: chunks.length })
        .eq('id', module_id)

      return new Response(
        JSON.stringify({
          success: true,
          module_id,
          chunks_created: chunks.length,
          vectors_stored: 0,
          note: 'Pinecone not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use existing pinecone-vector-manager function
    let vectorsStored = 0
    const namespace = module.vector_ns || 'MarketingAgent'

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const vectorId = `${module_id}_${i}`

      try {
        const { error: vectorError } = await supabase.functions.invoke('pinecone-vector-manager', {
          body: {
            operation: 'upsert_vector',
            id: vectorId,
            text: chunk,
            namespace,
            metadata: {
              module_id,
              chunk_index: i,
              source_type: 'learning_module',
              title: module.title,
              tags: module.auto_tags || []
            }
          }
        })

        if (vectorError) {
          console.warn(`Failed to store vector ${i}:`, vectorError.message)
        } else {
          vectorsStored++
        }

      } catch (error) {
        console.warn(`Error storing vector ${i}:`, error.message)
      }

      // Small delay to avoid rate limits
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update module with vector count
    const { error: updateError } = await supabase
      .from('learning_modules')
      .update({ vector_count: vectorsStored })
      .eq('id', module_id)

    if (updateError) {
      throw new Error(`Failed to update vector count: ${updateError.message}`)
    }

    console.log(`Embedded ${vectorsStored}/${chunks.length} vectors for module ${module_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        chunks_created: chunks.length,
        vectors_stored: vectorsStored,
        namespace
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-embed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
