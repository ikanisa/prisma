import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        model: "gpt-4.1-2025-04-14",
        instructions: `You are the easyMO Omni Assistant - Rwanda's #1 AI for instant action-based services.

🎯 MISSION: Transform user messages into ONE-TAP actions for payments, rides, business discovery, and onboarding.

🔄 WORKFLOW:
1. ALWAYS call getUserContext() first to understand user
2. Call detectIntentAndSlots to analyze message  
3. Respond with action templates using composeWhatsAppMessage - NEVER plain text

🎛 ONBOARDING FLOWS:
💰 FAST PAYMENTS: Pure numbers (e.g. "1000") → if user has momo_number → pay_offer_v1, else ask_momo_v1
🛵 DRIVER SIGNUP: "driver", "moto" → partner_type_v1 → driver_form_v1 → OCR verification
🏪 BUSINESS SIGNUP: "business", "shop", "pharmacy" → partner_type_v1 → business_form_v1
✅ POST-SERVICE: After successful transaction → marketing_menu_v1 with more services

📍 GEO & LISTING FLOWS:
🔍 LOCATION REQUEST: If intent requires location AND latest location ≤ 2h missing → geo_request_v1 template
📱 LOCATION RECEIVED: After webhook type=location → saveUserLocation → searchNearby → listing_* template  
🚗 DRIVER LISTING: "drivers", "transport" → geo_request_v1 → listing_drivers_v1 with chat buttons
🏥 PHARMACY LISTING: "pharmacy", "medicine" → geo_request_v1 → listing_pharmacies_v1 with chat buttons

📱 RESPONSE RULES:
- ONE message per domain with ALL relevant buttons (max 3)
- Use composeWhatsAppMessage with template payloads
- Include emojis and concise copy for mobile
- If confidence < 0.6: clarify template with 3 refinement buttons
- Each listing_* template MUST include Chat URL buttons automatically populated with wa_number

🧠 PERSONALIZATION:
- Use getUserContext for previous preferences and onboarding stage
- Update user profile after successful interactions
- For new users: prioritize fast payment path or partner onboarding
- For returning users: suggest based on history

CRITICAL: Never ask open-ended questions. Always provide action buttons. Guide users through complete onboarding journeys.`,
    
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
          name: "isNewUser",
          description: "Check if user is new to the platform for onboarding flow",
          parameters: {
            type: "object",
            properties: {
              waId: { type: "string", description: "WhatsApp user ID" }
            },
            required: ["waId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getMissingUserData", 
          description: "Check what data is missing from user profile for onboarding",
          parameters: {
            type: "object",
            properties: {
              userId: { type: "string", description: "User ID" },
              requiredFields: { 
                type: "array",
                items: { type: "string" },
                description: "Fields to check (e.g. momo_number, business_name)"
              }
            },
            required: ["userId"]
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
              template: {
                type: "string",
                enum: ["ask_momo_v1", "pay_offer_v1", "marketing_menu_v1", "partner_type_v1", "driver_form_v1", "pharmacy_form_v1", "summary_confirm_v1"],
                description: "Template name for predefined message types"
              },
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
      },
      {
        type: "function",
        function: {
          name: "updateMomoNumber",
          description: "Update user's mobile money number for payments",
          parameters: {
            type: "object", 
            properties: {
              userId: { type: "string", description: "User ID" },
              momoNumber: { type: "string", description: "Mobile money number" },
              momoCode: { type: "string", description: "Mobile money code (optional)" }
            },
            required: ["userId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "ocrDocument",
          description: "Extract information from document images using OCR",
          parameters: {
            type: "object",
            properties: {
              imageUrl: { type: "string", description: "URL of the document image" },
              documentType: { 
                type: "string",
                enum: ["logbook", "business_license", "general"],
                description: "Type of document for specialized extraction"
              }
            },
            required: ["imageUrl"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "onboardingHandler",
          description: "Handle onboarding workflows for drivers and businesses",
          parameters: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["start_driver_onboarding", "start_business_onboarding", "confirm_data", "update_onboarding_stage"],
                description: "Onboarding action to perform"
              },
              userId: { type: "string", description: "User ID" },
              payload: { 
                type: "object",
                description: "Action-specific data payload"
              }
            },
            required: ["action", "userId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "saveUserLocation",
          description: "Save user's location coordinates for geo-based services",
          parameters: {
            type: "object",
            properties: {
              waId: { type: "string", description: "User's WhatsApp ID" },
              phoneNumber: { type: "string", description: "User's phone number" },
              latitude: { type: "number", description: "Latitude coordinate" },
              longitude: { type: "number", description: "Longitude coordinate" }
            },
            required: ["latitude", "longitude"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "searchNearby",
          description: "Search for nearby drivers, pharmacies, or businesses based on user location",
          parameters: {
            type: "object",
            properties: {
              waId: { type: "string", description: "User's WhatsApp ID" },
              phoneNumber: { type: "string", description: "User's phone number" },
              domain: { 
                type: "string", 
                enum: ["driver", "drivers", "pharmacy", "pharmacies", "business"],
                description: "Type of service to search for"
              },
              radiusKm: { type: "number", default: 5, description: "Search radius in kilometers" }
            },
            required: ["domain"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consolidateMemory",
          description: "Store conversation insights and learning patterns in user memory",
          parameters: {
            type: "object",
            properties: {
              userId: { type: "string", description: "User ID" },
              conversationSummary: { type: "string", description: "Summary of conversation interactions" },
              learningInsights: {
                type: "object",
                description: "Learning insights including preferences, patterns, and improvements",
                properties: {
                  preferences: { type: "object", description: "User preferences discovered" },
                  patterns: { type: "object", description: "User behavior patterns" },
                  improvements: { type: "string", description: "Suggestions for improvement" },
                  confidence: { type: "number", description: "Confidence level of insights" }
                }
              }
            },
            required: ["userId"]
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