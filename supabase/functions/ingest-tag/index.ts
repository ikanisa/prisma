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
      .select('content, title, summary')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      throw new Error(`Module not found: ${moduleError?.message}`)
    }

    // Generate tags using OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const tagPrompt = `Analyze the following content and generate 5-10 relevant tags for Rwanda fintech context. Return ONLY a JSON array of strings, no other text.

Content: ${module.content?.slice(0, 3500) || module.summary}`

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
            content: 'You are an expert tagger for Rwanda fintech documentation. Return only valid JSON arrays.' 
          },
          { role: 'user', content: tagPrompt }
        ],
        max_tokens: 150,
        temperature: 0.2
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    let tags = []
    let relevanceScore = 0.5

    try {
      const tagString = result.choices[0].message.content.trim()
      tags = JSON.parse(tagString)
      
      // Ensure it's an array of strings
      if (!Array.isArray(tags)) {
        tags = []
      } else {
        tags = tags.filter(tag => typeof tag === 'string').slice(0, 10)
      }

      // Calculate relevance score based on Rwanda fintech keywords
      const rwandaFintech = ['momo', 'mobile money', 'rwanda', 'mtn', 'airtel', 'bank', 'payment', 'financial', 'rdb', 'bnr']
      const contentLower = (module.content || '').toLowerCase()
      const relevantKeywords = rwandaFintech.filter(keyword => contentLower.includes(keyword))
      relevanceScore = Math.min(1.0, Math.max(0.1, relevantKeywords.length / rwandaFintech.length))

    } catch (parseError) {
      console.warn('Failed to parse tags JSON, using defaults:', parseError)
      tags = ['general', 'documentation']
    }

    // Update module with tags and relevance score
    const { error: updateError } = await supabase
      .from('learning_modules')
      .update({ 
        auto_tags: tags,
        relevance_score: relevanceScore
      })
      .eq('id', module_id)

    if (updateError) {
      throw new Error(`Failed to update tags: ${updateError.message}`)
    }

    console.log(`Tags generated for module ${module_id}:`, tags)

    return new Response(
      JSON.stringify({
        success: true,
        module_id,
        tags,
        relevance_score: relevanceScore,
        tag_count: tags.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ingest-tag:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})