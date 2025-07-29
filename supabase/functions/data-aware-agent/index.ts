import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContext {
  phone: string;
  name?: string;
  location?: { lat: number; lng: number; address?: string };
  preferredLanguage: string;
  lastInteraction?: string;
  conversationCount: number;
  userType: 'new' | 'returning' | 'power_user';
  currentFlow?: string;
  currentStep?: string;
  pendingActions?: any[];
  memory?: Record<string, any>;
}

class AIDataAgent {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  async processMessage(message: string, userContext: UserContext): Promise<string> {
    console.log(`🧠 AI Data Agent processing: "${message}" for ${userContext.phone}`);
    
    try {
      // Step 1: Get real-time data context
      const dataContext = await this.gatherDataContext(userContext, message);
      
      // Step 2: Process with OpenAI using data-aware prompting
      const aiResponse = await this.processWithAI(message, userContext, dataContext);
      
      // Step 3: Execute any required database operations
      const result = await this.executeDataOperations(aiResponse, userContext, dataContext);
      
      return result;
    } catch (error) {
      console.error('❌ AI Data Agent error:', error);
      return this.getFallbackResponse(userContext);
    }
  }

  private async gatherDataContext(userContext: UserContext, message: string): Promise<any> {
    const context: any = {};
    
    try {
      // Gather location-based data if user has location
      if (userContext.location) {
        // Get nearby drivers
        const { data: drivers } = await this.supabase.rpc("fn_get_nearby_drivers_spatial", {
          lat: userContext.location.lat,
          lng: userContext.location.lng,
          radius: 5
        });
        context.nearbyDrivers = drivers || [];

        // Get nearby passengers
        const { data: passengers } = await this.supabase
          .from('passenger_intents_spatial')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(10);
        context.nearbyPassengers = passengers || [];

        // Get nearby businesses
        const { data: businesses } = await this.supabase
          .from('businesses')
          .select('*')
          .eq('status', 'active')
          .limit(10);
        context.nearbyBusinesses = businesses || [];
      }

      // Get user's interaction history
      const { data: recentMessages } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', userContext.phone)
        .order('created_at', { ascending: false })
        .limit(5);
      context.recentHistory = recentMessages || [];

      // Get user's payment history
      const { data: payments } = await this.supabase
        .from('payments')
        .select('*')
        .eq('user_phone', userContext.phone)
        .order('created_at', { ascending: false })
        .limit(3);
      context.paymentHistory = payments || [];

      // Get products for marketplace queries
      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .gt('stock_qty', 0)
        .limit(10);
      context.availableProducts = products || [];

      // Check if user is a driver
      const { data: driverProfile } = await this.supabase
        .from('drivers')
        .select('*')
        .or(`phone.eq.${userContext.phone},user_id.eq.${userContext.phone}`)
        .maybeSingle();
      context.isDriver = !!driverProfile;
      context.driverProfile = driverProfile;

      return context;
    } catch (error) {
      console.error('Error gathering data context:', error);
      return context;
    }
  }

