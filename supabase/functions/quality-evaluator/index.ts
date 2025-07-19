// Quality Evaluator - GPT-4o powered conversation quality assessment
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_text, conversation_id, phone_number, model_used } = await req.json();

    console.log('🔍 Evaluating message quality...');

    // Use GPT-4o-mini for quality evaluation
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a quality evaluator for customer service messages in Rwanda. Evaluate this WhatsApp message response on:

1. STYLE (0-1): Natural, conversational, appropriate tone for WhatsApp in East Africa
2. CLARITY (0-1): Clear, understandable, well-structured
3. HELPFULNESS (0-1): Addresses user needs, provides value, moves conversation forward

Respond ONLY with JSON:
{
  "style_score": 0.85,
  "clarity_score": 0.90,
  "helpfulness_score": 0.80,
  "overall_score": 0.85,
  "notes": "Brief explanation of scores"
}`
          },
          {
            role: 'user',
            content: `Evaluate this customer service message: "${message_text}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const aiResult = await openAIResponse.json();
    const evaluation = JSON.parse(aiResult.choices[0].message.content);

    // Store evaluation in database
    const { data, error } = await supabase
      .from('conversation_evaluations')
      .insert({
        conversation_id,
        phone_number,
        style_score: evaluation.style_score,
        clarity_score: evaluation.clarity_score,
        helpfulness_score: evaluation.helpfulness_score,
        overall_score: evaluation.overall_score,
        evaluation_notes: evaluation.notes,
        model_used: model_used || 'unknown'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing evaluation:', error);
      throw error;
    }

    console.log(`✅ Quality evaluation complete. Overall score: ${evaluation.overall_score}`);

    // If score is low, flag for review
    if (evaluation.overall_score < 0.6) {
      console.log('⚠️ Low quality score detected, flagging for review');
      
      // Could trigger alert or add to review queue here
      await supabase
        .from('system_metrics')
        .insert({
          metric_name: 'low_quality_response',
          metric_value: evaluation.overall_score,
          metric_type: 'gauge',
          tags: {
            conversation_id,
            phone_number,
            model_used
          }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      evaluation: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Quality evaluation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});