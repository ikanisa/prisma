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
          image?: {
            id: string;
            mime_type: string;
            caption?: string;
          };
          type: string;
        }>;
      };
    }>;
  }>;
}

// User session management for conversation flow
const userSessions = new Map<string, {
  state: 'idle' | 'waiting_amount' | 'waiting_qr_scan' | 'processing_payment';
  lastInteraction: number;
  context?: any;
}>();

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

  // Clean up old sessions (older than 30 minutes)
  cleanupOldSessions();

  if (messageType === 'text') {
    const messageText = message.text.body.toLowerCase().trim();
    await handleTextMessage(from, messageText, phoneNumberId);
  } else if (messageType === 'interactive') {
    await handleInteractiveMessage(from, message.interactive, phoneNumberId);
  } else if (messageType === 'image') {
    await handleImageMessage(from, message.image, phoneNumberId);
  }
}

async function handleTextMessage(from: string, messageText: string, phoneNumberId: string) {
  console.log(`Handling text message: "${messageText}"`);

  // Get or create user session
  const session = getUserSession(from);
  
  // Intelligent intent detection
  const intent = detectIntent(messageText);
  console.log('Detected intent:', intent);

  switch (intent.type) {
    case 'get_paid':
      await sendGetPaidOptions(from, phoneNumberId);
      break;
    
    case 'amount':
      if (session.state === 'waiting_amount') {
        await generateQRForAmount(from, intent.amount.toString(), phoneNumberId);
        session.state = 'idle';
      } else {
        await sendAmountOptions(from, intent.amount, phoneNumberId);
      }
      break;
    
    case 'scan_request':
      session.state = 'waiting_qr_scan';
      await sendTextMessage(from, '📸 Please send me a photo of the QR code you want to scan and I\'ll process the payment for you!', phoneNumberId);
      break;
    
    case 'greeting':
      await sendWelcomeMessage(from, phoneNumberId);
      break;
    
    default:
      // Check if user is in a specific state
      if (session.state === 'waiting_amount') {
        const amount = extractAmount(messageText);
        if (amount) {
          await generateQRForAmount(from, amount.toString(), phoneNumberId);
          session.state = 'idle';
        } else {
          await sendTextMessage(from, 'Please enter a valid amount (e.g., 5000)', phoneNumberId);
        }
      } else {
        await sendWelcomeMessage(from, phoneNumberId);
      }
  }

  // Update session
  session.lastInteraction = Date.now();
  userSessions.set(from, session);
}

async function handleInteractiveMessage(from: string, interactive: any, phoneNumberId: string) {
  const buttonId = interactive.button_reply?.id;
  console.log(`Handling interactive message, button ID: ${buttonId}`);

  const session = getUserSession(from);

  if (buttonId === 'get_paid_menu') {
    await sendGetPaidOptions(from, phoneNumberId);
  } else if (buttonId === 'add_money') {
    session.state = 'waiting_amount';
    await sendTextMessage(from, '💰 Please type the amount you want to request (e.g., 5000)', phoneNumberId);
  } else if (buttonId === 'generate_qr') {
    await sendTextMessage(from, '📱 Please type your phone number and amount (e.g., 0781234567 5000)', phoneNumberId);
  } else if (buttonId === 'scan_qr') {
    session.state = 'waiting_qr_scan';
    await sendTextMessage(from, '📸 Please send me a photo of the QR code you want to scan!', phoneNumberId);
  } else if (buttonId?.startsWith('pay_')) {
    const amount = buttonId.replace('pay_', '');
    session.state = 'waiting_qr_scan';
    session.context = { amount, action: 'pay' };
    await sendTextMessage(from, `📸 Send me a QR code photo to pay ${amount} RWF`, phoneNumberId);
  } else if (buttonId?.startsWith('get_paid_')) {
    const amount = buttonId.replace('get_paid_', '');
    await generateQRForAmount(from, amount, phoneNumberId);
  }

  session.lastInteraction = Date.now();
  userSessions.set(from, session);
}

async function handleImageMessage(from: string, image: any, phoneNumberId: string) {
  console.log('Handling image message for QR scanning');
  
  const session = getUserSession(from);
  
  if (session.state !== 'waiting_qr_scan') {
    await sendTextMessage(from, 'I wasn\'t expecting an image. Type "scan" if you want to scan a QR code!', phoneNumberId);
    return;
  }

  try {
    // Download the image from WhatsApp
    const imageUrl = await downloadWhatsAppMedia(image.id, phoneNumberId);
    
    if (!imageUrl) {
      await sendTextMessage(from, 'Sorry, I couldn\'t download the image. Please try again.', phoneNumberId);
      return;
    }

    // Process the QR code using our existing scan-qr function
    session.state = 'processing_payment';
    await sendTextMessage(from, '🔍 Scanning QR code... Please wait!', phoneNumberId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: scanResult, error } = await supabaseClient.functions.invoke('scan-qr', {
      body: {
        qrImage: imageUrl,
        sessionId: `whatsapp_${from}_${Date.now()}`,
        enhanceImage: true,
        aiProcessing: true,
        whatsappIntegration: true,
        userPhone: from
      }
    });

    if (error || !scanResult) {
      console.error('QR scan error:', error);
      await sendTextMessage(from, '❌ Sorry, I couldn\'t read the QR code. Please make sure the image is clear and try again.', phoneNumberId);
      session.state = 'idle';
      return;
    }

    // Process successful scan
    if (scanResult.success && scanResult.ussdString) {
      await handleSuccessfulQRScan(from, scanResult, phoneNumberId);
    } else {
      await sendTextMessage(from, '❌ Invalid QR code. Please scan a valid payment QR code.', phoneNumberId);
    }

    session.state = 'idle';

  } catch (error) {
    console.error('Error processing QR image:', error);
    await sendTextMessage(from, '❌ Error processing the image. Please try again with a clearer photo.', phoneNumberId);
    session.state = 'idle';
  }

  session.lastInteraction = Date.now();
  userSessions.set(from, session);
}

