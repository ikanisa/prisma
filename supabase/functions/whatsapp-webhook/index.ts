import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === Deno.env.get("META_WABA_VERIFY_TOKEN")) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📱 Incoming WhatsApp webhook:", JSON.stringify(body, null, 2));

      // Route to Autonomous Master Agent for intelligent processing
      return await routeToAutonomousAgent(body);

    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      return new Response(JSON.stringify({ error: 'Processing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function routeToAutonomousAgent(webhookBody: any) {
  console.log('🧠 Routing to Autonomous Master Agent...');
  
  // Extract message data
  const entry = webhookBody.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;
  const contacts = value?.contacts;
  
  // Skip status updates (delivery confirmations, read receipts)
  if (value?.statuses) {
    console.log('📨 Received status update, skipping processing');
    return new Response(JSON.stringify({ status: 'status_update_ignored' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (!messages?.[0]) {
    return new Response(JSON.stringify({ status: 'no_message' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const message = messages[0];
  const contact = contacts?.[0];
  
  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Store/update contact information
  try {
    await supabase.from('wa_contacts').upsert({
      wa_id: message.from,
      profile_name: contact?.profile?.name || 'Unknown',
      phone_number: message.from,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'wa_id',
      ignoreDuplicates: false 
    });
  } catch (error) {
    console.error('Contact storage error:', error);
  }
  
  // Check for duplicate messages
  try {
    const { data: existingMessage } = await supabase
      .from('incoming_messages')
      .select('id')
      .eq('raw_payload->>id', message.id)
      .single();

    if (existingMessage) {
      console.log(`⚠️ Duplicate message ID detected, skipping: ${message.id}`);
      return new Response(JSON.stringify({ status: 'duplicate_message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    // Not found is expected for new messages
  }
  
  // Store incoming message
  try {
    const timestamp = new Date(parseInt(message.timestamp) * 1000);
    await supabase.from('incoming_messages').insert({
      from_number: message.from,
      message_type: message.type,
      message_text: message.text?.body || null,
      raw_payload: message,
      created_at: timestamp.toISOString()
    });
  } catch (error) {
    console.error('Message storage error:', error);
  }
  
  // Extract message content based on type
  let messageContent = '';
  
  switch (message.type) {
    case 'text':
      messageContent = message.text?.body || '';
      break;
    case 'interactive':
      messageContent = message.interactive?.button_reply?.title || 
                      message.interactive?.list_reply?.title || 
                      'Interactive message';
      break;
    case 'button':
      messageContent = message.button?.text || 'Button pressed';
      break;
    case 'location':
      messageContent = `Location shared: ${message.location?.latitude}, ${message.location?.longitude}`;
      break;
    case 'image':
    case 'document':
    case 'audio':
    case 'video':
      messageContent = `${message.type} file shared`;
      break;
    default:
      messageContent = `${message.type} message`;
  }
  
  // Prepare agent request
  const agentRequest = {
    message: messageContent,
    phone: message.from,
    contact_name: contact?.profile?.name,
    message_id: message.id,
    context: {
      webhook_body: webhookBody,
      message_type: message.type,
      timestamp: message.timestamp,
      message_data: message
    }
  };
  
  try {
    // Call Autonomous Master Agent
    const { data, error } = await supabase.functions.invoke('autonomous-master-agent', {
      body: agentRequest
    });
    
    if (error) {
      console.error('❌ Autonomous Agent Error:', error);
      
      // Fallback to simple response
      const fallbackMessage = "Hello! I'm Aline, your easyMO assistant. I'm currently updating my systems to serve you better. Please try again in a moment, or send 'help' for basic assistance.";
      await sendWhatsAppMessage(message.from, fallbackMessage);
      
      return new Response(JSON.stringify({ 
        status: 'fallback_processed',
        error: error.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('✅ Autonomous Agent Response:', data);
      
      // Send response via WhatsApp
      if (data.response) {
        await sendWhatsAppMessage(message.from, data.response);
      }
      
      return new Response(JSON.stringify({ 
        status: 'processed',
        agent_used: 'autonomous-master-agent',
        success: true,
        confidence: data.confidence,
        skills_used: data.skills_used
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Routing Error:', error);
    
    // Emergency fallback
    const emergencyMessage = "🤖 Hi! I'm Aline, your easyMO assistant. I'm experiencing temporary technical difficulties. Please try again shortly or contact our support team.";
    await sendWhatsAppMessage(message.from, emergencyMessage);
    
    return new Response(JSON.stringify({ 
      status: 'emergency_fallback',
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  
  if (!whatsappToken || !phoneNumberId) {
    console.error('❌ WhatsApp credentials missing');
    return false;
  }
  
  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });
    
    if (response.ok) {
      console.log('✅ WhatsApp message sent successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ WhatsApp message failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return false;
  }
}