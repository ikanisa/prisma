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

    // Enhanced AI routing logic with driver support
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

  // Driver onboarding and management
  if (msg === 'driver' || msg.includes('driver signup')) {
    return await handleDriverOnboarding(user, phone);
  }

  // Driver status commands
  if (msg === 'driver on' || msg === 'go online') {
    return await handleDriverStatusChange(user, phone, 'online');
  }

  if (msg === 'driver off' || msg === 'go offline') {
    return await handleDriverStatusChange(user, phone, 'offline');
  }

  // Trip management
  if (msg === 'accept' && await isDriverWaitingForTrip(user.id)) {
    return await handleTripAcceptance(user, phone);
  }

  if (msg === 'picked up' || msg === 'pickup complete') {
    return await handleTripEvent(user, phone, 'picked_up');
  }

  if (msg === 'delivered' || msg === 'delivery complete') {
    return await handleTripEvent(user, phone, 'delivered');
  }

  // Wallet and payout requests  
  if (msg === 'wallet' || msg === 'balance') {
    return await handleWalletInquiry(user, phone);
  }

  if (msg.startsWith('payout ') || msg.startsWith('withdraw ')) {
    const amount = parseInt(msg.split(' ')[1]);
    if (amount && amount > 0) {
      return await handlePayoutRequest(user, phone, amount);
    }
  }

  // Existing functionality for regular users
  return await handleRegularUserMessage(message, user, phone);
}

async function handleDriverOnboarding(user: any, phone: string): Promise<string> {
  // Check if user is already a driver
  const { data: existingDriver } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingDriver) {
    return `🚗 Welcome back, driver! 
    
You're already registered with plate: ${existingDriver.plate_number || 'Not set'}
Status: ${existingDriver.is_online ? 'Online' : 'Offline'}

Commands:
• "driver on" - Go online
• "driver off" - Go offline 
• "wallet" - Check balance`;
  }

  return `🚗 Welcome to easyMO Driver!

To get started, I need:
1. Your full name
2. Vehicle plate number  
3. Mobile Money number

Please provide your details in this format:
"John Doe, RAB123C, 0788000000"

Once verified, you can start earning!`;
}

async function handleDriverStatusChange(user: any, phone: string, status: 'online' | 'offline'): Promise<string> {
  try {
    // Get driver record
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return `❌ You're not registered as a driver yet. Send "driver" to get started.`;
    }

    // Update driver status via edge function
    const statusResponse = await supabase.functions.invoke('driver-status', {
      body: {
        driver_id: driver.id,
        status,
        phone
      }
    });

    const { data } = statusResponse;

    if (data.success) {
      if (status === 'online') {
        return `✅ You're now ONLINE! 🟢

🚗 Ready to receive trip requests
📍 Share your location when prompted
🔋 Keep your phone charged

You'll receive trip notifications here.`;
      } else {
        return `✅ You're now OFFLINE 🔴

Thank you for driving with easyMO!
Your earnings are safe in your wallet.

Send "wallet" to check your balance.`;
      }
    } else {
      return `❌ Failed to update status: ${data.error}`;
    }
  } catch (error) {
    return `❌ Status update failed. Please try again.`;
  }
}

async function handleWalletInquiry(user: any, phone: string): Promise<string> {
  try {
    const { data: driver } = await supabase
      .from('drivers')
      .select(`
        *,
        driver_wallet(balance)
      `)
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return `❌ Driver account not found. Send "driver" to register.`;
    }

    const balance = driver.driver_wallet?.[0]?.balance || 0;

    return `💰 Your Wallet Balance: ${balance.toLocaleString()} RWF

💳 Available for withdrawal
📱 Send "payout [amount]" to withdraw
🏦 Example: "payout 10000"

Minimum withdrawal: 5,000 RWF`;
  } catch (error) {
    return `❌ Wallet inquiry failed. Please try again.`;
  }
}

