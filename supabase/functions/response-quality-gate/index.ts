import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_text, phone_number, conversation_id, model_used = 'gpt-4o' } = await req.json();

    if (!message_text) {
      throw new Error('Message text is required');
    }

    console.log('Quality gate processing message:', { phone_number, conversation_id });

    // 1. Score the response quality
    const qualityScore = await scoreResponse(message_text);
    
    let finalMessage = message_text;
    let wasImproved = false;

    // 2. If quality is low, improve it
    if (qualityScore < 0.7) {
      console.log(`Low quality score ${qualityScore}, improving message...`);
      const improvedMessage = await improveResponse(message_text);
      if (improvedMessage) {
        finalMessage = improvedMessage;
        wasImproved = true;
      }
    }

    // 3. Log evaluation results
    await supabase.from('conversation_evaluations').insert({
      conversation_id,
      phone_number,
      message_text: finalMessage,
      overall_score: qualityScore,
      clarity_score: qualityScore,
      helpfulness_score: qualityScore,
      style_score: qualityScore,
      model_used,
      evaluation_notes: wasImproved ? 'Message improved by quality gate' : 'Passed quality gate',
      evaluated_at: new Date().toISOString()
    });

    // 4. Queue for sending
    await supabase.from('outbound_queue').insert({
      recipient: phone_number,
      channel: 'whatsapp',
      payload: {
        message_text: finalMessage,
        message_type: 'text'
      },
      status: 'pending',
      priority: wasImproved ? 6 : 5 // Higher priority for improved messages
    });

    return new Response(JSON.stringify({
      success: true,
      quality_score: qualityScore,
      was_improved: wasImproved,
      final_message: finalMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quality gate error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function scoreResponse(message: string): Promise<number> {
  const prompt = `Rate this customer service response on a scale of 0.0 to 1.0 based on:
- Clarity and coherence
- Helpfulness and relevance  
- Professional tone
- Conciseness (ideal 1-2 sentences for WhatsApp)

Response: "${message}"

Reply with ONLY a decimal number between 0.0 and 1.0:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    const result = await response.json();
    const scoreText = result.choices[0].message.content.trim();
    const score = parseFloat(scoreText);
    
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Error scoring response:', error);
    return 0.5; // Default middle score
  }
}

async function improveResponse(message: string): Promise<string | null> {
  const prompt = `Improve this WhatsApp customer service response to be:
- More clear and helpful
- Concise (1-2 sentences max)
- Friendly but professional
- Include Kinyarwanda greeting if appropriate

Original: "${message}"

Improved response:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    });

    const result = await response.json();
    return result.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error improving response:', error);
    return null;
  }
}