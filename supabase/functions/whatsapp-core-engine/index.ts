import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { 
  createChatCompletion,
  generateIntelligentResponse,
  analyzeIntent,
  type AIMessage,
  type CompletionOptions
} from "../_shared/openai-sdk.ts";

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
  profile?: any;
  state?: any;
}

class IntelligentCoreEngine {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  async processMessage(
    from: string, 
    text: string, 
    messageType: string, 
    userContext: UserContext,
    additionalData?: any
  ): Promise<string> {
    console.log(`🧠 Intelligent Core processing: ${from} - ${text} (${messageType})`);

    try {
      // Build comprehensive context for AI
      const fullContext = await this.buildFullContext(userContext, text, messageType, additionalData);
      
      // Process with OpenAI for intelligent response
      const aiResponse = await this.processWithAI(text, fullContext);
      
      // Execute any required actions
      const finalResponse = await this.executeActions(aiResponse, userContext, fullContext);
      
      return finalResponse;
    } catch (error) {
      console.error('❌ Intelligent Core error:', error);
      return this.getFallbackResponse(userContext);
    }
  }

  private async buildFullContext(
    userContext: UserContext, 
    message: string, 
    messageType: string,
    additionalData?: any
  ): Promise<any> {
    const context: any = {
      user: userContext,
      message: {
        text: message,
        type: messageType,
        ...additionalData
      }
    };

    try {
      // Get user's recent conversation history
      const { data: recentMessages } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', userContext.phone)
        .order('created_at', { ascending: false })
        .limit(5);
      context.recentHistory = recentMessages || [];

      // Get user location and nearby data if available
      if (userContext.location) {
        // Get nearby drivers
        const { data: drivers } = await this.supabase.rpc("fn_get_nearby_drivers_spatial", {
          lat: userContext.location.lat,
          lng: userContext.location.lng,
          radius: 5
        });
        context.nearbyDrivers = drivers || [];

        // Get nearby passenger requests
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

      // Get user's payment history
      const { data: payments } = await this.supabase
        .from('payments')
        .select('*')
        .eq('user_phone', userContext.phone)
        .order('created_at', { ascending: false })
        .limit(3);
      context.paymentHistory = payments || [];

      // Check if user is a driver
      const { data: driverProfile } = await this.supabase
        .from('drivers')
        .select('*')
        .or(`phone.eq.${userContext.phone},user_id.eq.${userContext.phone}`)
        .maybeSingle();
      context.isDriver = !!driverProfile;
      context.driverProfile = driverProfile;

      // Get available products for marketplace
      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .gt('stock_qty', 0)
        .limit(20);
      context.availableProducts = products || [];

      return context;
    } catch (error) {
      console.error('Error building context:', error);
      return context;
    }
  }

  private async processWithAI(message: string, context: any): Promise<any> {
    const systemPrompt = this.buildIntelligentPrompt(context);
    
    try {
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ];

      const completion = await createChatCompletion(messages, {
        model: 'gpt-4.1-2025-04-14',
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const content = completion.choices[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        return {
          response: content,
          actions: [],
          confidence: 0.8
        };
      }
    } catch (error) {
      console.error('❌ OpenAI SDK processing error:', error);
      throw error;
    }
  }

  private buildIntelligentPrompt(context: any): string {
    const user = context.user;
    
    return `You are the easyMO Intelligent Core Engine. Process user messages using real-time data and provide intelligent, context-aware responses.

# USER PROFILE
- Phone: ${user.phone}
- Type: ${user.userType}
- Language: ${user.preferredLanguage}
- Location: ${user.location ? `${user.location.lat}, ${user.location.lng}` : 'Not shared'}
- Conversation Count: ${user.conversationCount}

# REAL-TIME DATA CONTEXT
- Nearby Drivers: ${context.nearbyDrivers?.length || 0} within 5km
- Nearby Passengers: ${context.nearbyPassengers?.length || 0} requests within 10km
- Nearby Businesses: ${context.nearbyBusinesses?.length || 0} active businesses
- Available Products: ${context.availableProducts?.length || 0} in stock
- Payment History: ${context.paymentHistory?.length || 0} recent transactions
- Is Registered Driver: ${context.isDriver ? 'Yes' : 'No'}

# RECENT CONVERSATION HISTORY
${context.recentHistory?.map(msg => `- ${msg.sender}: ${msg.message_text}`).join('\n') || 'No recent history'}

# AVAILABLE DATA DETAILS

## Nearby Drivers (${context.nearbyDrivers?.length || 0} found)
${context.nearbyDrivers?.length > 0 ? 
  context.nearbyDrivers.map(d => `- ${d.driver_type?.toUpperCase() || 'MOTO'} Driver: ${d.driver_phone} (${d.distance_km?.toFixed(1) || '?'}km away, Status: ${d.status || 'available'})`).join('\n')
  : '- No drivers currently available in the area'}

## Passenger Requests (${context.nearbyPassengers?.length || 0} found)
${context.nearbyPassengers?.length > 0 ?
  context.nearbyPassengers.map(p => `- Route: ${p.from_text} → ${p.to_text} | Seats: ${p.seats_needed || 1} | Budget: ${p.max_price_rwf || 'negotiable'} RWF | Contact: ${p.passenger_phone}`).join('\n')
  : '- No active passenger requests in the area'}

## Nearby Businesses (${context.nearbyBusinesses?.length || 0} found)
${context.nearbyBusinesses?.length > 0 ?
  context.nearbyBusinesses.map(b => `- ${b.name} (${b.category || 'General'}) | Contact: ${b.phone_number || 'No phone'} | Address: ${b.address || 'No address'}`).join('\n')
  : '- No businesses found in database'}

## Available Products (${context.availableProducts?.length || 0} found)
${context.availableProducts?.length > 0 ?
  context.availableProducts.slice(0, 10).map(p => `- ${p.name}: ${p.price_rwf} RWF | Stock: ${p.stock_qty} | Vendor: ${p.vendor_phone || 'Unknown'}`).join('\n')
  : '- No products currently available'}

## Payment History (${context.paymentHistory?.length || 0} recent)
${context.paymentHistory?.length > 0 ?
  context.paymentHistory.map(p => `- ${p.amount} RWF (${p.status}) - ${new Date(p.created_at).toLocaleDateString()}`).join('\n')
  : '- No recent payment history'}

# CORE INSTRUCTIONS
1. **Use Real Data Only**: Base all responses on the actual data provided above. Never invent information.
2. **Be Specific**: Provide exact phone numbers, distances, prices, and stock quantities when available.
3. **Contextual Awareness**: Consider user's history, location, and type when responding.
4. **Action-Oriented**: Suggest specific next steps the user can take.
5. **Transparent**: If data is missing or unavailable, clearly state this.

# PERSONA GUIDELINES
- Warm, respectful, Rwanda-first cultural awareness
- Action-oriented and efficient (prefers doing over explaining)
- Proactive helper: anticipates next step, offers shortcuts
- Transparent: admits uncertainty, never bluffs facts
- Privacy-minded: treats phone numbers and personal data carefully

# RESPONSE FORMAT
Respond with JSON in this exact format:
{
  "response": "Your message to the user using real data",
  "actions": ["action1", "action2"],
  "actionData": {
    "action1": {...data for action1},
    "action2": {...data for action2}
  },
  "confidence": 0.0-1.0,
  "requiresLocation": false,
  "suggestedFollowUp": "optional follow-up suggestion"
}

# AVAILABLE ACTIONS
- "create_payment": For payment QR generation
- "create_passenger_intent": For ride requests
- "update_driver_status": For driver online/offline
- "send_whatsapp_template": For structured messages
- "contact_referral": For connecting users to services
- "location_request": When location is needed

# EXAMPLES OF GOOD RESPONSES
- For "nearby drivers": List actual drivers with real phone numbers and distances
- For payment amounts: Create payment QR with exact amount
- For ride requests: Create passenger intent if destination is clear
- For business searches: List actual businesses with real contact info

Remember: Always use the REAL DATA provided. Never make up phone numbers, distances, prices, or availability information.`;
  }

  private async executeActions(aiResponse: any, userContext: UserContext, context: any): Promise<string> {
    let response = aiResponse.response || this.getFallbackResponse(userContext);
    
    if (aiResponse.actions && aiResponse.actions.length > 0) {
      for (const action of aiResponse.actions) {
        try {
          const actionData = aiResponse.actionData?.[action];
          
          switch (action) {
            case 'create_payment':
              const paymentResult = await this.createPayment(actionData, userContext);
              if (paymentResult) {
                response = paymentResult;
              }
              break;
            
            case 'create_passenger_intent':
              const rideResult = await this.createPassengerIntent(actionData, userContext);
              if (rideResult) {
                response = rideResult;
              }
              break;
            
            case 'update_driver_status':
              const driverResult = await this.updateDriverStatus(actionData, userContext, context);
              if (driverResult) {
                response = driverResult;
              }
              break;
            
            case 'location_request':
              response += "\n\n📍 Please share your location to find services near you.";
              break;
          }
        } catch (error) {
          console.error(`❌ Error executing action ${action}:`, error);
        }
      }
    }

    return response;
  }

  private async createPayment(actionData: any, userContext: UserContext): Promise<string | null> {
    try {
      const { data: result, error } = await this.supabase.functions.invoke('create-momo-payment-link', {
        body: {
          amount: actionData.amount,
          currency: 'RWF',
          phoneNumber: userContext.phone,
          description: actionData.description || `Payment request for ${actionData.amount} RWF`,
          userPhone: userContext.phone
        }
      });

      if (error) throw error;

      if (result?.success) {
        return `💰 *PAYMENT CREATED*\n\n💵 Amount: ${actionData.amount?.toLocaleString()} RWF\n📱 USSD: ${result.ussdCode}\n📄 QR Code: ${result.qrCodeUrl}\n🔗 Link: ${result.paymentLink}\n\n✅ Expires: ${new Date(result.expiresAt).toLocaleTimeString()}\n🆔 ID: ${result.paymentId}`;
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      return "❌ *Payment Error*\n\nCouldn't generate payment. Please try again.";
    }
    return null;
  }

  private async createPassengerIntent(actionData: any, userContext: UserContext): Promise<string | null> {
    try {
      const { data: intent, error } = await this.supabase
        .from('passenger_intents_spatial')
        .insert({
          passenger_phone: userContext.phone,
          from_text: actionData.pickup || 'Current location',
          to_text: actionData.destination,
          seats_needed: actionData.seats || 1,
          max_price_rwf: actionData.maxPrice || null,
          pickup: userContext.location ? `SRID=4326;POINT(${userContext.location.lng} ${userContext.location.lat})` : null,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      return `🚗 *RIDE REQUEST CREATED*\n\n📍 From: ${actionData.pickup || 'Your location'}\n🎯 To: ${actionData.destination}\n👥 Seats: ${actionData.seats || 1}\n\n✅ Request ID: ${intent.id}\n⏱️ Drivers will be notified`;
    } catch (error) {
      console.error('Ride creation error:', error);
      return "❌ *Ride Error*\n\nCouldn't create ride request. Please try again.";
    }
  }

  private async updateDriverStatus(actionData: any, userContext: UserContext, context: any): Promise<string | null> {
    if (!context.isDriver) {
      return "👤 You need to register as a driver first. Reply 'register driver' to get started.";
    }

    if (!userContext.location && actionData.status === 'online') {
      return "📍 To go online, please share your current location first.";
    }

    try {
      if (actionData.status === 'online') {
        await this.supabase
          .from('driver_sessions')
          .upsert({
            driver_id: context.driverProfile.id,
            status: 'online',
            last_location: `SRID=4326;POINT(${userContext.location!.lng} ${userContext.location!.lat})`,
            session_start: new Date().toISOString()
          }, { onConflict: 'driver_id' });

        await this.supabase
          .from('drivers')
          .update({ 
            status: 'active',
            location_gps: `SRID=4326;POINT(${userContext.location!.lng} ${userContext.location!.lat})`
          })
          .eq('id', context.driverProfile.id);

        return `🟢 *YOU'RE NOW ONLINE!*\n\n✅ Status: Active\n📍 Location: Updated\n🚗 Vehicle: ${context.driverProfile.driver_type?.toUpperCase() || 'MOTO'}\n\n👥 Passengers can now find you\n🔔 Keep WhatsApp open for requests!`;
      } else {
        await this.supabase
          .from('drivers')
          .update({ status: 'offline' })
          .eq('id', context.driverProfile.id);

        return `🔴 *YOU'RE NOW OFFLINE*\n\n✅ Status: Offline\n👋 You won't receive new ride requests\n\nType 'go online' when ready to drive again.`;
      }
    } catch (error) {
      console.error('Driver status error:', error);
      return "❌ Error updating driver status. Please try again.";
    }
  }

  private getFallbackResponse(userContext: UserContext): string {
    if (userContext.userType === 'new') {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *Try these*:\n💰 '5000' → Payment QR\n🛵 'nearby drivers' → Find transport\n🛒 'find pharmacy' → Locate services\n\n✨ Just tell me what you need!`;
    }
    
    return "I'd love to help! 😊\n\n🎯 *Popular requests*:\n💰 Payment QR: Send amount\n🛵 Transport: 'nearby drivers'\n🛒 Shopping: 'find products'\n📦 Delivery: 'send package'\n\n💬 What can I do for you?";
  }
}

class UserContextManager {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getUserContext(phoneNumber: string): Promise<UserContext> {
    try {
      // Get user profile
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      // Get user location
      const { data: location } = await this.supabase
        .from('user_locations')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      // Get user state
      const { data: state } = await this.supabase
        .from('user_conversation_state')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      // Get conversation history
      const { data: conversations } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(10);

      const conversationCount = conversations?.length || 0;
      let userType: 'new' | 'returning' | 'power_user' = 'new';
      if (conversationCount > 20) userType = 'power_user';
      else if (conversationCount > 0) userType = 'returning';

      return {
        phone: phoneNumber,
        name: profile?.name,
        location: location ? {
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
          address: location.address
        } : undefined,
        preferredLanguage: profile?.language || 'en',
        lastInteraction: conversations?.[0]?.created_at,
        conversationCount,
        userType,
        profile,
        state
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        phone: phoneNumber,
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
    const { 
      from, 
      text, 
      message_id, 
      contact_name, 
      timestamp, 
      message_type = 'text', 
      interactive_data, 
      button_data, 
      location_data, 
      media_data 
    } = await req.json();
    
    console.log(`🧠 Intelligent Core Engine processing: ${from} - ${text} (${message_type})`);

      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const contextManager = new UserContextManager(supabase);
    const intelligentEngine = new IntelligentCoreEngine(supabase, openaiApiKey);

    // Get comprehensive user context
    const userContext = await contextManager.getUserContext(from);
    
    // Process with intelligent engine
    const response = await intelligentEngine.processMessage(
      from, 
      text || `${message_type}_received`, 
      message_type, 
      userContext,
      { interactive_data, button_data, location_data, media_data }
    );

    // Log conversation
    await supabase.from('conversation_messages').insert({
      phone_number: from,
      sender: 'user',
      message_text: text || `${message_type}_received`,
      message_type: message_type,
      metadata: { contact_name, message_id, timestamp }
    });

    await supabase.from('conversation_messages').insert({
      phone_number: from,
      sender: 'assistant',
      message_text: response,
      message_type: 'text',
      metadata: { agent: 'intelligent-core-engine', timestamp: new Date().toISOString() }
    });

    console.log(`✅ Intelligent response generated for ${from}`);

    return new Response(JSON.stringify({
      success: true,
      response,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Intelligent Core Engine error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      response: "I'm having technical difficulties. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});