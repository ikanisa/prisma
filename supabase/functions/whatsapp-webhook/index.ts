import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    await supabase.from('conversation_messages').insert({
      phone_number: whatsappNumber,
      channel: 'whatsapp',
      sender: 'user',
      message_text: message,
      created_at: new Date().toISOString()
    });

    // Simple AI routing logic
    let response = await processMessage(message, currentUser, whatsappNumber);

    // Store agent response
    await supabase.from('conversation_messages').insert({
      phone_number: whatsappNumber,
      channel: 'whatsapp',
      sender: 'agent',
      message_text: response,
      created_at: new Date().toISOString()
    });

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

async function processMessage(message: string, user: any, phone: string): Promise<string> {
  const msg = message.toLowerCase().trim();

  // Onboarding for new users
  if (!user.created_at || isNewUser(user)) {
    return `Welcome to easyMO! 🌟
    
Your super-app for:
💰 Payments & MoMo transfers
🛒 Fresh produce from farmers
🚗 Taxi & delivery services
🎉 Local events & activities

Reply:
• A number (like "5000") for payments
• "browse" to shop products
• "events" for local events
• "help" for assistance

You have ${user.credits} credits to start!`;
  }

  // Payment requests - numeric amount
  if (/^\d+$/.test(msg)) {
    const amount = parseInt(msg);
    
    try {
      const paymentResponse = await supabase.functions.invoke('generate-payment', {
        body: { amount, phone, description: 'easyMO Payment' }
      });
      
      const { data } = paymentResponse;
      
      if (data.success) {
        return `💰 Payment request: ${amount} RWF
        
📱 Dial: ${data.ussd_code}
🔗 Or tap: ${data.ussd_link}

Reference: ${data.reference}
Complete payment within 5 minutes.`;
      } else {
        return `❌ Payment failed: ${data.error}`;
      }
    } catch (error) {
      return "❌ Payment service temporarily unavailable. Please try again.";
    }
  }

  // Browse products
  if (msg === 'browse' || msg.includes('shop') || msg.includes('buy')) {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(5);

    if (!products || products.length === 0) {
      return "🛒 No products available right now. Check back soon!";
    }

    let productList = "🛒 Fresh Products Available:\n\n";
    products.forEach((product, index) => {
      productList += `${index + 1}. ${product.name}\n`;
      productList += `   💰 ${product.price} RWF${product.unit ? ` per ${product.unit}` : ''}\n`;
      productList += `   📦 Stock: ${product.stock_qty || 'Available'}\n\n`;
    });
    
    productList += "Reply with product number to order!";
    return productList;
  }

  // Events
  if (msg === 'events' || msg.includes('event')) {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .limit(3);

    if (!events || events.length === 0) {
      return "🎉 No events scheduled right now. Check back soon!";
    }

    let eventList = "🎉 Upcoming Events:\n\n";
    events.forEach((event, index) => {
      eventList += `${index + 1}. ${event.title}\n`;
      eventList += `   📍 ${event.location}\n`;
      if (event.price) eventList += `   💰 ${event.price} RWF\n`;
      if (event.event_date) {
        const date = new Date(event.event_date);
        eventList += `   📅 ${date.toLocaleDateString()}\n`;
      }
      eventList += '\n';
    });
    
    return eventList;
  }

  // Help
  if (msg === 'help' || msg.includes('help')) {
    return `🆘 easyMO Help:

💰 PAYMENTS: Send amount (e.g., "5000")
🛒 SHOPPING: Send "browse" 
🎉 EVENTS: Send "events"
🚗 TAXI: Send "taxi from [location] to [location]"

Examples:
• "2000" → Pay 2000 RWF
• "browse" → See products
• "events" → See events

Need human help? Reply "support"`;
  }

  // Support
  if (msg === 'support' || msg.includes('support')) {
    return `🎧 Support ticket created! 

Our team will contact you within 2 hours.

For urgent issues:
📞 Call: +250 788 000 000
📧 Email: help@easymo.rw

Your ticket ID: #${Date.now().toString().slice(-6)}`;
  }

  // Default response
  return `🤖 I didn't understand "${message}"

Try:
• A number for payments (e.g., "5000")
• "browse" to shop
• "events" for events  
• "help" for more options

What would you like to do?`;
}

function isNewUser(user: any): boolean {
  if (!user.created_at) return true;
  const timeSinceCreation = new Date().getTime() - new Date(user.created_at).getTime();
  return timeSinceCreation < 60000; // Within 1 minute of creation
}