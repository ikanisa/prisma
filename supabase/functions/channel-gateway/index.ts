import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel, recipient, message, message_type = 'text' } = await req.json();
    
    console.log(`📤 Sending ${channel} message to ${recipient}`);

    if (channel === 'whatsapp') {
      return await sendWhatsAppMessage(recipient, message);
    } else if (channel === 'telegram') {
      return await sendTelegramMessage(recipient, message);
    } else {
      throw new Error(`Unsupported channel: ${channel}`);
    }

  } catch (error) {
    console.error('❌ Channel gateway error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendWhatsAppMessage(to: string, text: string) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  
  if (!accessToken || !phoneId) {
    console.error('❌ WhatsApp credentials missing');
    throw new Error('WhatsApp credentials not configured');
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp API error:', errorText);
      throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ WhatsApp message sent successfully to ${to}`);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: result.messages?.[0]?.id,
      platform: 'whatsapp'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WhatsApp send failed:', error);
    throw error;
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!botToken) {
    console.error('❌ Telegram bot token missing');
    throw new Error('Telegram bot token not configured');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    const result = await response.json();
    console.log(`✅ Telegram message sent successfully to ${chatId}`);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: result.result?.message_id,
      platform: 'telegram'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Telegram send failed:', error);
    throw error;
  }
}

// Helper function for rich message formatting
function formatMessage(text: string, platform: 'whatsapp' | 'telegram'): string {
  if (platform === 'telegram') {
    // Convert simple markdown to HTML for Telegram
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }
  
  // WhatsApp supports basic formatting
  return text;
}

// Helper function to send media messages (future enhancement)
async function sendMediaMessage(channel: string, recipient: string, mediaUrl: string, caption?: string) {
  if (channel === 'whatsapp') {
    return await sendWhatsAppMedia(recipient, mediaUrl, caption);
  } else if (channel === 'telegram') {
    return await sendTelegramMedia(recipient, mediaUrl, caption);
  }
  throw new Error(`Media not supported for channel: ${channel}`);
}

async function sendWhatsAppMedia(to: string, mediaUrl: string, caption?: string) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  
  if (!accessToken || !phoneId) {
    throw new Error('WhatsApp credentials not configured');
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: {
        link: mediaUrl,
        caption: caption
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp media API error: ${await response.text()}`);
  }

  return await response.json();
}

async function sendTelegramMedia(chatId: string, mediaUrl: string, caption?: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!botToken) {
    throw new Error('Telegram bot token not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo: mediaUrl,
      caption: caption
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram media API error: ${error.description}`);
  }

  return await response.json();
}