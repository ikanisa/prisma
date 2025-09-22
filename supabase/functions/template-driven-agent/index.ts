import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Action-First Templates for Type-Once, Tap-Once UX
const ACTION_TEMPLATES = {
  pay_offer_v1: {
    text: "💰 Amount {{amount}} RWF. Ready to create QR?",
    interactive: {
      type: "button",
      body: "💰 Amount {{amount}} RWF. Ready to create QR?",
      buttons: [
        { id: "PAY_{{txId}}", title: "📱 Create QR" },
        { id: "CANCEL_PAY", title: "❌ Cancel" }
      ]
    }
  },
  ride_offer_v1: {
    text: "🚗 Book ride to {{destination}}?",
    interactive: {
      type: "button", 
      body: "🚗 Book ride to {{destination}}?",
      buttons: [
        { id: "RIDE_CONFIRM_{{txId}}", title: "✅ Yes" },
        { id: "RIDE_CANCEL", title: "❌ No" }
      ]
    }
  },
  biz_suggest_v1: {
    text: "🏪 Here are nearby {{keyword}}:",
    interactive: {
      type: "list",
      body: "Choose a business:",
      sections: [{
        title: "Nearby {{keyword}}",
        rows: "{{businesses}}"
      }]
    }
  },
  clarify_intent: {
    text: "I'm not sure what you need. Could you clarify?",
    interactive: {
      type: "button",
      body: "What would you like to do?",
      buttons: [
        { id: "CLARIFY_PAYMENT", title: "💰 Payment" },
        { id: "CLARIFY_RIDE", title: "🏍️ Ride" },
        { id: "CLARIFY_SHOP", title: "🛒 Shop" }
      ]
    }
  },
  quick_menu: {
    text: "⚡ Quick Menu",
    interactive: {
      type: "button",
      body: "What can I help you with?",
      buttons: [
        { id: "QUICK_PAYMENT", title: "💰 Payment" },
        { id: "QUICK_RIDE", title: "🏍️ Ride" },
        { id: "QUICK_SHOP", title: "🛒 Shop" }
      ]
    }
  },
  driver_online_v1: {
    text: "🏍️ Ready to go online?",
    interactive: {
      type: "button",
      body: "Start accepting ride requests:",
      buttons: [
        { id: "DRIVER_GO_ONLINE", title: "🟢 Go Online" },
        { id: "DRIVER_CHECK_EARNINGS", title: "💰 Check Earnings" }
      ]
    }
  }
};

// Generate unique transaction ID
function generateTxId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Apply template with parameters
function applyTemplate(template: any, parameters: any = {}): any {
  const stringify = JSON.stringify(template);
  const replaced = stringify.replace(/\{\{(\w+)\}\}/g, (match, key) => parameters[key] || match);
  return JSON.parse(replaced);
}

// Get user context and preferences
async function getUserContext(phoneNumber: string) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    return {
      profile: profile || null,
      preferred_service: profile?.preferred_service || null,
      isNewUser: !profile,
      location: profile?.location || null
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return { isNewUser: true, preferred_service: null };
  }
}

// Check for duplicate messages (middleware enforcement)
async function checkLastMessage(phoneNumber: string, messageToSend: string): Promise<boolean> {
  try {
    const { data: lastMessage } = await supabase
      .from('conversation_messages')
      .select('content')
      .eq('conversation_id', `whatsapp_${phoneNumber}`)
      .eq('sender', 'agent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage && lastMessage.content === messageToSend) {
      console.log('🚫 Duplicate message prevented');
      return true; // Is duplicate
    }
    return false;
  } catch {
    return false; // No previous message or error, proceed
  }
}

// Send composed WhatsApp message
async function sendComposedMessage(phoneNumber: string, template: any, parameters: any = {}) {
  const processedTemplate = applyTemplate(template, parameters);
  const messageText = processedTemplate.text || processedTemplate.interactive?.body || "Action required";
  
  // Check for duplicate
  if (await checkLastMessage(phoneNumber, messageText)) {
    return;
  }

  try {
    await supabase.functions.invoke('compose-whatsapp-message', {
      body: {
        mode: processedTemplate.interactive ? 'interactive' : 'text',
        recipient: phoneNumber,
        content: processedTemplate.interactive || processedTemplate.text || processedTemplate,
        message_id: `action_${Date.now()}`,
        tool_name: 'action_template'
      }
    });

    // Log interaction
    await supabase.from('conversation_messages').insert({
      conversation_id: `whatsapp_${phoneNumber}`,
      sender: 'agent',
      content: messageText,
      message_type: processedTemplate.interactive ? 'interactive' : 'text',
      metadata: { template_used: true, parameters }
    });

    console.log('✅ Action template sent successfully');
  } catch (error) {
    console.error('❌ Failed to send action template:', error);
  }
}

