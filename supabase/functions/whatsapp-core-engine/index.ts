import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_TOKEN = Deno.env.get("META_WABA_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("META_WABA_PHONE_ID") || Deno.env.get("WHATSAPP_PHONE_ID");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from, text, message_id, contact_name, timestamp, message_type, interactive_data, button_data, location_data, media_data } = await req.json();
    
    console.log('🧠 WhatsApp Core Engine processing:', { from, text, message_type });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get user context
    const userContext = await getUserContext(supabase, from);
    
    // Determine if user is new (first interaction or outside 24h)
    const isNewOrOutside24h = await checkNewOrOutside24h(supabase, from);

    let response = '';

    // Route based on message type and content
    if (message_type === 'text') {
      response = await processTextFlow(supabase, from, text, userContext, isNewOrOutside24h);
    } else if (message_type === 'interactive') {
      response = await processInteractiveFlow(supabase, from, text, interactive_data, userContext);
    } else if (message_type === 'location') {
      response = await processLocationFlow(supabase, from, location_data, userContext);
    } else if (message_type === 'image') {
      response = await processImageFlow(supabase, from, media_data, userContext);
    } else {
      response = await sendMainMenu(supabase, from, userContext.name || contact_name, false);
    }

    // Log conversation
    await logConversation(supabase, from, text || `${message_type}_received`, response);

    return new Response(JSON.stringify({
      success: true,
      response,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ WhatsApp Core Engine error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Get user context from database
async function getUserContext(supabase: any, phoneNumber: string) {
  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    // Get user location
    const { data: location } = await supabase
      .from('user_locations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    // Get user state
    const { data: state } = await supabase
      .from('user_conversation_state')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    return {
      profile: profile || null,
      location: location || null,
      state: state || null,
      name: profile?.name || null,
      momo_number: profile?.momo_number || null,
      language: profile?.language || 'en'
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return { profile: null, location: null, state: null, name: null, momo_number: null, language: 'en' };
  }
}

// Check if user is new or outside 24h window
async function checkNewOrOutside24h(supabase: any, phoneNumber: string): Promise<boolean> {
  try {
    const { data: lastMessage } = await supabase
      .from('conversation_messages')
      .select('created_at')
      .eq('phone_number', phoneNumber)
      .eq('sender', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastMessage) return true; // New user

    const lastMessageTime = new Date(lastMessage.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

    return hoursDiff > 24; // Outside 24h window
  } catch (error) {
    return true; // Assume new user if error
  }
}

// Process text messages with intelligent routing
async function processTextFlow(supabase: any, from: string, text: string, userContext: any, isNewOrOutside24h: boolean): Promise<string> {
  const lowerText = text.toLowerCase().trim();

  // Check for main menu button responses
  if (lowerText.includes('pay 💸') || lowerText === 'pay') {
    return await handlePayFlow(supabase, from, userContext);
  }
  
  if (lowerText.includes('get paid') || lowerText.includes('qr') || lowerText === 'get paid (qr) ✅') {
    return await handleGetPaidFlow(supabase, from, userContext);
  }
  
  if (lowerText.includes('nearby drivers') || lowerText === 'nearby drivers 🛵') {
    return await handleNearbyDriversFlow(supabase, from, userContext);
  }
  
  if (lowerText.includes('nearby passengers') || lowerText === 'nearby passengers 👥') {
    return await handleNearbyPassengersFlow(supabase, from, userContext);
  }
  
  if (lowerText.includes('schedule trip') || lowerText === 'schedule trip 📅') {
    return await handleScheduleTripFlow(supabase, from, userContext);
  }

  // Handle direct payment amounts like "pay 5000"
  const paymentMatch = text.match(/^(?:pay\s+)?(\d{3,})\s?(?:rwf|frw)?$/i);
  if (paymentMatch) {
    const amount = parseInt(paymentMatch[1]);
    return await generateQRDirectly(supabase, from, amount, userContext);
  }

  // Handle greetings or new users
  if (lowerText.match(/^(hi|hello|hey|muraho|bonjour|salut|hola)/i) || isNewOrOutside24h) {
    return await sendMainMenu(supabase, from, userContext.name || 'friend', isNewOrOutside24h);
  }

  // Handle "back" or "menu"
  if (lowerText.match(/^(back|menu|main|home)/i)) {
    return await sendMainMenu(supabase, from, userContext.name || 'friend', false);
  }

  // Default: send main menu
  return await sendMainMenu(supabase, from, userContext.name || 'friend', false);
}

// Process interactive button/list selections
async function processInteractiveFlow(supabase: any, from: string, actionId: string, interactiveData: any, userContext: any): Promise<string> {
  console.log('🎯 Processing interactive action:', actionId);

  // Handle driver selections
  if (actionId.startsWith('driver_')) {
    return await handleDriverSelection(supabase, from, actionId, userContext);
  }

  // Handle passenger selections
  if (actionId.startsWith('passenger_')) {
    return await handlePassengerSelection(supabase, from, actionId, userContext);
  }

  // Handle payment confirmations
  if (actionId.startsWith('pay_confirm_')) {
    return await handlePaymentConfirmation(supabase, from, actionId, userContext);
  }

  // Handle QR actions
  if (actionId.startsWith('qr_')) {
    return await handleQRAction(supabase, from, actionId, userContext);
  }

  return await sendMainMenu(supabase, from, userContext.name || 'friend', false);
}

// Process location sharing
async function processLocationFlow(supabase: any, from: string, locationData: any, userContext: any): Promise<string> {
  console.log('📍 Location received:', locationData);
  
  // Check what the user was doing that required location
  const { data: state } = await supabase
    .from('user_conversation_state')
    .select('current_flow, flow_data')
    .eq('phone_number', from)
    .single();

  if (state?.current_flow === 'nearby_drivers') {
    return await handleNearbyDriversFlow(supabase, from, userContext);
  } else if (state?.current_flow === 'nearby_passengers') {
    return await handleNearbyPassengersFlow(supabase, from, userContext);
  }

  return "📍 Location saved! What would you like to do?\n\n" + await sendMainMenu(supabase, from, userContext.name || 'friend', false);
}

// Process image messages (QR codes)
async function processImageFlow(supabase: any, from: string, imageData: any, userContext: any): Promise<string> {
  console.log('📷 Image received, checking for QR code...');
  
  // Here you would decode QR from image
  // For now, return instructions
  return `📷 I can see you sent an image! 

To pay using a QR code:
1. Make sure the QR is clear and visible
2. I'll decode the payment details
3. You can confirm the amount

Or try:
• "pay 5000" to generate your own QR
• "menu" for main options`;
}

// === CORE FLOWS ===

// 1. Send Main Menu (HSM Template or Interactive Message)
async function sendMainMenu(supabase: any, from: string, name: string, useTemplate: boolean): Promise<string> {
  if (useTemplate && WHATSAPP_TOKEN && WHATSAPP_PHONE_ID) {
    // Send HSM Template for outside 24h window
    return await sendTemplate(from, 'welcome_menu_v1', [name]);
  } else {
    // Send interactive message for inside 24h
    return await sendInteractiveMenu(from, name);
  }
}

// Send HSM Template
async function sendTemplate(phoneNumber: string, templateName: string, parameters: string[]): Promise<string> {
  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: p }))
          }] : []
        }
      }),
    });

    if (response.ok) {
      console.log('✅ Template sent successfully');
      return `Template ${templateName} sent`;
    } else {
      throw new Error(`Template send failed: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Template send error:', error);
    // Fallback to interactive message
    return await sendInteractiveMenu(phoneNumber, parameters[0] || 'friend');
  }
}

// Send Interactive Menu (inside 24h window)
async function sendInteractiveMenu(phoneNumber: string, name: string): Promise<string> {
  const menuMessage = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `Muraho ${name}! 👋 What do you want to do today?\n\n🎯 Quick Actions:`
      },
      footer: {
        text: 'easyMO • Mobile Money & Moto made simple'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'pay', title: 'Pay 💸' } },
          { type: 'reply', reply: { id: 'get_paid', title: 'Get Paid ✅' } },
          { type: 'reply', reply: { id: 'nearby_drivers', title: 'Nearby Drivers 🛵' } }
        ]
      }
    }
  };

  // Send secondary menu as follow-up
  setTimeout(async () => {
    await sendWhatsAppMessage(phoneNumber, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'More options:' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'nearby_passengers', title: 'Passengers 👥' } },
            { type: 'reply', reply: { id: 'schedule_trip', title: 'Schedule Trip 📅' } },
            { type: 'reply', reply: { id: 'help', title: 'Help & Language' } }
          ]
        }
      }
    });
  }, 1000);

  return await sendWhatsAppMessage(phoneNumber, menuMessage);
}

// 2. Pay Flow
async function handlePayFlow(supabase: any, from: string, userContext: any): Promise<string> {
  const payMessage = {
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Choose how you want to pay:'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'scan_qr', title: 'Scan QR Code' } },
          { type: 'reply', reply: { id: 'enter_momo', title: 'Enter MoMo Number' } },
          { type: 'reply', reply: { id: 'back', title: 'Back to Menu' } }
        ]
      }
    }
  };

  // Update user state
  await updateUserState(supabase, from, 'pay_method_select', {});

  return await sendWhatsAppMessage(from, payMessage);
}

// 3. Get Paid Flow (QR Generation)
async function handleGetPaidFlow(supabase: any, from: string, userContext: any): Promise<string> {
  // Check if MoMo number is saved
  if (!userContext.momo_number) {
    return "💸 To receive payments, I need your MoMo number first.\n\nPlease type your MoMo number (e.g., 0788123456):";
  }

  return "💰 Generate QR to get paid:\n\nType the amount you want to receive:\n• \"5000\" for 5,000 RWF\n• \"10000\" for 10,000 RWF\n• Or any amount\n\nOr type \"back\" for main menu";
}

// 4. Nearby Drivers Flow
async function handleNearbyDriversFlow(supabase: any, from: string, userContext: any): Promise<string> {
  if (!userContext.location) {
    await updateUserState(supabase, from, 'nearby_drivers', {});
    return "📍 Please share your current location so I can find drivers near you.\n\nTap the 📎 attachment icon → Location → Send Current Location";
  }

  // Query nearby drivers
  const { data: drivers } = await supabase.rpc('get_nearby_drivers', {
    user_lat: userContext.location.latitude,
    user_lng: userContext.location.longitude,
    radius_km: 5
  });

  if (!drivers || drivers.length === 0) {
    return "🛵 No drivers found nearby.\n\nTry:\n• Posting a trip request\n• Checking again in a few minutes\n• Expanding search area";
  }

  // Send interactive list of drivers
  return await sendDriversList(from, drivers.slice(0, 10));
}

// 5. Generate QR Directly
async function generateQRDirectly(supabase: any, from: string, amount: number, userContext: any): Promise<string> {
  try {
    // Generate QR code
    const { data: qrResult, error: qrError } = await supabase.functions.invoke('qr-render', {
      body: {
        text: `easyMO:${amount}:RWF:${from}`,
        agent: 'payment',
        entity: 'receive',
        id: crypto.randomUUID()
      }
    });

    if (qrError) throw qrError;

    // Store payment record
    await supabase.from('payments').insert({
      user_phone: from,
      amount: amount,
      currency: 'RWF',
      type: 'receive',
      status: 'pending',
      qr_url: qrResult.url,
      reference: `PAY${Date.now()}`
    });

    // Send QR with media header
    return await sendQRMessage(from, amount, qrResult.url);

  } catch (error) {
    console.error('QR generation error:', error);
    return `✅ Creating QR for ${amount.toLocaleString()} RWF...\n\nQR will be ready shortly! Customer scans with MoMo and pays instantly.`;
  }
}

// === HELPER FUNCTIONS ===

// Send WhatsApp message
async function sendWhatsAppMessage(phoneNumber: string, messageData: any): Promise<string> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log('WhatsApp not configured, would send:', messageData);
    return JSON.stringify(messageData, null, 2);
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    console.log('✅ WhatsApp message sent successfully');
    return 'Message sent successfully';
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return `Error sending message: ${error.message}`;
  }
}

// Send QR message with image
async function sendQRMessage(phoneNumber: string, amount: number, qrUrl: string): Promise<string> {
  const qrMessage = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'image',
    image: {
      link: qrUrl,
      caption: `💰 QR ready for ${amount.toLocaleString()} RWF!\n\nCustomer scans → enters amount → money arrives instantly!\n\nReply "received" when paid ✅`
    }
  };

  // Follow-up with action buttons
  setTimeout(async () => {
    await sendWhatsAppMessage(phoneNumber, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Payment status:' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'qr_received', title: 'Paid ✅' } },
            { type: 'reply', reply: { id: 'qr_change', title: 'Change Amount' } },
            { type: 'reply', reply: { id: 'back', title: 'Back to Menu' } }
          ]
        }
      }
    });
  }, 2000);

  return await sendWhatsAppMessage(phoneNumber, qrMessage);
}

// Send drivers list
async function sendDriversList(phoneNumber: string, drivers: any[]): Promise<string> {
  const driversList = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: `🛵 Found ${drivers.length} drivers nearby:`
      },
      footer: {
        text: 'Tap to contact driver'
      },
      action: {
        button: 'View Drivers',
        sections: [{
          title: 'Available Drivers',
          rows: drivers.map((driver, index) => ({
            id: `driver_${driver.id}`,
            title: `${driver.name || 'Driver'} (${Math.round(driver.distance || 0)}min)`,
            description: `~${driver.estimated_fare || 1200} RWF • ${driver.vehicle_type || 'Moto'}`
          }))
        }]
      }
    }
  };

  return await sendWhatsAppMessage(phoneNumber, driversList);
}

// Update user conversation state
async function updateUserState(supabase: any, phoneNumber: string, flow: string, flowData: any): Promise<void> {
  await supabase.from('user_conversation_state').upsert({
    phone_number: phoneNumber,
    current_flow: flow,
    flow_data: flowData,
    updated_at: new Date().toISOString()
  }, { onConflict: 'phone_number' });
}

// Log conversation
async function logConversation(supabase: any, phoneNumber: string, userMessage: string, botResponse: string): Promise<void> {
  try {
    await supabase.from('conversation_messages').insert([
      {
        phone_number: phoneNumber,
        sender: 'user',
        message_text: userMessage,
        channel: 'whatsapp'
      },
      {
        phone_number: phoneNumber,
        sender: 'assistant',
        message_text: botResponse,
        channel: 'whatsapp'
      }
    ]);
  } catch (error) {
    console.error('Conversation logging error:', error);
  }
}

// Placeholder functions for remaining flows
async function handleNearbyPassengersFlow(supabase: any, from: string, userContext: any): Promise<string> {
  return "👥 Nearby passengers feature coming soon!\n\nFor now, try:\n• Post your trip availability\n• Check main menu for other options";
}

async function handleScheduleTripFlow(supabase: any, from: string, userContext: any): Promise<string> {
  return "📅 Schedule trip feature coming soon!\n\nFor now, try:\n• Find nearby drivers\n• Use instant booking";
}

async function handleDriverSelection(supabase: any, from: string, driverId: string, userContext: any): Promise<string> {
  return `✅ Contacting driver...\n\nDriver will be notified of your request!\n\nExpected response time: 2-5 minutes\n\nType "back" for main menu`;
}

async function handlePassengerSelection(supabase: any, from: string, passengerId: string, userContext: any): Promise<string> {
  return "👥 Passenger contact feature in development";
}

async function handlePaymentConfirmation(supabase: any, from: string, actionId: string, userContext: any): Promise<string> {
  return "💸 Payment confirmation in development";
}

async function handleQRAction(supabase: any, from: string, actionId: string, userContext: any): Promise<string> {
  if (actionId === 'qr_received') {
    return "✅ Payment received! Thanks for using easyMO.\n\n" + await sendMainMenu(supabase, from, userContext.name || 'friend', false);
  }
  return "QR action processed";
}