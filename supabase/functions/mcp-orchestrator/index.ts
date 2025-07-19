import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI client setup
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { thread_id, userMessage, phone_number, language = 'en' } = await req.json();

    console.log('MCP Orchestrator received:', { thread_id, userMessage, phone_number, language });

    // Get or create thread
    let threadId = thread_id;
    if (!threadId) {
      // Create new thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });
      
      if (!threadResponse.ok) {
        throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
      }
      
      const thread = await threadResponse.json();
      threadId = thread.id;

      // Store thread mapping
      await supabase.from('conversation_threads').insert({
        phone_number,
        thread_id: threadId
      });
    }

    // Add user message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${await messageResponse.text()}`);
    }

    // Get assistant configuration
    const { data: assistantConfig } = await supabase
      .from('assistant_configs')
      .select('*')
      .eq('status', 'active')
      .single();

    if (!assistantConfig) {
      throw new Error('No active assistant configuration found');
    }

    // Get available tools
    const { data: toolDefs } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('status', 'active');

    // Format tools for OpenAI
    const tools = toolDefs?.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    })) || [];

    // Create assistant run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantConfig.assistant_id || await getOrCreateAssistant(assistantConfig, tools),
        instructions: `${assistantConfig.instructions}\n\nUser language: ${language}. Always respond in the user's language.`,
        tools,
        temperature: assistantConfig.temperature
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to create run: ${await runResponse.text()}`);
    }

    const run = await runResponse.json();
    let runId = run.id;

    // Poll for completion
    let runStatus;
    const maxPolls = 30;
    let pollCount = 0;

    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);

      if (runStatus.status === 'completed') {
        break;
      } else if (runStatus.status === 'requires_action') {
        // Handle tool calls
        const toolCalls = runStatus.required_action?.submit_tool_outputs?.tool_calls || [];
        console.log('Tool calls required:', toolCalls.length);

        const toolOutputs = [];
        for (const toolCall of toolCalls) {
          try {
            const result = await executeTool(toolCall.function, supabase, phone_number);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            });
          } catch (error) {
            console.error('Tool execution error:', error);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({ error: error.message })
            });
          }
        }

        // Submit tool outputs
        const submitResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({ tool_outputs: toolOutputs })
        });

        if (!submitResponse.ok) {
          throw new Error(`Failed to submit tool outputs: ${await submitResponse.text()}`);
        }
      } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }

      pollCount++;
    }

    if (runStatus?.status !== 'completed') {
      throw new Error('Run timed out or failed to complete');
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data[0];
    const reply = assistantMessage?.content?.[0]?.text?.value || 'I apologize, but I was unable to process your request.';

    // Log conversation
    await supabase.from('conversation_messages').insert({
      phone_number,
      sender: 'user',
      message_text: userMessage,
      channel: 'whatsapp',
      model_used: assistantConfig.model
    });

    await supabase.from('conversation_messages').insert({
      phone_number,
      sender: 'assistant',
      message_text: reply,
      channel: 'whatsapp',
      model_used: assistantConfig.model
    });

    return new Response(JSON.stringify({
      reply,
      thread_id: threadId,
      model_used: assistantConfig.model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MCP Orchestrator error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      reply: 'I apologize, but I encountered an error processing your request. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getOrCreateAssistant(config: any, tools: any[]): Promise<string> {
  if (config.assistant_id) {
    return config.assistant_id;
  }

  // Create new assistant
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      name: config.name,
      model: config.model,
      instructions: config.instructions,
      tools,
      temperature: config.temperature
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create assistant: ${await response.text()}`);
  }

  const assistant = await response.json();
  
  // Update config with assistant ID
  await supabase
    .from('assistant_configs')
    .update({ assistant_id: assistant.id })
    .eq('id', config.id);

  return assistant.id;
}

async function executeTool(fnCall: { name: string; arguments: string }, supabase: any, phoneNumber: string) {
  const args = JSON.parse(fnCall.arguments || '{}');
  console.log('Executing tool:', fnCall.name, 'with args:', args);

  switch (fnCall.name) {
    case 'get_nearby_drivers':
      const { lat, lng, radius_km = 2 } = args;
      const { data: trips } = await supabase.rpc('fn_get_nearby_drivers', {
        lat,
        lng,
        radius: radius_km
      });
      return { trips: trips || [] };

    case 'create_booking':
      const { driver_trip_id, passenger_phone, pickup, dropoff, fare_rwf } = args;
      
      // First get the driver trip to get passenger intent
      const { data: driverTrip } = await supabase
        .from('driver_trips')
        .select('*')
        .eq('id', driver_trip_id)
        .single();

      if (!driverTrip) {
        throw new Error('Driver trip not found');
      }

      // Create or get passenger intent
      const { data: passengerIntent } = await supabase
        .from('passenger_intents')
        .insert({
          passenger_phone: passenger_phone || phoneNumber,
          pickup_address: pickup,
          dropoff_address: dropoff,
          seats: 1
        })
        .select()
        .single();

      // Create booking
      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          driver_trip_id,
          passenger_intent_id: passengerIntent.id,
          fare_rwf,
          status: 'confirmed',
          channel: 'whatsapp'
        })
        .select()
        .single();

      return { booking_id: booking.id, status: 'confirmed', fare_rwf };

    case 'list_properties':
      const { location, property_type, max_price, bedrooms } = args;
      let query = supabase.from('properties').select('*');
      
      if (location) query = query.ilike('location', `%${location}%`);
      if (property_type) query = query.eq('property_type', property_type);
      if (max_price) query = query.lte('price', max_price);
      if (bedrooms) query = query.eq('bedrooms', bedrooms);

      const { data: properties } = await query.limit(10);
      return { properties: properties || [] };

    case 'search_listings':
      const { category, location: listingLocation, max_price: listingMaxPrice, query: searchQuery } = args;
      let listingQuery = supabase.from('products').select('*');
      
      if (category) listingQuery = listingQuery.eq('category', category);
      if (listingLocation) listingQuery = listingQuery.ilike('location', `%${listingLocation}%`);
      if (listingMaxPrice) listingQuery = listingQuery.lte('price', listingMaxPrice);
      if (searchQuery) listingQuery = listingQuery.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

      const { data: listings } = await listingQuery.limit(10);
      return { listings: listings || [] };

    case 'generate_payment_qr':
      const { amount, merchant_code, description = 'Payment' } = args;
      // Generate QR code using existing function
      const qrResponse = await supabase.functions.invoke('generate-payment', {
        body: { amount, merchant_code, description }
      });
      
      return { 
        qr_code: qrResponse.data?.qr_code,
        payment_reference: qrResponse.data?.reference,
        amount,
        merchant_code
      };

    default:
      throw new Error(`Tool not implemented: ${fnCall.name}`);
  }
}