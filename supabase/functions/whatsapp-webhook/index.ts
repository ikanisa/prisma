import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AgentRouter } from './agents/router.ts';
import { MessageProcessor } from './utils/message-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { Body, From } = await req.json();
    const message = Body?.trim() || '';
    const whatsappNumber = From?.replace('whatsapp:', '') || '';

    console.log(`Received message from ${whatsappNumber}: ${message}`);

    // Store conversation in database
    await supabase.from('agent_conversations').insert({
      user_id: null, // Will be updated after user lookup
      message,
      role: 'user',
      ts: new Date().toISOString()
    });

    // Process message and get response
    const processor = new MessageProcessor(supabase);
    const router = new AgentRouter(supabase);
    
    const user = await processor.getOrCreateUser(whatsappNumber);
    const response = await router.routeMessage(message, user, whatsappNumber);

    // Store agent response
    await supabase.from('agent_conversations').insert({
      user_id: user.id,
      message: response,
      role: 'assistant',
      ts: new Date().toISOString()
    });

    console.log(`Response to ${whatsappNumber}: ${response}`);

    // Return TwiML response for WhatsApp
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`;

    return new Response(twimlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble right now. Please try again later.</Message>
</Response>`;

    return new Response(errorResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});