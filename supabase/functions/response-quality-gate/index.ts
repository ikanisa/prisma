import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { response, original_message, phone_number, conversation_id } = await req.json();

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🛡️ Quality gate: Evaluating response...');

    // First, get a quick quality score
    const quickEvalPrompt = `
Rate this WhatsApp response quality from 0.0 to 1.0:

User: "${original_message}"
Response: "${response}"

Consider: helpfulness, clarity, appropriateness for WhatsApp.
Return only a number between 0.0 and 1.0.
`;

    const evalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: quickEvalPrompt }
        ],
        temperature: 0.1,
        max_tokens: 10
      }),
    });

    if (!evalResponse.ok) {
      console.error('OpenAI eval API error:', await evalResponse.text());
      // If evaluation fails, pass through original response
      return new Response(JSON.stringify({
        success: true,
        final_response: response,
        quality_score: null,
        improved: false,
        note: 'Quality evaluation failed, using original response'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const evalData = await evalResponse.json();
    const scoreText = evalData.choices[0].message.content.trim();
    const qualityScore = parseFloat(scoreText) || 0.5;

    console.log(`📊 Quality score: ${qualityScore}`);

    // If quality is good enough, return original
    if (qualityScore >= 0.7) {
      console.log('✅ Quality acceptable, returning original response');
      
      return new Response(JSON.stringify({
        success: true,
        final_response: response,
        quality_score: qualityScore,
        improved: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Quality is low, attempt to improve
    console.log('⚠️ Quality below threshold, attempting improvement...');

    const improvePrompt = `
The following WhatsApp response has quality issues. Please rewrite it to be:
- More helpful and accurate
- Clearer and more concise
- Appropriate for WhatsApp (friendly, concise)
- In the same language as the original

Original User Message: "${original_message}"
Low-Quality Response: "${response}"

Provide ONLY the improved response, nothing else:
`;

    const improveResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert at improving WhatsApp customer service responses. Return only the improved response.' },
          { role: 'user', content: improvePrompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    let finalResponse = response;
    let improved = false;

    if (improveResponse.ok) {
      const improveData = await improveResponse.json();
      const improvedText = improveData.choices[0].message.content.trim();
      
      if (improvedText && improvedText !== response) {
        finalResponse = improvedText;
        improved = true;
        console.log('✨ Response improved successfully');
      }
    } else {
      console.error('Failed to improve response:', await improveResponse.text());
    }

    // Log the quality gate activity
    await supabase
      .from('conversation_evaluations')
      .insert({
        conversation_id,
        phone_number,
        overall_score: qualityScore,
        model_used: 'gpt-4o-mini',
        evaluation_notes: improved ? 'Response improved by quality gate' : 'Low quality, improvement failed'
      });

    return new Response(JSON.stringify({
      success: true,
      final_response: finalResponse,
      quality_score: qualityScore,
      improved,
      original_response: response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Quality gate error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      final_response: req.body?.response || '',
      improved: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});