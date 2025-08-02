import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  createChatCompletion,
  analyzeIntent,
  type AIMessage,
  type CompletionOptions
} from "../_shared/openai-sdk.ts";

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

serve(withErrorHandling(async (req) => {
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

    // Use OpenAI SDK for intent classification
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const completion = await createChatCompletion(messages, {
      model: 'gpt-4.1-2025-04-14',
      temperature: 0.1,
      tools: [{
        type: 'function',
        function: {
          name: 'classify_intent',
          description: 'Classify user intent with confidence score',
          parameters: INTENT_SCHEMA
        }
      }],
      tool_choice: { type: 'function', function: { name: 'classify_intent' } }
    });

    let classification: IntentClassification;

    try {
      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        classification = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error('No tool call found');
      }
    } catch (parseError) {
      console.error('Failed to parse classification:', parseError);
      // Fallback: Try to determine intent from simple text analysis
      const lowerMessage = message.toLowerCase();
      let intent = 'unclear';
      let confidence = 0.4;
      
      if (lowerMessage.includes('pay') || lowerMessage.includes('money') || /\d+/.test(message)) {
        intent = 'payment';
        confidence = 0.7;
      } else if (lowerMessage.includes('ride') || lowerMessage.includes('moto') || lowerMessage.includes('transport')) {
        intent = 'ride'; 
        confidence = 0.7;
      } else if (lowerMessage.includes('buy') || lowerMessage.includes('shop') || lowerMessage.includes('product')) {
        intent = 'shop';
        confidence = 0.7;
      } else if (lowerMessage.includes('sell') || lowerMessage.includes('list')) {
        intent = 'list_product';
        confidence = 0.7;
      } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        intent = 'support';
        confidence = 0.7;
      } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('muraho')) {
        intent = 'greeting';
        confidence = 0.8;
      }
      
      classification = {
        intent,
        confidence,
        suggested_skill: intent === 'payment' ? 'PaymentSkill' : 
                        intent === 'ride' ? 'TransportSkill' :
                        intent === 'shop' ? 'CommerceSkill' :
                        intent === 'list_product' ? 'ListingsSkill' :
                        'GeneralSkill'
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