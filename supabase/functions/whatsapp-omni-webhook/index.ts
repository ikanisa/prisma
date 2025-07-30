import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface WhatsAppMessage {
  from: string;
  text?: { body: string };
  type: string;
  timestamp: string;
  id: string;
}

interface WebhookEntry {
  changes: Array<{
    value: {
      messages?: WhatsAppMessage[];
      statuses?: any[];
    };
  }>;
}

class OmniAgent {
  private userId: string;
  private phone: string;

  constructor(userId: string, phone: string) {
    this.userId = userId;
    this.phone = phone;
  }

  async processMessage(message: string): Promise<string> {
    try {
      console.log(`Processing message for user ${this.userId}: ${message}`);

      // Get user context and conversation state
      const context = await this.getUserContext();
      
      // Route through intent detection
      const routingDecision = await this.detectIntent(message, context);
      
      // Execute agent skill
      const response = await this.executeSkill(routingDecision, message, context);
      
      // Log interaction
      await this.logInteraction(message, response, routingDecision);
      
      return response;
    } catch (error) {
      console.error(`Error processing message for ${this.userId}:`, error);
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  private async getUserContext(): Promise<any> {
    const { data: conversationState } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    const { data: userMemory } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    return {
      state: conversationState,
      memory: userMemory || [],
      phone: this.phone
    };
  }

  private async detectIntent(message: string, context: any): Promise<any> {
    const prompt = `
    You are the easyMO intent router. Analyze this message and determine the best agent skill to handle it.

    Available Skills:
    - payments: Money transfers, QR codes, bills, balance
    - moto: Transport, rides, drivers, delivery
    - commerce: Shopping, products, orders, marketplace
    - listings: Property, vehicles, services to sell/rent
    - events: Concerts, festivals, bookings
    - business: Bar/pharmacy orders, business operations
    - support: Help, complaints, technical issues

    Message: "${message}"
    Current stage: ${context.state?.current_stage || 'initial'}
    Recent context: ${JSON.stringify(context.memory.slice(0, 2))}

    Respond with JSON only:
    {
      "skill": "skill_name",
      "confidence": 0.95,
      "intent": "specific_intent",
      "parameters": {}
    }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch {
      return { skill: 'support', confidence: 0.5, intent: 'fallback', parameters: {} };
    }
  }

  private async executeSkill(routing: any, message: string, context: any): Promise<string> {
    try {
      console.log(`🎯 Executing skill: ${routing.skill} with intent: ${routing.intent}`);
      
      // Execute skills directly based on intent
      switch (routing.skill) {
        case 'payments':
          return await this.handlePayments(routing, message, context);
        case 'moto':
          return await this.handleMoto(routing, message, context);
        case 'commerce':
          return await this.handleCommerce(routing, message, context);
        case 'listings':
          return await this.handleListings(routing, message, context);
        default:
          return await this.handleSupport(routing, message, context);
      }
    } catch (error) {
      console.error('Error executing skill:', error);
      return "I understand your request. Let me get you the help you need. Please wait a moment while I process this.";
    }
  }

  private async handlePayments(routing: any, message: string, context: any): Promise<string> {
    const intent = routing.intent;
    
    if (intent === 'get_paid' || message.toLowerCase().includes('pay')) {
      return "💰 **easyMO Payments**\n\nI can help you with:\n🔗 Generate QR code to receive payment\n💸 Send money to someone\n📊 Check your balance\n\nWhat would you like to do? Just say 'generate qr' or 'send money'.";
    }
    
    if (message.toLowerCase().includes('qr') || message.toLowerCase().includes('generate')) {
      return "🔗 **Generate Payment QR Code**\n\nPlease tell me the amount you want to receive. For example: 'Generate QR for 5000 RWF'";
    }
    
    return "💰 I can help you with payments. Say 'generate qr', 'send money', or 'check balance'.";
  }

  private async handleMoto(routing: any, message: string, context: any): Promise<string> {
    if (message.toLowerCase().includes('ride') || routing.intent === 'passenger_create_intent') {
      return "🏍️ **easyMO Moto**\n\nI'll help you find a ride!\n\n📍 Please share your current location\n📍 Where do you want to go?\n\nOr just tell me: 'From [location] to [destination]'";
    }
    
    if (message.toLowerCase().includes('driver')) {
      return "🏍️ **Driver Mode**\n\nI can help you:\n🟢 Go online for passengers\n📍 Update your location\n💰 Check earnings\n\nSay 'go online' to start accepting rides.";
    }
    
    return "🏍️ I can help you with transport. Say 'need ride', 'find driver', or 'go online' if you're a driver.";
  }

  private async handleCommerce(routing: any, message: string, context: any): Promise<string> {
    if (message.toLowerCase().includes('bar') || message.toLowerCase().includes('drink')) {
      return "🍺 **easyMO Bar Orders**\n\nOrder drinks from local bars:\n🍻 Browse drink menu\n📱 Scan table QR code\n🚚 Get delivery\n\nSay 'show bars' or 'scan table' to get started.";
    }
    
    if (message.toLowerCase().includes('pharmacy')) {
      return "💊 **easyMO Pharmacy**\n\nOrder medicine and health products:\n🔍 Search medications\n📋 Upload prescription\n🚚 Get delivery\n\nSay 'find medicine' to browse pharmacy products.";
    }
    
    return "🛒 I can help you shop. Say 'find bars', 'pharmacy', or 'hardware store' for what you need.";
  }

  private async handleListings(routing: any, message: string, context: any): Promise<string> {
    if (message.toLowerCase().includes('house') || message.toLowerCase().includes('rent')) {
      return "🏠 **easyMO Property**\n\nFind your perfect home:\n🔍 Search houses for rent\n🏗️ Apartments for sale\n📝 List your property\n\nSay 'find houses' or 'rent apartment' to search.";
    }
    
    return "🏠 I can help you find property. Say 'find house', 'rent apartment', or 'list property'.";
  }

  private async handleSupport(routing: any, message: string, context: any): Promise<string> {
    return "👋 **Welcome to easyMO!**\n\nI can help you with:\n\n💰 **Payments** - Send money, receive payments\n🏍️ **Moto** - Book rides, find drivers\n🛒 **Shopping** - Bars, pharmacy, hardware\n🏠 **Property** - Find houses, apartments\n\nWhat do you need help with today?";
  }

  private async logInteraction(message: string, response: string, routing: any): Promise<void> {
    await supabase.from('agent_conversations').insert({
      user_id: this.userId,
      role: 'user',
      message,
      metadata: { routing, phone: this.phone }
    });

    await supabase.from('agent_conversations').insert({
      user_id: this.userId,
      role: 'assistant',
      message: response,
      metadata: { skill: routing.skill, intent: routing.intent }
    });

    // Update conversation state
    await supabase.from('conversation_state').upsert({
      user_id: this.userId,
      current_stage: routing.intent || 'active',
      last_intent: routing.intent,
      confidence: routing.confidence,
      context_data: { last_skill: routing.skill },
      updated_at: new Date().toISOString()
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Verify webhook (WhatsApp requirement)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === whatsappToken) {
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      } else {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
    }

    // Process incoming messages
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        const webhookEntry = entry as WebhookEntry;
        
        for (const change of webhookEntry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              const userPhone = message.from;
              const messageText = message.text?.body || '';
              
              if (messageText) {
                console.log(`Processing message from ${userPhone}: ${messageText}`);
                
                // Create omni agent instance
                const agent = new OmniAgent(userPhone, userPhone);
                const response = await agent.processMessage(messageText);
                
                console.log(`Generated response: ${response}`);
                
                // Send response back to WhatsApp
                await sendWhatsAppMessage(userPhone, response);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: 'processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Send message back to WhatsApp user
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${Deno.env.get('META_WABA_PHONE_ID')}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('META_WABA_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    console.log(`✅ Message sent to ${phone}: ${message.substring(0, 50)}...`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    // Don't throw - log error but continue processing
  }
}