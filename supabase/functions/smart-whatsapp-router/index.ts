import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { MessageProcessor } from '../whatsapp-webhook/utils/message-processor.ts';
import { OnboardingAgent } from '../whatsapp-webhook/agents/onboarding-agent.ts';
import { PaymentAgent } from '../whatsapp-webhook/agents/payment-agent.ts';
import { ListingAgent } from '../whatsapp-webhook/agents/listing-agent.ts';
import { LogisticsAgent } from '../whatsapp-webhook/agents/logistics-agent.ts';
import { MarketplaceAgent } from '../whatsapp-webhook/agents/marketplace-agent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from, text, message_id, contact_name, timestamp, message_type } = await req.json();
    
    console.log(`🎯 Smart routing message from ${from}: ${text}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Initialize agents
    const messageProcessor = new MessageProcessor(supabase);
    const onboardingAgent = new OnboardingAgent(supabase);
    const paymentAgent = new PaymentAgent(supabase);
    const listingAgent = new ListingAgent(supabase);
    const logisticsAgent = new LogisticsAgent(supabase);
    const marketplaceAgent = new MarketplaceAgent(supabase);

    // Get or create user with new user detection
    const { user, isNewUser } = await messageProcessor.getOrCreateUser(from);
    
    // Log the conversation
    await supabase.from('agent_conversations').insert({
      user_id: from,
      role: 'user',
      message: text,
      metadata: { 
        whatsapp_id: message_id,
        timestamp: timestamp,
        is_new_user: isNewUser,
        contact_name: contact_name
      }
    });

    // Smart routing with enhanced logic
    let response = '';
    let agentUsed = '';
    const msg = text.toLowerCase().trim();
    
    try {
      // Priority 1: New user gets welcome message
      if (isNewUser) {
        response = await onboardingAgent.process(text, user, from, true);
        agentUsed = 'onboarding';
      }
      // Priority 2: Direct payment intents (amounts)
      else if (text.match(/^\d+$/)) {
        response = await paymentAgent.process(text, user, from);
        agentUsed = 'payment';
      }
      // Priority 3: Payment with phone number
      else if (text.match(/\d+\s+07\d{8}/)) {
        response = await paymentAgent.process(text, user, from);
        agentUsed = 'payment';
      }
      // Priority 4: Payment-related keywords
      else if (msg.includes('pay') || msg.includes('money') || msg.includes('qr') || msg.includes('scan') || msg.includes('get paid') || msg.includes('receive')) {
        response = await paymentAgent.process(text, user, from);
        agentUsed = 'payment';
      }
      // Priority 5: Product/farming keywords
      else if ((msg.includes('add ') && text.match(/\d+kg|\d+units|\d+\s+\d+/)) || msg.includes('sell') || msg.includes('produce') || msg.includes('farm')) {
        response = await listingAgent.process(text, user, from);
        agentUsed = 'listing';
      }
      // Priority 6: Transport keywords  
      else if (msg.includes('driver') || msg.includes('ride') || msg.includes('trip') || msg.includes('transport') || msg.includes('moto')) {
        response = await logisticsAgent.process(text, user, from);
        agentUsed = 'logistics';
      }
      // Priority 7: Shopping keywords
      else if (msg.includes('shop') || msg.includes('browse') || msg.includes('buy') || msg.includes('find ')) {
        response = await marketplaceAgent.process(text, user, from);
        agentUsed = 'marketplace';
      }
      // Priority 8: General queries and navigation
      else {
        response = await onboardingAgent.process(text, user, from, false);
        agentUsed = 'onboarding';
      }

      // Log AI response
      await supabase.from('agent_conversations').insert({
        user_id: from,
        role: 'assistant',
        message: response,
        metadata: { 
          agent: agentUsed,
          timestamp: new Date().toISOString(),
          routing_reason: determineRoutingReason(text, isNewUser)
        }
      });

      // Send response via WhatsApp
      const whatsappResponse = await fetch('https://graph.facebook.com/v21.0/544788625370996/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: { body: response }
        })
      });

      if (!whatsappResponse.ok) {
        console.error('WhatsApp API error:', await whatsappResponse.text());
        throw new Error('Failed to send WhatsApp message');
      }

      console.log(`✅ Response sent to ${from} via ${agentUsed} agent`);

      return new Response(JSON.stringify({
        success: true,
        agent_used: agentUsed,
        response_sent: true,
        is_new_user: isNewUser
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (agentError) {
      console.error(`❌ Agent processing error:`, agentError);
      
      // Fallback response
      const fallbackResponse = "Welcome to easyMO! 💰 Send amount for instant QR (e.g., '5000') or 'menu' for options.";
      
      await fetch('https://graph.facebook.com/v21.0/544788625370996/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: { body: fallbackResponse }
        })
      });

      return new Response(JSON.stringify({
        success: true,
        agent_used: 'fallback',
        response_sent: true,
        error: agentError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Smart router error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function determineRoutingReason(text: string, isNewUser: boolean): string {
  if (isNewUser) return 'new_user';
  if (text.match(/^\d+$/)) return 'direct_amount';
  if (text.match(/\d+\s+07\d{8}/)) return 'amount_with_phone';
  
  const msg = text.toLowerCase();
  if (msg.includes('pay') || msg.includes('money') || msg.includes('qr')) return 'payment_keywords';
  if (msg.includes('add ') && text.match(/\d+kg|\d+units/)) return 'product_listing';
  if (msg.includes('driver') || msg.includes('ride')) return 'transport_keywords';
  if (msg.includes('shop') || msg.includes('browse')) return 'shopping_keywords';
  
  return 'general_query';
}