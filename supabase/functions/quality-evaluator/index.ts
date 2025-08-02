import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, response, phone_number, conversation_id } = await req.json();

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Starting quality evaluation...');

    // Use GPT-4o to evaluate response quality
    const evaluationPrompt = `
You are a quality evaluator for customer service responses in a WhatsApp marketplace app.

Original Message: "${message}"
AI Response: "${response}"

Please evaluate the response on the following criteria (score 0.0-1.0):

1. HELPFULNESS: Does the response adequately address the user's request?
2. CLARITY: Is the response clear, concise, and easy to understand?
3. STYLE: Is the tone appropriate, friendly, and professional for WhatsApp?

Return ONLY a JSON object with your evaluation:
{
  "overall_score": 0.85,
  "helpfulness_score": 0.9,
  "clarity_score": 0.8,
  "style_score": 0.85,
  "evaluation_notes": "Brief explanation of key strengths/weaknesses"
}
`;

    // Use OpenAI SDK with Rwanda-specific evaluation criteria
    const systemPrompt = 'You are a quality evaluation expert for easyMO Rwanda WhatsApp marketplace. Focus on mobile money context, cultural appropriateness, and local business practices. Return only valid JSON.';
    
    const evaluation = await generateIntelligentResponse(
      evaluationPrompt,
      systemPrompt,
      [],
      {
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      }
    );

    let evaluationResult;
    try {
      evaluationResult = JSON.parse(evaluation);
    } catch (parseError) {
      console.error('Failed to parse evaluation JSON:', evaluation);
      // Fallback evaluation
      evaluationResult = {
        overall_score: 0.5,
        helpfulness_score: 0.5,
        clarity_score: 0.5,
        style_score: 0.5,
        evaluation_notes: 'Failed to parse AI evaluation'
      };
    }

    // Store evaluation in database
    const { data: evaluationRecord, error: dbError } = await supabase
      .from('conversation_evaluations')
      .insert({
        conversation_id,
        phone_number,
        overall_score: evaluationResult.overall_score,
        helpfulness_score: evaluationResult.helpfulness_score,
        clarity_score: evaluationResult.clarity_score,
        style_score: evaluationResult.style_score,
        model_used: 'gpt-4.1-2025-04-14',
        evaluation_notes: evaluationResult.evaluation_notes
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

    console.log(`✅ Quality evaluation complete. Overall score: ${evaluationResult.overall_score}`);

    // If score is below threshold, trigger improvement
    if (evaluationResult.overall_score < 0.7) {
      console.log('⚠️ Low quality score detected, logging for improvement');
      
      // Could trigger rewrite or fine-tuning data collection here
      await supabase
        .from('conversation_learning_log')
        .insert({
          user_id: phone_number,
          learning_summary: `Low quality response (${evaluationResult.overall_score}): ${evaluationResult.evaluation_notes}`,
          confidence_level: evaluationResult.overall_score,
          improvement_note: 'Consider response rewrite or additional training'
        });
    }

    return new Response(JSON.stringify({
      success: true,
      evaluation: evaluationResult,
      evaluation_id: evaluationRecord.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Quality evaluator error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});