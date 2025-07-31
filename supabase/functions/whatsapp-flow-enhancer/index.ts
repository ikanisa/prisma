
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { phone, message, context = {} } = await req.json();
    
    console.log(`📱 Enhanced WhatsApp flow for ${phone}: ${message}`);

    // Get or create conversation flow
    const { data: flow, error: flowError } = await supabase
      .from('conversation_flows')
      .select('*')
      .eq('phone_number', phone)
      .eq('status', 'active')
      .single();

    let currentFlow = flow;
    let response = '';

    // Determine flow based on message and context
    const messageText = message.toLowerCase().trim();
    
    if (!currentFlow) {
      // Start new flow based on intent
      if (messageText.includes('ride') || messageText.includes('trip')) {
        currentFlow = await createFlow(phone, 'ride_booking', 'greeting');
        response = "🚗 Welcome to easyMO! I'll help you book a ride.\n\nPlease share your pickup location by sending your location or typing the address.";
      } else if (messageText.includes('driver') || messageText.includes('earn')) {
        currentFlow = await createFlow(phone, 'driver_onboarding', 'greeting');
        response = "🛵 Welcome to easyMO Driver!\n\nTo start earning, I need to verify a few details. What's your full name?";
      } else {
        // Default welcome flow
        currentFlow = await createFlow(phone, 'welcome', 'menu');
        response = "👋 Welcome to easyMO!\n\nI can help you:\n🚗 Book a ride - Type 'ride'\n🛵 Become a driver - Type 'driver'\n📱 Check orders - Type 'orders'\n\nWhat would you like to do?";
      }
    } else {
      // Continue existing flow
      response = await processFlowStep(currentFlow, messageText, phone);
    }

    // Enhanced error recovery
    if (!response) {
      response = await handleUnknownInput(messageText, phone, currentFlow);
    }

    // Send response
    await supabase.functions.invoke('compose-whatsapp-message', {
      body: {
        phone,
        message: response,
        message_type: 'text'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      response,
      flow: currentFlow
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ WhatsApp flow enhancer error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createFlow(phone: string, flowName: string, step: string) {
  const { data, error } = await supabase
    .from('conversation_flows')
    .insert({
      phone_number: phone,
      flow_name: flowName,
      current_step: step,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function processFlowStep(flow: any, message: string, phone: string): Promise<string> {
  const { flow_name, current_step } = flow;
  
  try {
    switch (flow_name) {
      case 'ride_booking':
        return await handleRideBookingFlow(flow, message, phone);
      case 'driver_onboarding':
        return await handleDriverOnboardingFlow(flow, message, phone);
      default:
        return "I'm not sure how to help with that. Type 'help' for options.";
    }
  } catch (error) {
    console.error('Flow processing error:', error);
    return "Sorry, something went wrong. Let me help you start over. Type 'ride' to book a trip or 'driver' to join as a driver.";
  }
}

async function handleRideBookingFlow(flow: any, message: string, phone: string): Promise<string> {
  const step = flow.current_step;
  
  switch (step) {
    case 'greeting':
      // User should provide pickup location
      if (message.length < 3) {
        return "Please provide a valid pickup location. You can share your location or type the address.";
      }
      
      await updateFlowStep(flow.id, 'destination');
      return `📍 Pickup location: ${message}\n\nNow, where would you like to go? Please share your destination.`;
      
    case 'destination':
      if (message.length < 3) {
        return "Please provide a valid destination address.";
      }
      
      await updateFlowStep(flow.id, 'confirmation');
      return `🎯 Great! I'm looking for drivers to take you there.\n\nEstimated fare: 2,500 RWF\n\nReply 'confirm' to book or 'cancel' to start over.`;
      
    case 'confirmation':
      if (message.toLowerCase().includes('confirm')) {
        await updateFlowStep(flow.id, 'completed');
        // Trigger actual booking
        await supabase.functions.invoke('create-request', {
          body: {
            passenger_id: phone,
            pickup_lng: 30.0619, // Default Kigali coordinates
            pickup_lat: -1.9441,
            max_budget: 5000,
            seats: 1
          }
        });
        return "✅ Ride booked! Looking for nearby drivers. You'll be notified when a driver accepts.";
      } else if (message.toLowerCase().includes('cancel')) {
        await updateFlowStep(flow.id, 'completed');
        return "❌ Booking cancelled. Type 'ride' to start a new booking.";
      } else {
        return "Please reply 'confirm' to book the ride or 'cancel' to cancel.";
      }
      
    default:
      return "Let's start over. Type 'ride' to book a new trip.";
  }
}

async function handleDriverOnboardingFlow(flow: any, message: string, phone: string): Promise<string> {
  const step = flow.current_step;
  
  switch (step) {
    case 'greeting':
      if (message.length < 2) {
        return "Please provide your full name to continue.";
      }
      
      await updateFlowStep(flow.id, 'vehicle_info');
      return `👋 Hello ${message}!\n\nWhat's your vehicle plate number?`;
      
    case 'vehicle_info':
      if (message.length < 3) {
        return "Please provide a valid plate number.";
      }
      
      await updateFlowStep(flow.id, 'verification');
      return `🚗 Vehicle: ${message}\n\nTo complete registration, we need to verify your details. Our team will contact you within 24 hours.\n\nFor now, you can start practice mode by typing 'driver on'.`;
      
    default:
      return "Welcome to easyMO Driver! Type 'driver' to start registration.";
  }
}

async function updateFlowStep(flowId: string, newStep: string) {
  await supabase
    .from('conversation_flows')
    .update({ 
      current_step: newStep,
      flow_data: { updated_at: new Date().toISOString() }
    })
    .eq('id', flowId);
}

async function handleUnknownInput(message: string, phone: string, flow: any): Promise<string> {
  // Smart fallback responses
  const helpKeywords = ['help', 'assist', 'support', 'stuck'];
  const bookingKeywords = ['ride', 'trip', 'go', 'travel', 'taxi'];
  const driverKeywords = ['driver', 'earn', 'work', 'job'];
  
  if (helpKeywords.some(keyword => message.includes(keyword))) {
    return "🆘 Need help?\n\n🚗 Type 'ride' to book a trip\n🛵 Type 'driver' to become a driver\n📞 Call +250-XXX-XXXX for support\n\nWhat can I help you with?";
  }
  
  if (bookingKeywords.some(keyword => message.includes(keyword))) {
    return "🚗 I can help you book a ride! Please share your pickup location to get started.";
  }
  
  if (driverKeywords.some(keyword => message.includes(keyword))) {
    return "🛵 Interested in becoming a driver? Type 'driver' to start the registration process.";
  }
  
  return "I didn't understand that. Here's what I can help with:\n\n🚗 'ride' - Book a trip\n🛵 'driver' - Become a driver\n❓ 'help' - Get support\n\nJust type one of these options!";
}
