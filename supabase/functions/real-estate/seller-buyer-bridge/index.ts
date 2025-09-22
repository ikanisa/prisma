import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message, message_type } = await req.json();
    
    console.log(`🌉 Bridge processing message from ${phone_number}: "${message}"`);

    // Find active conversation bridges for this phone number
    const { data: bridges, error } = await supabase
      .from('conversation_bridges')
      .select('*')
      .or(`buyer_phone.eq.${phone_number},seller_phone.eq.${phone_number}`)
      .eq('status', 'active');

    if (error) {
      console.error('Bridge lookup error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to find conversation bridge' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!bridges || bridges.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active conversation bridge found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process each bridge (in case user has multiple conversations)
    for (const bridge of bridges) {
      await processBridgeMessage(bridge, phone_number, message, message_type);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      bridges_processed: bridges.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Seller-Buyer Bridge error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processBridgeMessage(bridge: any, senderPhone: string, message: string, messageType: string) {
  const isBuyer = bridge.buyer_phone === senderPhone;
  const isSeller = bridge.seller_phone === senderPhone;
  
  if (!isBuyer && !isSeller) {
    console.log('Message not from bridge participants');
    return;
  }

  const recipientPhone = isBuyer ? bridge.seller_phone : bridge.buyer_phone;
  const senderRole = isBuyer ? 'buyer' : 'seller';
  const recipientRole = isBuyer ? 'seller' : 'buyer';

  // Log the conversation
  await supabase
    .from('bridge_conversations')
    .insert({
      bridge_id: bridge.id,
      sender_phone: senderPhone,
      sender_role: senderRole,
      message: message,
      message_type: messageType || 'text'
    });

  // Get item details for context
  let itemDetails = '';
  if (bridge.item_type === 'vehicle') {
    const { data: vehicle } = await supabase
      .from('tbl_vehicles')
      .select('title')
      .eq('id', bridge.item_id)
      .single();
    itemDetails = vehicle?.title || 'Vehicle';
  } else if (bridge.item_type === 'property') {
    const { data: property } = await supabase
      .from('tbl_properties')
      .select('title')
      .eq('id', bridge.item_id)
      .single();
    itemDetails = property?.title || 'Property';
  }

  // Forward message to recipient with context
  const forwardedMessage = `💬 **Message about ${itemDetails}**\n\n` +
                          `👤 ${senderRole === 'buyer' ? 'Buyer' : 'Seller'}: "${message}"\n\n` +
                          `Reply to continue the conversation! 🗣️`;

  await sendWhatsAppMessage(recipientPhone, forwardedMessage);

  // Update bridge activity
  await supabase
    .from('conversation_bridges')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (bridge.message_count || 0) + 1
    })
    .eq('id', bridge.id);

  // Check for conversation completion keywords
  await checkConversationCompletion(bridge, message, senderRole);
}

async function checkConversationCompletion(bridge: any, message: string, senderRole: string) {
  const completionKeywords = [
    'deal closed', 'agreed', 'will take it', 'sold', 'rented',
    'payment complete', 'keys handed', 'transaction complete'
  ];

  const lowerMessage = message.toLowerCase();
  const hasCompletionKeyword = completionKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );

  if (hasCompletionKeyword) {
    // Mark bridge as completed
    await supabase
      .from('conversation_bridges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_reason: `${senderRole} indicated transaction completion`
      })
      .eq('id', bridge.id);

    // Send completion notification to both parties
    const completionMessage = `✅ **Transaction Update**\n\n` +
                            `It looks like your transaction may be complete! 🎉\n\n` +
                            `If you need any further assistance or want to leave feedback, just message me!\n\n` +
                            `Thank you for using our platform! 🙏`;

    await sendWhatsAppMessage(bridge.buyer_phone, completionMessage);
    await sendWhatsAppMessage(bridge.seller_phone, completionMessage);

    // Log successful transaction
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'seller-buyer-bridge',
        user_id: bridge.buyer_phone,
        input_data: { 
          action: 'transaction_completed',
          bridge_id: bridge.id,
          item_type: bridge.item_type,
          item_id: bridge.item_id
        },
        execution_time_ms: 0,
        success_status: true,
        timestamp: new Date().toISOString()
      });
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!whatsappToken || !whatsappPhoneId) {
    console.log('WhatsApp not configured, would send:', message);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
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

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}