  private async processWithAI(message: string, userContext: UserContext, dataContext: any): Promise<any> {
    const systemPrompt = this.buildDataAwarePrompt(userContext, dataContext);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // Try to parse as JSON for structured responses
      try {
        return JSON.parse(content);
      } catch {
        return {
          response: content,
          action: 'text_response',
          confidence: 0.8
        };
      }
    } catch (error) {
      console.error('❌ OpenAI processing error:', error);
      throw error;
    }
  }

  private buildDataAwarePrompt(userContext: UserContext, dataContext: any): string {
    return `You are the easyMO AI Data Agent. Use REAL DATA from the database to provide accurate, helpful responses.

# USER CONTEXT
- Phone: ${userContext.phone}
- Type: ${userContext.userType}
- Language: ${userContext.preferredLanguage}
- Location: ${userContext.location ? 'Available' : 'Not shared'}
- Is Driver: ${dataContext.isDriver ? 'Yes' : 'No'}

# REAL-TIME DATA AVAILABLE
- Nearby Drivers: ${dataContext.nearbyDrivers?.length || 0} drivers within 5km
- Nearby Passengers: ${dataContext.nearbyPassengers?.length || 0} passenger requests within 10km  
- Nearby Businesses: ${dataContext.nearbyBusinesses?.length || 0} active businesses
- Available Products: ${dataContext.availableProducts?.length || 0} products in stock
- Payment History: ${dataContext.paymentHistory?.length || 0} recent payments
- Recent Conversations: ${dataContext.recentHistory?.length || 0} messages

# DRIVERS DATA
${dataContext.nearbyDrivers?.length > 0 ? 
  dataContext.nearbyDrivers.map(d => `- ${d.driver_type?.toUpperCase() || 'MOTO'}: ${d.driver_phone} (${d.distance_km?.toFixed(1) || '?'}km away, ${d.status || 'available'})`).join('\n') 
  : '- No drivers currently available in the area'}

# PASSENGER REQUESTS
${dataContext.nearbyPassengers?.length > 0 ? 
  dataContext.nearbyPassengers.map(p => `- ${p.from_text} → ${p.to_text} (${p.seats_needed || 1} seats, budget: ${p.max_price_rwf || 'negotiable'} RWF)`).join('\n')
  : '- No active passenger requests in the area'}

# BUSINESSES DATA
${dataContext.nearbyBusinesses?.length > 0 ? 
  dataContext.nearbyBusinesses.map(b => `- ${b.name} (${b.category || 'General'}) - ${b.phone_number || 'No phone'}`).join('\n')
  : '- No businesses found in database'}

# PRODUCTS DATA  
${dataContext.availableProducts?.length > 0 ? 
  dataContext.availableProducts.map(p => `- ${p.name}: ${p.price_rwf} RWF (${p.stock_qty} in stock)`).join('\n')
  : '- No products currently available'}

# INSTRUCTIONS
1. ALWAYS use the real data provided above - never make up information
2. If no data is available for a request, clearly state this fact
3. For location-based requests without user location, ask them to share it
4. Provide specific details from the database (phone numbers, exact distances, prices)
5. If user wants to take action (book ride, contact driver, etc.), provide specific instructions

# RESPONSE FORMAT
Respond with JSON in this format:
{
  "response": "Your message to the user using real data",
  "action": "text_response|create_payment|book_ride|go_online|contact_business",
  "data": {...any data needed for the action},
  "confidence": 0.0-1.0
}

# PERSONA
- Warm, respectful, Rwanda-first cultural awareness
- Action-oriented and efficient
- Always base responses on real database data
- Be transparent about data availability
- Provide specific, actionable information when possible

Use ONLY the real data provided above. Do not invent or assume any information not explicitly given.`;
  }

  private async executeDataOperations(aiResponse: any, userContext: UserContext, dataContext: any): Promise<string> {
    if (!aiResponse.action || aiResponse.action === 'text_response') {
      return aiResponse.response || this.getFallbackResponse(userContext);
    }

    try {
      switch (aiResponse.action) {
        case 'create_payment':
          return await this.handlePaymentCreation(aiResponse.data, userContext);
        
        case 'book_ride':
          return await this.handleRideBooking(aiResponse.data, userContext);
        
        case 'go_online':
          return await this.handleDriverGoOnline(userContext, dataContext);
        
        case 'contact_business':
          return this.handleBusinessContact(aiResponse.data, aiResponse.response);
        
        default:
          return aiResponse.response || this.getFallbackResponse(userContext);
      }
    } catch (error) {
      console.error('❌ Error executing data operation:', error);
      return aiResponse.response || this.getFallbackResponse(userContext);
    }
  }

  private async handlePaymentCreation(data: any, userContext: UserContext): Promise<string> {
    try {
      const { data: result, error } = await this.supabase.functions.invoke('create-momo-payment-link', {
        body: {
          amount: data.amount,
          currency: 'RWF',
          phoneNumber: userContext.phone,
          description: data.description || `Payment request for ${data.amount} RWF`,
          userPhone: userContext.phone
        }
      });

      if (error) throw error;

      if (result?.success) {
        return `💰 *PAYMENT CREATED*\n\n💵 Amount: ${data.amount?.toLocaleString()} RWF\n📱 USSD: ${result.ussdCode}\n📄 QR Code: ${result.qrCodeUrl}\n🔗 Payment Link: ${result.paymentLink}\n\n✅ Expires: ${new Date(result.expiresAt).toLocaleTimeString()}\n📲 Share with payer to complete transaction\n\n🆔 Payment ID: ${result.paymentId}`;
      } else {
        throw new Error(result?.error || 'Payment creation failed');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      return "❌ *Payment Error*\n\nCouldn't generate payment link\nPlease try again in a moment";
    }
  }

  private async handleRideBooking(data: any, userContext: UserContext): Promise<string> {
    try {
      // Create passenger intent in database
      const { data: intent, error } = await this.supabase
        .from('passenger_intents_spatial')
        .insert({
          passenger_phone: userContext.phone,
          from_text: data.pickup || 'Current location',
          to_text: data.destination,
          seats_needed: data.seats || 1,
          max_price_rwf: data.maxPrice || null,
          pickup: userContext.location ? `SRID=4326;POINT(${userContext.location.lng} ${userContext.location.lat})` : null,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      return `🚗 *RIDE REQUEST CREATED*\n\n📍 From: ${data.pickup || 'Your location'}\n🎯 To: ${data.destination}\n👥 Seats: ${data.seats || 1}\n\n✅ Request ID: ${intent.id}\n⏱️ Drivers in your area will be notified\n📞 You'll receive contact from interested drivers\n\nWant to contact drivers directly? Reply 'nearby drivers'`;
    } catch (error) {
      console.error('Ride booking error:', error);
      return "❌ *Booking Error*\n\nCouldn't create ride request\nPlease try again";
    }
  }

  private async handleDriverGoOnline(userContext: UserContext, dataContext: any): Promise<string> {
    if (!dataContext.isDriver) {
      return "👤 You need to register as a driver first. Reply 'register driver' to get started.";
    }

    if (!userContext.location) {
      return "📍 To go online, please share your current location so passengers can find you.";
    }

    try {
      // Update driver session
      await this.supabase
        .from('driver_sessions')
        .upsert({
          driver_id: dataContext.driverProfile.id,
          status: 'online',
          last_location: `SRID=4326;POINT(${userContext.location.lng} ${userContext.location.lat})`,
          session_start: new Date().toISOString()
        }, { onConflict: 'driver_id' });

      // Update driver status
      await this.supabase
        .from('drivers')
        .update({ 
          status: 'active',
          location_gps: `SRID=4326;POINT(${userContext.location.lng} ${userContext.location.lat})`
        })
        .eq('id', dataContext.driverProfile.id);

      return `🟢 *YOU'RE NOW ONLINE!*\n\n✅ Status: Active\n📍 Location: Updated\n🚗 Vehicle: ${dataContext.driverProfile.driver_type?.toUpperCase() || 'MOTO'}\n\n👥 Passengers can now see and contact you\n💰 You'll receive ride requests in your area\n\n🔔 Keep WhatsApp open to receive requests!\nType 'offline' when you want to stop driving.`;
    } catch (error) {
      console.error('Driver online error:', error);
      return "❌ Error going online. Please try again.";
    }
  }

  private handleBusinessContact(data: any, baseResponse: string): string {
    return baseResponse;
  }

  private getFallbackResponse(userContext: UserContext): string {
    if (userContext.userType === 'new') {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *Try these now*:\n💰 Send '5000' → Instant payment QR\n🛵 Send 'nearby drivers' → Find transport\n🛒 Send 'find pharmacy' → Locate services\n\n✨ I understand natural language - just tell me what you need!\n\n🎯 What would you like to try first?`;
    }
    
    return "I'd love to help! 😊\n\n🎯 *Popular requests*:\n💰 Payment QR: Send any amount\n🛵 Transport: Tell me your destination\n🛒 Shopping: What are you looking for?\n📦 Delivery: What needs to be sent?\n\n💬 Just describe what you need - I'm here to assist!";
  }
}

class ConversationManager {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getOrCreateUserContext(phone: string): Promise<UserContext> {
    try {
      // Get user data
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      // Get user location
      const { data: location } = await this.supabase
        .from('user_locations')
        .select('*')
        .eq('phone_number', phone)
        .single();

      // Get conversation history
      const { data: conversations } = await this.supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', phone)
        .order('ts', { ascending: false })
        .limit(10);

      const conversationCount = conversations?.length || 0;
      const lastInteraction = conversations?.[0]?.ts;
      
      // Determine user type
      let userType: 'new' | 'returning' | 'power_user' = 'new';
      if (conversationCount > 20) userType = 'power_user';
      else if (conversationCount > 0) userType = 'returning';

      return {
        phone,
        name: user?.name,
        location: location ? {
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
          address: location.address
        } : undefined,
        preferredLanguage: 'en',
        lastInteraction,
        conversationCount,
        userType,
        preferences: {}
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        phone,
        preferredLanguage: 'en',
        conversationCount: 0,
        userType: 'new'
      };
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, contact_name, message_id } = await req.json();
    
    console.log(`🧠 AI Data Agent processing: ${phone} - ${message}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const conversationManager = new ConversationManager(supabase);
    const aiDataAgent = new AIDataAgent(supabase, openaiApiKey);

    // Get user context with real data
    const userContext = await conversationManager.getOrCreateUserContext(phone);
    
    // Process with AI using real database data
    const response = await aiDataAgent.processMessage(message, userContext);

    // Log conversation
    await supabase.from('agent_conversations').insert([
      {
        user_id: phone,
        role: 'user',
        message: message,
        metadata: { timestamp: new Date().toISOString() }
      },
      {
        user_id: phone,
        role: 'assistant',
        message: response,
        metadata: { 
          agent: 'data-aware-agent',
          contact_name,
          message_id,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    console.log(`✅ AI Data Agent response generated for ${phone}`);

    return new Response(JSON.stringify({
      success: true,
      response: response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AI Data Agent error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});