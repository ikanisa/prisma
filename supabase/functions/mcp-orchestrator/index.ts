import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeTool } from "./toolRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ASSISTANT_ID = Deno.env.get("ASSISTANT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
});

// Enhanced Tool definitions for Assistant v2
const assistantTools = [
  {
    type: "function",
    function: {
      name: "get_nearby_drivers",
      description: "Find active driver trips within a radius of a location",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude in decimal degrees" },
          lng: { type: "number", description: "Longitude in decimal degrees" },
          radius_km: { type: "number", description: "Search radius in kilometres", default: 2 }
        },
        required: ["lat", "lng"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a booking between passenger and driver",
      parameters: {
        type: "object",
        properties: {
          driver_trip_id: { type: "string", description: "Driver trip ID" },
          passenger_phone: { type: "string", description: "Passenger phone number" },
          pickup: { type: "string", description: "Pickup location" },
          dropoff: { type: "string", description: "Dropoff location" },
          fare_rwf: { type: "number", description: "Fare in Rwandan francs" }
        },
        required: ["driver_trip_id", "passenger_phone", "pickup", "dropoff"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_listings",
      description: "Search marketplace product listings",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", description: "Product category" },
          max_price: { type: "number", description: "Maximum price in RWF" }
        }
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "generate_qr",
      description: "Generate mobile money QR code for payment",
      parameters: {
        type: "object",
        properties: {
          amount_rwf: { type: "number", description: "Amount in Rwandan francs" },
          phone_number: { type: "string", description: "Customer phone number" },
          reference: { type: "string", description: "Payment reference" }
        },
        required: ["amount_rwf", "phone_number"]
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

    // Use Assistant v2 API for intelligent conversation with tool calling
    console.log("Using Assistant v2 API...");

    if (!ASSISTANT_ID) {
      throw new Error("Assistant ID not configured. Please create an assistant first.");
    }

    // 1. Get or create thread for this conversation
    const { data: threadData } = await supabase
      .from('conversation_threads')
      .select('thread_id')
      .eq('phone_number', userPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let threadId = threadData?.thread_id;

    if (!threadId) {
      // Create new thread
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({})
      });

      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const thread = await threadResponse.json();
      threadId = thread.id;

      // Store thread in database
      await supabase.from('conversation_threads').insert({
        thread_id: threadId,
        phone_number: userPhone,
        status: 'active'
      });
    }

    // 2. Add user message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: messageContent
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${messageResponse.status}`);
    }

    // 3. Create and run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        instructions: `Respond in user's preferred language. User location: ${userLat ? `${userLat}, ${userLng}` : 'unknown'}`,
        tools: assistantTools
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to create run: ${runResponse.status}`);
    }

    const run = await runResponse.json();
    let runStatus = run;

    // 4. Poll for completion or tool calls
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      if (attempts >= maxAttempts) {
        throw new Error("Assistant run timeout");
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      runStatus = await statusResponse.json();
      attempts++;
    }

    let finalAnswer = "";

    // 5. Handle tool calls if required
    if (runStatus.status === "requires_action") {
      const toolCalls = runStatus.required_action?.submit_tool_outputs?.tool_calls || [];
      const toolOutputs = [];

      console.log(`Processing ${toolCalls.length} tool calls`);

      for (const toolCall of toolCalls) {
        try {
          const toolResult = await executeTool(toolCall.function);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(toolResult)
          });
        } catch (error) {
          console.error(`Tool execution error for ${toolCall.function.name}:`, error);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({ error: error.message })
          });
        }
      }

      // Submit tool outputs
      const submitResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/submit_tool_outputs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          tool_outputs: toolOutputs
        })
      });

      if (!submitResponse.ok) {
        throw new Error(`Failed to submit tool outputs: ${submitResponse.status}`);
      }

      // Wait for final completion
      runStatus = await submitResponse.json();
      attempts = 0;

      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        if (attempts >= maxAttempts) {
          throw new Error("Assistant run timeout after tool execution");
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });

        runStatus = await statusResponse.json();
        attempts++;
      }
    }

    // 6. Get the final response
    if (runStatus.status === "completed") {
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0]; // Most recent message
      
      if (lastMessage && lastMessage.role === "assistant") {
        finalAnswer = lastMessage.content[0]?.text?.value || "I'm sorry, I couldn't generate a response.";
      }
    } else {
      console.error("Assistant run failed:", runStatus);
      finalAnswer = "I'm sorry, I'm having trouble processing your request right now. Please try again.";
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