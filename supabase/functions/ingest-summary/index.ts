import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Generate summary using OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const summaryPrompt = `Summarize the following content in exactly 120 words or less, focusing on key points relevant to Rwanda's fintech and mobile money ecosystem:

${module.content.slice(0, 7000)}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating concise, informative summaries for financial technology documentation in Rwanda.' 
          },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 200,
        temperature: 0.3
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const summary = result.choices[0].message.content.trim()

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