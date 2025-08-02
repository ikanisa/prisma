import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userText, userId } = await req.json();

    if (!userText) {
      return new Response(
        JSON.stringify({ error: 'userText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a terse NLU decoder. Given text, respond _only_ with JSON:
{intent: <payment|ride|find_business|marketplace|support|driver|onboarding|unknown>, confidence: 0-1, slots: {...}, language: <rw|en|fr|sw>, languageConfidence: 0-1}

Extract:
- payment: {amount, currency?, recipient_phone?}
- ride: {destination_text, pickup_text?}
- find_business: {keyword, category?}
- marketplace: {product_name?, category?}
- support: {issue_type?}
- driver: {action: "go_online|go_offline|check_earnings"}
- onboarding: {type: "driver|business|pharmacy", action: "start|continue|complete"}

SPECIAL RULES:
- Pure numbers (e.g. "1000", "5000") = payment intent with amount
- "driver", "moto", "transport" = onboarding intent with type=driver
- "business", "shop", "pharmacy" = onboarding intent with type=business

LANGUAGE DETECTION:
- Detect Kinyarwanda (rw), English (en), French (fr), Swahili (sw)
- Common Kinyarwanda: muraho, murakoze, urakoze, ariko, umufasha, imbere
- Return languageConfidence: confidence level for detected language (0-1)

Return ONLY valid JSON, no explanations.`
          },
          {
            role: 'user',
            content: userText
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim();
    
    // Try to parse as JSON to validate
    let intentData;
    try {
      intentData = JSON.parse(result);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', result);
      // Fallback response
      intentData = {
        intent: 'unknown',
        confidence: 0.2,
        slots: {},
        language: 'en',
        languageConfidence: 0.5
      };
    }

    // Auto-Language Store: if confidence > 0.7, update user_profiles.language
    if (userId && intentData.language && intentData.languageConfidence > 0.7) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            language: intentData.language,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        
        console.log(`Language preference updated: ${userId} -> ${intentData.language} (confidence: ${intentData.languageConfidence})`);
      } catch (langError) {
        console.error('Failed to update language preference:', langError);
      }
    }

    return new Response(
      JSON.stringify(intentData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-intent-slots:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        intent: 'unknown',
        confidence: 0.1,
        slots: {}
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});