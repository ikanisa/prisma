import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassifyIntentRequest {
  message: string;
  userId?: string;
  context?: string;
}

interface IntentClassification {
  intent: string;
  confidence: number;
  parameters?: Record<string, any>;
  suggested_skill?: string;
}

const INTENT_SCHEMA = {
  "type": "object",
  "properties": {
    "intent": {
      "type": "string",
      "enum": [
        "payment", "ride", "shop", "list_product", "faq", 
        "complaint", "support", "greeting", "goodbye", 
        "unclear", "small_talk", "emergency"
      ]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "parameters": {
      "type": "object",
      "properties": {
        "amount": { "type": "number" },
        "destination": { "type": "string" },
        "product_type": { "type": "string" },
        "urgency": { "type": "string" }
      }
    },
    "suggested_skill": {
      "type": "string",
      "enum": [
        "PaymentSkill", "TransportSkill", "ListingsSkill", 
        "CommerceSkill", "SupportSkill", "GeneralSkill"
      ]
    }
  },
  "required": ["intent", "confidence"]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, userId, context }: ClassifyIntentRequest = await req.json();

    console.log(`🎯 Classifying intent for message: "${message}"`);

    // Prepare the classification prompt
    const systemPrompt = `You are an intent classifier for easyMO, a WhatsApp super-app in Rwanda that handles:
- Mobile Money payments (MoMo)
- Ride booking (moto/car transport)
- Product listings (buy/sell items)
- General support and FAQ

Context about user: ${context || 'New user'}

Classify the user's message into one of these intents with confidence score:
- payment: Money transfers, MoMo payments, wallet operations
- ride: Transportation requests, booking rides, driver services  
- shop: Buying products, browsing items, marketplace
- list_product: Selling items, creating listings, farmer products
- faq: General questions about services, how-to queries
- support: Issues, complaints, technical problems
- greeting: Hello, hi, good morning/evening
- goodbye: Bye, thanks, see you later
- small_talk: Weather, personal chat, non-business conversation
- emergency: Urgent issues requiring immediate attention
- unclear: Ambiguous messages requiring clarification

Return confidence 0.6+ for clear intent, lower for uncertain cases.
When confidence < 0.6, suggest asking for clarification.

Respond only with valid JSON matching the schema.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        functions: [{
          name: 'classify_intent',
          description: 'Classify user intent with confidence score',
          parameters: INTENT_SCHEMA
        }],
        function_call: { name: 'classify_intent' },
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let classification: IntentClassification;

    try {
      const functionCall = data.choices[0].message.function_call;
      classification = JSON.parse(functionCall.arguments);
    } catch (parseError) {
      console.error('Failed to parse classification:', parseError);
      // Fallback classification
      classification = {
        intent: 'unclear',
        confidence: 0.3,
        suggested_skill: 'GeneralSkill'
      };
    }

    // Log the classification for learning
    if (userId) {
      try {
        await supabase
          .from('intent_classifications')
          .insert({
            user_id: userId,
            message_text: message,
            classified_intent: classification.intent,
            confidence_score: classification.confidence
          });
      } catch (logError) {
        console.error('Failed to log classification:', logError);
        // Don't fail the request if logging fails
      }
    }

    console.log(`✅ Classified intent: ${classification.intent} (confidence: ${classification.confidence})`);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in classify-intent:', error);
    
    // Return a safe fallback classification
    const fallbackClassification: IntentClassification = {
      intent: 'unclear',
      confidence: 0.2,
      suggested_skill: 'GeneralSkill'
    };

    return new Response(JSON.stringify(fallbackClassification), {
      status: 200, // Return 200 with fallback rather than failing
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});