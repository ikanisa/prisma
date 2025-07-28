import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
          };
          type: string;
        }>;
      };
    }>;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // WhatsApp webhook verification
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WhatsApp webhook verified');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    try {
      const body: WhatsAppMessage = await req.json();
      console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

      // Process incoming messages
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              await processMessage(message, change.value.metadata.phone_number_id);
            }
          }
        }
      }

      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return new Response('Error processing webhook', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
});

async function processMessage(message: any, phoneNumberId: string) {
  const from = message.from;
  const messageType = message.type;

  console.log(`Processing message from ${from}, type: ${messageType}`);

  if (messageType === 'text') {
    const messageText = message.text.body.toLowerCase().trim();
    await handleTextMessage(from, messageText, phoneNumberId);
  } else if (messageType === 'interactive') {
    await handleInteractiveMessage(from, message.interactive, phoneNumberId);
  }
}

async function handleTextMessage(from: string, messageText: string, phoneNumberId: string) {
  console.log(`Handling text message: "${messageText}"`);

  // Check if user wants to get paid
  if (messageText.includes('get paid') || messageText.includes('request money')) {
    await sendGetPaidOptions(from, phoneNumberId);
    return;
  }

  // Check if message contains amount (numbers)
  const amountMatch = messageText.match(/(\d{1,10})/);
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]);
    if (amount >= 100 && amount <= 1000000) {
      await sendAmountOptions(from, amount, phoneNumberId);
      return;
    }
  }

  // Default response
  await sendWelcomeMessage(from, phoneNumberId);
}

async function handleInteractiveMessage(from: string, interactive: any, phoneNumberId: string) {
  const buttonId = interactive.button_reply?.id;
  console.log(`Handling interactive message, button ID: ${buttonId}`);

  if (buttonId === 'get_paid_menu') {
    await sendGetPaidOptions(from, phoneNumberId);
  } else if (buttonId === 'add_money') {
    await sendTextMessage(from, 'Please type the amount you want to request (e.g., 5000)', phoneNumberId);
  } else if (buttonId === 'generate_qr') {
    await sendTextMessage(from, 'Please type your phone number and amount (e.g., 0781234567 5000)', phoneNumberId);
  } else if (buttonId?.startsWith('pay_')) {
    const amount = buttonId.replace('pay_', '');
    await sendTextMessage(from, `Opening scanner to pay ${amount} RWF...`, phoneNumberId);
    // Here you would integrate with your QR scanner
  } else if (buttonId?.startsWith('get_paid_')) {
    const amount = buttonId.replace('get_paid_', '');
    await generateQRForAmount(from, amount, phoneNumberId);
  }
}

async function sendWelcomeMessage(from: string, phoneNumberId: string) {
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Welcome to QR Payment! 💰\n\nI can help you:\n• Generate QR codes to get paid\n• Scan QR codes to pay\n• Handle payment requests\n\nJust type an amount or choose an option below:"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "get_paid_menu",
              title: "Get Paid 💳"
            }
          }
        ]
      }
    }
  };

  await sendWhatsAppMessage(template, phoneNumberId);
}

async function sendGetPaidOptions(from: string, phoneNumberId: string) {
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "How would you like to get paid? 💰"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "add_money",
              title: "💵 Add Amount"
            }
          },
          {
            type: "reply",
            reply: {
              id: "generate_qr",
              title: "📱 Generate QR"
            }
          }
        ]
      }
    }
  };

  await sendWhatsAppMessage(template, phoneNumberId);
}

async function sendAmountOptions(from: string, amount: number, phoneNumberId: string) {
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `I see you mentioned ${amount.toLocaleString()} RWF 💰\n\nWhat would you like to do?`
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `pay_${amount}`,
              title: `💸 Pay ${amount}`
            }
          },
          {
            type: "reply",
            reply: {
              id: `get_paid_${amount}`,
              title: `💳 Get Paid ${amount}`
            }
          }
        ]
      }
    }
  };

  await sendWhatsAppMessage(template, phoneNumberId);
}

async function generateQRForAmount(from: string, amount: string, phoneNumberId: string) {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate QR code using existing function
    const { data, error } = await supabaseClient.functions.invoke('generate-qr', {
      body: {
        receiver: from.replace('+', ''), // Use WhatsApp number as receiver
        amount: parseInt(amount),
        sessionId: `whatsapp_${from}_${Date.now()}`
      }
    });

    if (error) {
      console.error('QR generation error:', error);
      await sendTextMessage(from, 'Sorry, there was an error generating your QR code. Please try again.', phoneNumberId);
      return;
    }

    // Send QR code image
    await sendQRCode(from, data.qrCodeImage, amount, phoneNumberId);

  } catch (error) {
    console.error('Error in generateQRForAmount:', error);
    await sendTextMessage(from, 'Sorry, there was an error generating your QR code. Please try again.', phoneNumberId);
  }
}

async function sendQRCode(from: string, qrCodeDataUrl: string, amount: string, phoneNumberId: string) {
  // Convert data URL to image and send
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "image",
    image: {
      link: qrCodeDataUrl,
      caption: `💳 Your QR code for ${parseInt(amount).toLocaleString()} RWF is ready!\n\nShow this to the payer to complete the transaction.`
    }
  };

  await sendWhatsAppMessage(template, phoneNumberId);
}

async function sendTextMessage(from: string, text: string, phoneNumberId: string) {
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "text",
    text: { body: text }
  };

  await sendWhatsAppMessage(template, phoneNumberId);
}

async function sendWhatsAppMessage(messageData: any, phoneNumberId: string) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp API error:', errorText);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}