async function handlePayoutRequest(user: any, phone: string, amount: number): Promise<string> {
  try {
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return `❌ Driver account not found.`;
    }

    if (amount < 5000) {
      return `❌ Minimum payout is 5,000 RWF. Please try a higher amount.`;
    }

    // Process payout via edge function
    const payoutResponse = await supabase.functions.invoke('driver-payout', {
      body: {
        driver_id: driver.id,
        amount
      }
    });

    const { data } = payoutResponse;

    if (data.success) {
      return `✅ Payout Initiated: ${amount.toLocaleString()} RWF

📱 USSD: ${data.ussd_code}
🔗 Link: ${data.ussd_link}

Complete the USSD transaction to receive your money.
Reference: ${data.reference}`;
    } else {
      return `❌ Payout failed: ${data.error}`;
    }
  } catch (error) {
    return `❌ Payout request failed. Please try again.`;
  }
}

async function isDriverWaitingForTrip(userId: string): Promise<boolean> {
  // Check if driver has any assigned trips waiting for acceptance
  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!driver) return false;

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driver.id)
    .eq('status', 'assigned')
    .single();

  return !!trip;
}

async function handleTripAcceptance(user: any, phone: string): Promise<string> {
  try {
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driver) return `❌ Driver account not found.`;

    // Get assigned trip
    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', 'assigned')
      .single();

    if (!trip) {
      return `❌ No trip assignment found.`;
    }

    // Update trip status
    await supabase
      .from('trips')
      .update({ status: 'accepted' })
      .eq('id', trip.id);

    // Log event
    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event: 'driver_accepted'
    });

    return `✅ Trip Accepted! 🚗

📍 Pickup: ${trip.pickup_location}
📍 Dropoff: ${trip.dropoff_location}  
💰 Fare: ${trip.price?.toLocaleString()} RWF

Navigate to pickup location and reply "picked up" when you arrive.`;
  } catch (error) {
    return `❌ Trip acceptance failed. Please try again.`;
  }
}

async function handleTripEvent(user: any, phone: string, event: 'picked_up' | 'delivered'): Promise<string> {
  try {
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driver) return `❌ Driver account not found.`;

    // Get active trip
    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', driver.id)
      .in('status', ['accepted', 'picked_up'])
      .single();

    if (!trip) {
      return `❌ No active trip found.`;
    }

    // Update trip status
    const newStatus = event === 'picked_up' ? 'picked_up' : 'delivered';
    await supabase
      .from('trips')
      .update({ 
        status: newStatus,
        completed_at: event === 'delivered' ? new Date().toISOString() : null
      })
      .eq('id', trip.id);

    // Log event
    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event
    });

    if (event === 'picked_up') {
      return `✅ Pickup Confirmed! 🎯

Navigate to: ${trip.dropoff_location}
Reply "delivered" when you complete the trip.

Drive safely! 🚗`;
    } else {
      const earnings = Math.floor((trip.price || 0) * 0.8); // 80% to driver
      return `✅ Trip Completed! 🎉

💰 You earned: ${earnings.toLocaleString()} RWF
🏦 Added to your wallet

Thank you for the excellent service!
Reply "driver on" for next trip.`;
    }
  } catch (error) {
    return `❌ Trip event failed. Please try again.`;
  }
}

async function handleRegularUserMessage(message: string, user: any, phone: string): Promise<string> {
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
• "driver" to become a driver
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
🚗 DRIVER: Send "driver" to earn money
🚗 TAXI: Send "taxi from [location] to [location]"

Examples:
• "2000" → Pay 2000 RWF
• "browse" → See products
• "driver" → Become a driver
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
• "driver" to become a driver  
• "events" for events  
• "help" for more options

What would you like to do?`;
}

function isNewUser(user: any): boolean {
  if (!user.created_at) return true;
  const timeSinceCreation = new Date().getTime() - new Date(user.created_at).getTime();
  return timeSinceCreation < 60000; // Within 1 minute of creation
}