// Handle Type-Once, Tap-Once flow
async function handleInbound(userText: string, phoneNumber: string) {
  const ctx = await getUserContext(phoneNumber);
  
  // Step 1: Intent detection using external NLU
  let intentData;
  try {
    const nluResponse = await supabase.functions.invoke('detect-intent-slots', {
      body: { userText }
    });
    intentData = nluResponse.data;
  } catch (error) {
    console.error('NLU detection failed:', error);
    intentData = { intent: 'unknown', confidence: 0.2, slots: {} };
  }

  console.log('🧠 Intent detected:', intentData);

  // Step 2: Memory bias - if confidence low but user has preferred service
  if (intentData.confidence < 0.4 && ctx.preferred_service) {
    intentData.intent = ctx.preferred_service;
    intentData.confidence = 0.8;
    console.log('🧠 Applied memory bias to:', ctx.preferred_service);
  }

  // Step 3: Confidence handling
  if (intentData.confidence < 0.75) {
    if (intentData.confidence >= 0.4) {
      // Send clarification template
      await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.clarify_intent);
      return { handled: true, action: 'clarify' };
    } else {
      // Low confidence - send quick menu
      await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.quick_menu);
      return { handled: true, action: 'menu' };
    }
  }

  // Step 4: Action offer based on intent
  const txId = generateTxId();
  
  switch (intentData.intent) {
    case 'payment':
      const amount = intentData.slots.amount || 1000;
      await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.pay_offer_v1, { 
        amount: amount.toLocaleString(), 
        txId 
      });
      
      // Cache payment data
      await supabase.from('temporary_cache').upsert({
        key: `PAY_${txId}`,
        value: { amount, phoneNumber, type: 'payment' },
        expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
      });
      
      return { handled: true, action: 'payment_offer' };

    case 'ride':
      const destination = intentData.slots.destination_text || 'your destination';
      await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.ride_offer_v1, {
        destination,
        txId
      });
      
      // Cache ride data
      await supabase.from('temporary_cache').upsert({
        key: `RIDE_${txId}`,
        value: { destination, phoneNumber, type: 'ride' },
        expires_at: new Date(Date.now() + 3600000).toISOString()
      });
      
      return { handled: true, action: 'ride_offer' };

    case 'find_business':
      const keyword = intentData.slots.keyword || 'businesses';
      
      // Find nearby businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, category, rating')
        .ilike('name', `%${keyword}%`)
        .or(`category.ilike.%${keyword}%`)
        .limit(5);

      if (businesses && businesses.length > 0) {
        const businessRows = businesses.map(b => ({
          id: `BIZ_${b.id}`,
          title: b.name,
          description: `⭐ ${b.rating}/5 • ${b.category}`
        }));

        await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.biz_suggest_v1, {
          keyword,
          businesses: businessRows
        });
      } else {
        await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.quick_menu);
      }
      
      return { handled: true, action: 'business_search' };

    case 'driver':
      if (intentData.slots.action === 'go_online') {
        await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.driver_online_v1);
        return { handled: true, action: 'driver_mode' };
      }
      break;

    default:
      // Unknown intent - send quick menu
      await sendComposedMessage(phoneNumber, ACTION_TEMPLATES.quick_menu);
      return { handled: true, action: 'fallback_menu' };
  }

  return { handled: false };
}

// Update user preferences based on usage
async function updateUserPreferences(phoneNumber: string, intent: string) {
  try {
    // Count recent usage of this intent
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', `whatsapp_${phoneNumber}`)
      .eq('sender', 'agent')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString()) // Last 7 days
      .like('metadata->template_used', `%${intent}%`);

    // If user used this service 3+ times, set as preferred
    if (count && count >= 3) {
      await supabase
        .from('user_profiles')
        .upsert({
          phone_number: phoneNumber,
          preferred_service: intent,
          updated_at: new Date().toISOString()
        });
      
      console.log(`🧠 Updated preferred service for ${phoneNumber}: ${intent}`);
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
  }
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message, message_id } = await req.json();

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'phone_number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Type-Once-Tap-Once agent: ${phone_number} - ${message}`);

    // Handle the inbound message with action-first approach
    const result = await handleInbound(message, phone_number);

    if (result.handled) {
      // Update user preferences for memory enrichment
      if (result.action.includes('payment') || result.action.includes('ride') || result.action.includes('business')) {
        const intent = result.action.split('_')[0];
        await updateUserPreferences(phone_number, intent);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: result.action,
          approach: 'type_once_tap_once'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback - should rarely happen with the new system
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Unable to process request',
        fallback_used: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Type-Once-Tap-Once agent error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});