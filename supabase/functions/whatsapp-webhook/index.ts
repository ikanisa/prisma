import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { VectorMemory } from './utils/vector-memory.ts';
import { OpenAIService } from './utils/openai-service.ts';
import { SmartAgentRouter } from './agents/smart-router.ts';

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
    console.log('📱 Received WhatsApp webhook request');
    
    const { Body, From } = await req.json();
    const message = Body?.trim() || '';
    const whatsappNumber = From?.replace('whatsapp:', '') || '';

    console.log(`📞 Message from ${whatsappNumber}: "${message}"`);

    // Initialize AI services
    const vectorMemory = new VectorMemory();
    const openAI = new OpenAIService();
    const router = new SmartAgentRouter(supabase, vectorMemory, openAI);

    // Get or create user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', whatsappNumber)
      .single();

    let currentUser = user;
    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          phone: whatsappNumber,
          momo_code: whatsappNumber,
          credits: 60
        })
        .select()
        .single();
      currentUser = newUser;
    }

    // Store incoming message
    await supabase.from('agent_conversations').insert({
      user_id: currentUser?.id,
      message,
      role: 'user',
      ts: new Date().toISOString()
    });

    // Get conversation context from vector memory
    const context = await vectorMemory.getContext(currentUser?.id || whatsappNumber, message);
    
    // Route to appropriate AI agent and get response
    const response = await router.routeAndProcess(message, currentUser, whatsappNumber, context);

    // Store agent response
    await supabase.from('agent_conversations').insert({
      user_id: currentUser?.id,
      message: response,
      role: 'assistant',
      ts: new Date().toISOString()
    });

    // Store in vector memory for future context
    await vectorMemory.store(currentUser?.id || whatsappNumber, message, response);

    console.log(`🤖 AI Response: "${response}"`);

    // Return TwiML response
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
    console.error('❌ WhatsApp webhook error:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I'm having technical difficulties right now. Please try again in a moment! 🔧</Message>
</Response>`;

    return new Response(errorResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});