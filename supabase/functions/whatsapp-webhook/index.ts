import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Simple agent executor
function generateSimpleResponse(input: string): string {
  const normalizedInput = input.toLowerCase();
  
  if (normalizedInput.includes('pay') || normalizedInput.includes('payment') || normalizedInput.includes('qr')) {
    return "I can help you with payments! Would you like to generate a QR code to receive money or pay someone?";
  }
  
  if (normalizedInput.includes('trip') || normalizedInput.includes('driver') || normalizedInput.includes('ride')) {
    return "I can help you with transportation! Are you looking for a ride or do you want to offer one as a driver?";
  }
  
  if (normalizedInput.includes('order') || normalizedInput.includes('buy') || normalizedInput.includes('product')) {
    return "I can help you with orders! What would you like to buy - products from a pharmacy, hardware store, or farm?";
  }
  
  return "Hello! I'm your easyMO assistant. I can help you with payments, trips, orders, and more. What would you like to do today?";
}

function getRecommendedButtons(input: string): Array<{ text: string; payload: string }> {
  const normalizedInput = input.toLowerCase();
  
  if (normalizedInput.includes('pay') || normalizedInput.includes('payment')) {
    return [
      { text: "Generate QR", payload: "payment_qr_generate" },
      { text: "Scan QR", payload: "payment_scan_qr" },
      { text: "Send Money", payload: "payment_send_money" }
    ];
  }
  
  if (normalizedInput.includes('trip') || normalizedInput.includes('driver')) {
    return [
      { text: "Find Driver", payload: "mobility_find_driver" },
      { text: "Offer Trip", payload: "mobility_offer_trip" },
      { text: "My Location", payload: "mobility_share_location" }
    ];
  }
  
  if (normalizedInput.includes('order') || normalizedInput.includes('buy')) {
    return [
      { text: "Pharmacy", payload: "order_pharmacy" },
      { text: "Hardware", payload: "order_hardware" },
      { text: "Fresh Produce", payload: "order_farmers" }
    ];
  }
  
  // Default buttons for welcome/unknown input
  return [
    { text: "💸 Payments", payload: "domain_payments" },
    { text: "🚖 Transport", payload: "domain_mobility" },
    { text: "🛒 Orders", payload: "domain_ordering" },
    { text: "🏠 Listings", payload: "domain_listings" }
  ];
}

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

      if (message.type === 'text') {
        const messageText = message.text.body;
        console.log(`💬 Text message: "${messageText}"`);

        // Use the simple agent to generate response
        response = generateSimpleResponse(messageText);
        buttons = getRecommendedButtons(messageText);
      } else {
        response = `I received your ${message.type} message. For now, I work best with text messages. How can I help you today?`;
        buttons = [
          { text: "💸 Payments", payload: "domain_payments" },
          { text: "🚖 Transport", payload: "domain_mobility" },
          { text: "🛒 Orders", payload: "domain_ordering" }
        ];
      }

      // Send response back to WhatsApp
      await sendWhatsAppMessage(waId, response, buttons);

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