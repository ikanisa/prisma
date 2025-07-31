import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { module_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get module content
    const { data: module, error: moduleError } = await supabase
      .from('learning_modules')
      .select('content, title')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      throw new Error(`Module not found: ${moduleError?.message}`)
    }

    if (!module.content || module.content.length < 50) {
      throw new Error('Insufficient content for summary generation')
    }

    // Use OpenAI SDK with Rwanda-first intelligence
    const systemPrompt = 'You are an expert at creating concise, informative summaries for financial technology documentation in Rwanda.';
    const userPrompt = `Summarize the following content in exactly 120 words or less, focusing on key points relevant to Rwanda's fintech and mobile money ecosystem:

${module.content.slice(0, 7000)}`;

    const summary = await generateIntelligentResponse(
      userPrompt,
      systemPrompt,
      [],
      {
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.1,
        max_tokens: 200
      }
    );

    // Update module with summary
    const { error: updateError } = await supabase
      .from('learning_modules')
      .update({ summary })
      .eq('id', module_id)

    if (updateError) {
      throw new Error(`Failed to update summary: ${updateError.message}`)
    }

    console.log(`Summary generated for module ${module_id}: ${summary.length} chars`)

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        summary,
        summary_length: summary.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-summary:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})