async function downloadWhatsAppMedia(mediaId: string, phoneNumberId: string): Promise<string | null> {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    // Get media URL
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!mediaResponse.ok) {
      console.error('Failed to get media URL');
      return null;
    }

    const mediaData = await mediaResponse.json();
    
    // Download the actual image
    const imageResponse = await fetch(mediaData.url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!imageResponse.ok) {
      console.error('Failed to download image');
      return null;
    }

    // Convert to base64 data URL
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    return `data:image/jpeg;base64,${base64}`;

  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    return null;
  }
}

async function handleSuccessfulQRScan(from: string, scanResult: any, phoneNumberId: string) {
  const { ussdString, amount, confidence } = scanResult;
  
  // Create tel URI for launching USSD
  const telUri = `tel:${encodeURIComponent(ussdString)}`;
  
  // Send success message with payment details
  const message = `✅ QR Code Scanned Successfully!

💰 Amount: ${amount ? `${parseInt(amount).toLocaleString()} RWF` : 'Variable'}
📱 USSD Code: ${ussdString}
🎯 Confidence: ${Math.round((confidence || 0.9) * 100)}%

To complete the payment, dial: ${ussdString}

Or click this link: ${telUri}`;

  await sendTextMessage(from, message, phoneNumberId);

  // Log the transaction
  console.log('WhatsApp QR scan completed:', {
    user: from,
    ussdString,
    amount,
    confidence
  });
}

function detectIntent(message: string): { type: string; amount?: number; confidence: number } {
  const text = message.toLowerCase().trim();
  
  // Get paid intent
  if (text.includes('get paid') || text.includes('request money') || text.includes('payment request')) {
    return { type: 'get_paid', confidence: 0.9 };
  }

  // Scan intent
  if (text.includes('scan') || text.includes('read qr') || text.includes('process payment')) {
    return { type: 'scan_request', confidence: 0.85 };
  }

  // Amount detection with better parsing
  const amountMatch = text.match(/(\d{1,10})/);
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]);
    if (amount >= 100 && amount <= 10000000) {
      return { type: 'amount', amount, confidence: 0.8 };
    }
  }

  // Pay intent
  if (text.includes('pay') || text.includes('send money') || text.includes('transfer')) {
    return { type: 'pay_request', confidence: 0.7 };
  }

  // Greeting
  if (text.includes('hello') || text.includes('hi') || text.includes('start') || text.includes('hey')) {
    return { type: 'greeting', confidence: 0.6 };
  }

  return { type: 'unknown', confidence: 0.1 };
}

function extractAmount(text: string): number | null {
  const amountMatch = text.match(/(\d{1,10})/);
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]);
    return (amount >= 100 && amount <= 10000000) ? amount : null;
  }
  return null;
}

function getUserSession(phoneNumber: string) {
  if (!userSessions.has(phoneNumber)) {
    userSessions.set(phoneNumber, {
      state: 'idle',
      lastInteraction: Date.now()
    });
  }
  return userSessions.get(phoneNumber)!;
}

function cleanupOldSessions() {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [phone, session] of userSessions.entries()) {
    if (now - session.lastInteraction > thirtyMinutes) {
      userSessions.delete(phone);
    }
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
        text: "Welcome to Smart QR Payments! 💰\n\nI can help you:\n• Generate QR codes to get paid 💳\n• Scan QR codes to make payments 📸\n• Process mobile money transactions 📱\n\nJust type an amount (e.g., 5000) or choose an option:"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "get_paid_menu",
              title: "💳 Get Paid"
            }
          },
          {
            type: "reply",
            reply: {
              id: "scan_qr",
              title: "📸 Scan QR"
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
        text: "How would you like to create your payment request? 💰"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "add_money",
              title: "💵 Enter Amount"
            }
          },
          {
            type: "reply",
            reply: {
              id: "generate_qr",
              title: "📱 Quick QR"
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

    // Use the WhatsApp number as receiver (clean format)
    const receiver = from.replace('+', '');
    
    // Generate QR code using existing function
    const { data, error } = await supabaseClient.functions.invoke('generate-qr', {
      body: {
        receiver,
        amount: parseInt(amount),
        sessionId: `whatsapp_${from}_${Date.now()}`
      }
    });

    if (error) {
      console.error('QR generation error:', error);
      await sendTextMessage(from, 'Sorry, there was an error generating your QR code. Please try again.', phoneNumberId);
      return;
    }

    // Send QR code image with enhanced message
    await sendQRCode(from, data.qrCodeImage, amount, phoneNumberId);

  } catch (error) {
    console.error('Error in generateQRForAmount:', error);
    await sendTextMessage(from, 'Sorry, there was an error generating your QR code. Please try again.', phoneNumberId);
  }
}

async function sendQRCode(from: string, qrCodeDataUrl: string, amount: string, phoneNumberId: string) {
  const template = {
    messaging_product: "whatsapp",
    to: from,
    type: "image",
    image: {
      link: qrCodeDataUrl,
      caption: `💳 Your QR code for ${parseInt(amount).toLocaleString()} RWF is ready!\n\n✅ Show this to the payer\n✅ They scan with any mobile money app\n✅ Payment completed instantly\n\nPowered by Smart QR Payments 🚀`
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