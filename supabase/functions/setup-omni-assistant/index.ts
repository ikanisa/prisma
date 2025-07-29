import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'create' } = await req.json();

    if (action === 'create') {
      return await createEasyMOOmniAssistant();
    } else if (action === 'list') {
      return await listAssistants();
    } else if (action === 'delete') {
      const { assistantId } = await req.json();
      return await deleteAssistant(assistantId);
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Setup assistant error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createEasyMOOmniAssistant() {
  console.log('🚀 Creating easyMO Omni Assistant V2...');

  const assistantPayload = {
    name: "easyMO_Omni_V2",
    model: "gpt-4o",
    instructions: `You are the easyMO Omni Assistant for Rwanda's WhatsApp super-app.

CORE MISSION:
• Always consult getUserContext before deciding
• Output ONLY tool calls or structured JSON payloads—never long text responses
• Respond with interactive buttons that enable one-tap actions
• When intent=payment include buttons: Create QR, Send Money, Scan QR
• When intent=ride include buttons: Book Ride, Drivers near me, Ride Share
• When intent=find_business include buttons: Nearby options based on query
• If confidence <0.4 send clarify template with refine button
• Use memory to personalize suggestions based on user history
• Keep responses under 160 characters, prioritize action buttons

RESPONSE STRATEGY:
1. First call getUserContext to understand user profile and preferences
2. Then call detectIntentAndSlots to understand what they want
3. Based on intent, use composeWhatsAppMessage with interactive buttons
4. For payments: Always offer QR code generation, mobile money options
5. For rides: Show available drivers, fare estimates, booking options
6. For business search: List nearby businesses with contact/direction buttons
7. For unclear requests: Send clarification template with service options

CRITICAL RULES:
• NEVER send plain text responses - always use composeWhatsAppMessage tool
• ALWAYS include interactive buttons for user actions
• Responses must be concise and action-oriented
• Use Rwandan context (RWF currency, local places, Kinyarwanda greetings)
• Maintain conversation history for personalized experience
• Update user profile with new preferences after successful interactions`,
    
    tools: [
      {
        type: "function",
        function: {
          name: "getUserContext",
          description: "Get comprehensive user context including profile, preferences, and recent activity",
          parameters: {
            type: "object",
            properties: {
              phoneNumber: { type: "string", description: "User's phone number" }
            },
            required: ["phoneNumber"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "detectIntentAndSlots",
          description: "Detect user intent and extract relevant slots from user message",
          parameters: {
            type: "object",
            properties: {
              userText: { type: "string", description: "User's message to analyze" }
            },
            required: ["userText"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "composeWhatsAppMessage",
          description: "Send WhatsApp message with interactive buttons or templates",
          parameters: {
            type: "object",
            properties: {
              mode: { 
                type: "string", 
                enum: ["text", "interactive", "template"],
                description: "Message mode - use 'interactive' for buttons"
              },
              recipient: { type: "string", description: "Recipient phone number" },
              content: { 
                type: "object",
                description: "Message content including buttons for interactive mode"
              }
            },
            required: ["mode", "recipient"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "createMoMoPaymentLink",
          description: "Create a mobile money payment QR code or USSD link",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Payment amount in RWF" },
              currency: { type: "string", default: "RWF" },
              description: { type: "string", description: "Payment description" },
              recipientPhone: { type: "string", description: "Recipient phone number" }
            },
            required: ["amount"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generateQRCodeSVG", 
          description: "Generate QR code SVG for payment or data sharing",
          parameters: {
            type: "object",
            properties: {
              data: { type: "string", description: "Data to encode in QR code" },
              size: { type: "number", default: 256, description: "QR code size in pixels" }
            },
            required: ["data"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "searchBusinesses",
          description: "Search for nearby businesses based on category, location, or keyword",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query or business type" },
              category: { type: "string", description: "Business category" },
              location: { type: "string", description: "Search location" },
              limit: { type: "number", default: 5, description: "Maximum results" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "bookRide",
          description: "Book a ride from pickup to destination",
          parameters: {
            type: "object",
            properties: {
              pickupLocation: { type: "string", description: "Pickup location" },
              destination: { type: "string", description: "Destination" },
              passengerPhone: { type: "string", description: "Passenger phone number" },
              rideType: { 
                type: "string", 
                enum: ["moto", "car", "shared"], 
                default: "moto",
                description: "Type of ride"
              }
            },
            required: ["pickupLocation", "destination", "passengerPhone"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "updateUserProfile",
          description: "Update user profile with preferences or new information", 
          parameters: {
            type: "object",
            properties: {
              phoneNumber: { type: "string", description: "User's phone number" },
              updates: { 
                type: "object",
                description: "Profile updates like preferred_service, location, etc."
              }
            },
            required: ["phoneNumber", "updates"]
          }
        }
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    metadata: {
      project: "easyMO",
      version: "omni-v2", 
      created_at: new Date().toISOString(),
      capabilities: "payments,rides,business_search,qr_generation"
    }
  };

  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify(assistantPayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const assistant = await response.json();
  
  // Store assistant config in Supabase
  await supabase.from('assistant_configs').upsert({
    name: assistant.name,
    assistant_id: assistant.id,
    model: assistant.model,
    instructions: assistant.instructions,
    tools: assistant.tools,
    temperature: assistant.temperature,
    status: 'active'
  }, {
    onConflict: 'name'
  });

  console.log('✅ easyMO Omni Assistant created successfully:', assistant.id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      assistant,
      message: `🎉 Assistant easyMO_Omni_V2 created with ID: ${assistant.id}`,
      next_steps: [
        "Test with: 'Pay 5000' -> should show payment buttons",
        "Test with: 'Ride to town' -> should show ride booking buttons", 
        "Test with: 'Find pharmacy' -> should show nearby businesses"
      ]
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listAssistants() {
  const response = await fetch('https://api.openai.com/v1/assistants', {
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({ 
      success: true, 
      assistants: data.data,
      count: data.data.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteAssistant(assistantId: string) {
  const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  // Remove from Supabase
  await supabase
    .from('assistant_configs')
    .delete()
    .eq('assistant_id', assistantId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Assistant ${assistantId} deleted successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}