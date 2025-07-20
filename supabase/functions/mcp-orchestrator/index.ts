import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
});

// Tool definitions for OpenAI
const openAITools = [
  {
    type: "function",
    function: {
      name: "get_nearby_drivers",
      description: "Find active driver trips within a radius (km) of a location",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude in decimal degrees" },
          lng: { type: "number", description: "Longitude in decimal degrees" },
          radius: { type: "number", description: "Search radius in kilometres", default: 2 }
        },
        required: ["lat", "lng"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sender, channel = "whatsapp", content, lat, lng, userMessage, phone_number, language } = await req.json();
    
    // Handle different input formats
    const messageContent = content || userMessage;
    const userPhone = sender || phone_number;
    const userLat = lat;
    const userLng = lng;

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    console.log(`Processing message from ${userPhone}: ${messageContent}`);

    // Determine if this might be a trip-related request
    const tripPatterns = [
      /trip|ride|transport|travel|go to|need to get to/i,
      /kigali|rubavu|huye|musanze|nyanza|karongi/i,
      /driver|passenger|seat|price|rwf/i
    ];

    const isLikelyTripRequest = tripPatterns.some(pattern => pattern.test(messageContent));

    // Try specialized trip handlers first
    if (isLikelyTripRequest) {
      console.log("Trying trip-specific handlers...");
      
      // Try driver trip creation
      const driverResponse = await supabase.functions.invoke("driver-trip-create", {
        body: { from: userPhone, text: messageContent, message_id: crypto.randomUUID() }
      });
      
      if (driverResponse.data?.handled) {
        console.log("Handled by driver-trip-create");
        return new Response(
          JSON.stringify({ success: true, handler: "driver-trip-create" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try passenger intent creation
      const passengerResponse = await supabase.functions.invoke("passenger-intent-create", {
        body: { from: userPhone, text: messageContent, message_id: crypto.randomUUID() }
      });
      
      if (passengerResponse.data?.handled) {
        console.log("Handled by passenger-intent-create");
        return new Response(
          JSON.stringify({ success: true, handler: "passenger-intent-create" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fall back to general AI conversation
    console.log("Using general AI conversation...");

    const systemPrompt = `You are easyMO's autonomous multi-service assistant on WhatsApp. 
You help with:
- Ride sharing (drivers and passengers) 
- Mobile money payments
- Marketplace listings
- Event bookings
- General business support

Respond in a friendly, helpful manner. Keep responses concise (under 640 characters).
Use Kinyarwanda when appropriate, English as fallback.
If users mention trips, rides, or transport, explain how they can post "Trip: [from] → [to] [seats] [price]" for drivers
or "Need ride [from] → [to] [seats] [budget]" for passengers.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: messageContent }
    ];

    // Check if location-based tools might be needed
    let tools = undefined;
    if (userLat && userLng && /nearby|close|around|find.*driver/i.test(messageContent)) {
      tools = openAITools;
    }

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: tools ? "auto" : undefined,
        temperature: 0.4,
        max_tokens: 500
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API error: ${completion.status}`);
    }

    const result = await completion.json();
    let finalAnswer = "";

    // Handle tool calls if any
    const message = result.choices[0].message;
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      
      if (toolCall.function.name === "get_nearby_drivers") {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Use provided coordinates or defaults
        const searchLat = args.lat || userLat || -1.9579;
        const searchLng = args.lng || userLng || 30.1127;
        const radius = args.radius || 2;

        console.log(`Searching for drivers near ${searchLat}, ${searchLng} within ${radius}km`);

        const { data: drivers, error } = await supabase.rpc("fn_get_nearby_drivers_spatial", {
          lat: searchLat,
          lng: searchLng,
          radius
        });

        if (error) {
          console.error("Error fetching nearby drivers:", error);
          finalAnswer = "Sorry, I couldn't find nearby drivers right now. Please try again later.";
        } else {
          // Generate response with tool results
          const toolMessages = [
            ...messages,
            message,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              name: "get_nearby_drivers",
              content: JSON.stringify(drivers || [])
            }
          ];

          const toolCompletion = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: toolMessages,
              temperature: 0.4,
              max_tokens: 500
            })
          });

          const toolResult = await toolCompletion.json();
          finalAnswer = toolResult.choices[0].message.content;
        }
      }
    } else {
      finalAnswer = message.content;
    }

    // Send response via channel gateway
    if (finalAnswer) {
      await supabase.functions.invoke("channel-gateway", {
        body: {
          channel,
          recipient: userPhone,
          message: finalAnswer,
          message_type: "text"
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reply: finalAnswer,
        handler: "mcp-orchestrator"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("MCP orchestrator error:", error);
    
    // Try to send a fallback message
    try {
      const { sender, phone_number } = await req.json();
      const userPhone = sender || phone_number;
      
      if (userPhone) {
        await supabase.functions.invoke("channel-gateway", {
          body: {
            channel: "whatsapp",
            recipient: userPhone,
            message: "Hi! I'm experiencing some technical difficulties. Please try again in a moment.",
            message_type: "text"
          }
        });
      }
    } catch (fallbackError) {
      console.error("Fallback message failed:", fallbackError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});