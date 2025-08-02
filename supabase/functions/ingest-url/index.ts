import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, title, uploaded_by, agent_scope = 'MarketingAgent' } = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    console.log(`Ingesting URL: ${url}`)

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch and extract content from URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()
    
    // Basic content extraction (strip HTML tags)
    const cleanContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000000) // Limit to 1MB

    if (!cleanContent || cleanContent.length < 100) {
      throw new Error('Insufficient content extracted from URL')
    }

    // Create learning module record
    const { data: module, error: moduleError } = await supabase
      .from('learning_modules')
      .insert({
        title: title || new URL(url).hostname,
        source_type: 'url',
        source_path: url,
        agent_scope,
        status: 'processing',
        content: cleanContent,
        vector_ns: agent_scope,
        uploaded_by
      })
      .select()
      .single()

    if (moduleError) {
      throw new Error(`Failed to create module: ${moduleError.message}`)
    }

    // Create pipeline tracking records
    const stages = ['extract', 'summary', 'tag', 'embed']
    const pipelineStages = stages.map(stage => ({
      module_id: module.id,
      stage,
      status: stage === 'extract' ? 'completed' : 'pending',
      started_at: stage === 'extract' ? new Date().toISOString() : null,
      completed_at: stage === 'extract' ? new Date().toISOString() : null,
      log: stage === 'extract' ? 'Content extracted from URL' : null
    }))

    const { error: pipelineError } = await supabase
      .from('ingestion_pipeline')
      .insert(pipelineStages)

    if (pipelineError) {
      console.warn('Pipeline tracking failed:', pipelineError.message)
    }

    // Trigger orchestrator for remaining stages
    const { error: orchestratorError } = await supabase.functions.invoke('ingest-orchestrator', {
      body: { module_id: module.id }
    })

    if (orchestratorError) {
      console.warn('Orchestrator invocation failed:', orchestratorError.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        module_id: module.id,
        title: module.title,
        content_length: cleanContent.length,
        status: 'processing',
        next_stages: ['summary', 'tag', 'embed']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-url:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})