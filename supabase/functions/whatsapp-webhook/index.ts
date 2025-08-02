import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Bootstrap conversation helper
interface BootResult {
  contactId: string;
  conversationId: string;
  contactLang: string;
}

async function bootstrapContactConversation(
  waId: string,
  displayName: string | null
): Promise<BootResult> {
  // 1️⃣ upsert contact
  const { data: contact } = await supabase
    .from('contacts')
    .upsert({ 
      wa_id: waId, 
      display_name: displayName, 
      phone_number: waId,
      name: displayName 
    }, { 
      onConflict: 'wa_id', 
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (!contact) {
    throw new Error('Failed to create or find contact');
  }

  // 2️⃣ fetch or create conversation (24 h window)
  const { data: lastConv } = await supabase
     .from('conversations')
     .select('*')
     .eq('contact_id', contact.id)
     .order('started_at', { ascending: false })
     .limit(1)
     .maybeSingle();

  let conversationId: string;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  if (!lastConv || now - new Date(lastConv.last_message_at ?? lastConv.started_at).getTime() > twentyFourHours) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ 
        contact_id: contact.id, 
        started_at: new Date(), 
        last_message_at: new Date() 
      })
      .select()
      .single();
    
    if (!newConv) {
      throw new Error('Failed to create conversation');
    }
    conversationId = newConv.id;
  } else {
    conversationId = lastConv.id;
    await supabase.from('conversations')
      .update({ last_message_at: new Date() })
      .eq('id', conversationId);
  }

  return { 
    contactId: contact.id, 
    conversationId, 
    contactLang: contact.language || 'en' 
  };
}

import { handleInbound } from '../../../packages/agent-intel/dist/index.js';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.json();
    console.log('📥 WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Handle webhook verification
    if (body.hub && body.hub.challenge) {
      console.log('✅ Webhook verification successful');
      return new Response(body.hub.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    // Process incoming message
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const contacts = body.entry[0].changes[0].value.contacts;
      
      if (!contacts || !contacts[0]) {
        console.log('❌ No contact information found');
        return new Response('No contact info', { status: 400, headers: corsHeaders });
      }

      const waId = contacts[0].wa_id;
      const displayName = contacts[0].profile?.name || null;
      
      console.log(`📱 Processing message from ${waId} (${displayName})`);

      // 🔹 Ensure contact & conversation exist
      const { contactId, conversationId, contactLang } = await bootstrapContactConversation(waId, displayName);
      console.log(`✅ Bootstrap complete - Contact: ${contactId}, Conversation: ${conversationId}`);

      // Process the message based on type
      let response = '';
      let buttons: Array<{ text: string; payload: string }> = [];

      // Delegate to intelligent response layer
      const inboundEvent = {
        wa_id: waId,
        from: waId,
        text: message.type === 'text' ? message.text.body : undefined,
        payload: message.type === 'button' ? message.button.payload : undefined,
        media: message.type !== 'text' ? message[message.type]?.url : undefined
      };
      const outbound = await handleInbound(inboundEvent);
      response = outbound.text ?? '';
      buttons = outbound.buttons ?? [];

      // Persist outgoing
      await supabase.from('outgoing_messages').insert({
        conversation_id: conversationId,
        contact_id: contactId,
        role: 'assistant',
        message: response,
        metadata: { buttons, agent: 'intel' }
      });

      // Send via existing WA function
      await supabase.functions.invoke('send-whatsapp-message', {
        body: { to: waId, text: response, buttons }
      });

      // Update conversation last_message_at
      await supabase.from('conversations')
        .update({ last_message_at: new Date() })
        .eq('id', conversationId);

      console.log('✅ Message processed successfully');
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

async function sendWhatsAppMessage(
  to: string, 
  text: string, 
  buttons: Array<{ text: string; payload: string }> = []
) {
  const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  
  if (!whatsappToken || !whatsappPhoneId) {
    console.log('⚠️ WhatsApp credentials not configured, simulating send');
    console.log(`📤 Would send to ${to}: ${text}`);
    if (buttons.length) {
      console.log(`🔘 With buttons:`, buttons);
    }
    return;
  }

  try {
    let messageBody: any = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    };

    // Add interactive buttons if provided
    if (buttons.length > 0) {
      messageBody = {
        messaging_product: "whatsapp",
        to: to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: text },
          action: {
            buttons: buttons.slice(0, 3).map((btn, index) => ({
              type: "reply",
              reply: {
                id: btn.payload,
                title: btn.text.substring(0, 20) // WhatsApp button title limit
              }
            }))
          }
        }
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    );

    if (response.ok) {
      console.log('📤 WhatsApp message sent successfully');
    } else {
      const error = await response.text();
      console.error('❌ Failed to send WhatsApp message:', error);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}
