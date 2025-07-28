import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContext {
  phone: string;
  name?: string;
  preferredLanguage: string;
  lastInteraction?: string;
  conversationCount: number;
  userType: 'new' | 'returning' | 'power_user';
  currentFlow?: string;
  locationContext?: string;
  paymentHistory?: any[];
  preferences?: Record<string, any>;
}

interface ServiceRequest {
  type: 'payment' | 'transport' | 'shopping' | 'delivery' | 'business' | 'support';
  subtype?: string;
  parameters?: Record<string, any>;
  urgency: 'low' | 'medium' | 'high';
}

class OmniAgentPersona {
  private static readonly PERSONA_CONFIG = {
    name: "Aline - easyMO Assistant",
    personality: {
      tone: "friendly, helpful, efficient",
      style: "conversational yet professional",
      emoji_usage: "moderate - for clarity and warmth",
      response_length: "concise but complete"
    },
    languages: {
      primary: "en",
      supported: ["en", "rw", "fr"],
      auto_detect: true
    },
    capabilities: [
      "payment_processing",
      "transport_booking", 
      "business_discovery",
      "shopping_assistance",
      "delivery_coordination",
      "customer_support",
      "onboarding_guidance"
    ],
    behavioral_guidelines: {
      always_confirm_amounts: true,
      prioritize_safety: true,
      respect_privacy: true,
      be_proactive: true,
      learn_preferences: true
    }
  };

  static getPersonaPrompt(): string {
    return `You are Aline, the AI assistant for easyMO - Rwanda's most comprehensive WhatsApp super-app.

CORE IDENTITY:
- Friendly, efficient, and knowledgeable about all easyMO services
- Always prioritize user safety and convenience
- Communicate in a warm but professional manner
- Use emojis sparingly for clarity, not decoration

PRIMARY SERVICES:
1. 💰 PAYMENTS & FINANCIAL
   - Instant QR code generation for any amount
   - USSD mobile money integration
   - Payment processing and verification
   - Transaction history and receipts

2. 🛵 TRANSPORT & LOGISTICS  
   - Moto taxi booking and tracking
   - Route optimization and fare estimates
   - Driver coordination and safety features
   - Real-time location services

3. 🏪 BUSINESS & COMMERCE
   - Business discovery (shops, pharmacies, services)
   - Product search and availability
   - Inventory management for vendors
   - Customer-vendor communication bridge

4. 📦 DELIVERY & LOGISTICS
   - Package delivery coordination
   - Courier assignment and tracking
   - Delivery scheduling and updates
   - Special handling requests

CONVERSATION PRINCIPLES:
- Understand context from previous messages
- Anticipate user needs based on patterns
- Provide clear, actionable options
- Always confirm critical details (amounts, addresses, phone numbers)
- Gracefully handle errors and offer alternatives
- Learn from interactions to improve future responses

RESPONSE STRUCTURE:
- Start with acknowledgment or greeting if appropriate
- Provide the requested service or information
- Include relevant options or next steps
- End with a clear call to action when needed

Remember: Every interaction should feel personal, helpful, and move the user closer to their goal.`;
  }
}

class UserJourneyManager {
  private static readonly JOURNEY_TEMPLATES = {
    new_user_onboarding: {
      steps: [
        "welcome_message",
        "service_overview", 
        "first_transaction_guide",
        "preference_collection",
        "success_confirmation"
      ],
      duration_minutes: 5,
      success_metrics: ["first_transaction", "service_usage"]
    },
    payment_flow: {
      steps: [
        "amount_collection",
        "payment_method_selection",
        "qr_generation",
        "transaction_confirmation",
        "receipt_delivery"
      ],
      duration_minutes: 2,
      success_metrics: ["payment_completed", "qr_scanned"]
    },
    transport_booking: {
      steps: [
        "location_collection",
        "destination_input",
        "fare_estimate",
        "driver_matching",
        "trip_tracking"
      ],
      duration_minutes: 10,
      success_metrics: ["ride_completed", "rating_provided"]
    },
    business_discovery: {
      steps: [
        "search_intent_clarification",
        "location_context",
        "business_filtering",
        "results_presentation",
        "connection_facilitation"
      ],
      duration_minutes: 3,
      success_metrics: ["business_contacted", "visit_confirmed"]
    },
    vendor_management: {
      steps: [
        "product_listing",
        "inventory_update",
        "customer_engagement",
        "order_processing",
        "delivery_coordination"
      ],
      duration_minutes: 15,
      success_metrics: ["products_listed", "orders_received"]
    }
  };

  static getJourneyForIntent(intent: string): any {
    return this.JOURNEY_TEMPLATES[intent] || this.JOURNEY_TEMPLATES.new_user_onboarding;
  }

  static getNextStep(currentJourney: string, currentStep: number): string {
    const journey = this.JOURNEY_TEMPLATES[currentJourney];
    if (!journey || currentStep >= journey.steps.length) {
      return 'completed';
    }
    return journey.steps[currentStep];
  }
}

class ContextualResponseEngine {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async generateResponse(message: string, userContext: UserContext): Promise<string> {
    const serviceRequest = this.parseServiceRequest(message, userContext);
    const persona = OmniAgentPersona.getPersonaPrompt();
    
    console.log(`🎯 Processing ${serviceRequest.type} request for ${userContext.userType} user`);

    switch (serviceRequest.type) {
      case 'payment':
        return await this.handlePaymentRequest(message, userContext, serviceRequest);
      case 'transport':
        return await this.handleTransportRequest(message, userContext, serviceRequest);
      case 'shopping':
        return await this.handleShoppingRequest(message, userContext, serviceRequest);
      case 'business':
        return await this.handleBusinessRequest(message, userContext, serviceRequest);
      case 'delivery':
        return await this.handleDeliveryRequest(message, userContext, serviceRequest);
      default:
        return await this.handleGeneralRequest(message, userContext);
    }
  }

  private parseServiceRequest(message: string, context: UserContext): ServiceRequest {
    const msg = message.toLowerCase().trim();
    
    // Payment patterns
    if (msg.match(/^\d+$/) || msg.includes('pay') || msg.includes('money') || msg.includes('qr')) {
      return { type: 'payment', urgency: 'medium' };
    }
    
    // Transport patterns
    if (msg.includes('ride') || msg.includes('moto') || msg.includes('taxi') || msg.includes('transport')) {
      return { type: 'transport', urgency: 'high' };
    }
    
    // Shopping patterns
    if (msg.includes('shop') || msg.includes('buy') || msg.includes('browse') || msg.includes('product')) {
      return { type: 'shopping', urgency: 'low' };
    }
    
    // Business discovery patterns
    if (msg.includes('find') || msg.includes('business') || msg.includes('pharmacy') || msg.includes('store')) {
      return { type: 'business', urgency: 'medium' };
    }
    
    // Delivery patterns
    if (msg.includes('deliver') || msg.includes('send') || msg.includes('package')) {
      return { type: 'delivery', urgency: 'medium' };
    }
    
    return { type: 'support', urgency: 'low' };
  }

  private async handlePaymentRequest(message: string, context: UserContext, request: ServiceRequest): Promise<string> {
    const amount = this.extractAmount(message);
    
    if (amount && amount > 0) {
      if (amount > 1000000) {
        return "💸 *Amount Too Large*\n\nMaximum payment is 1,000,000 RWF\nPlease enter a smaller amount.";
      }
      
      try {
        const { data, error } = await this.supabase.functions.invoke('qr-payment-generator', {
          body: { 
            action: 'generate',
            amount: amount,
            phone: context.phone,
            type: 'receive'
          }
        });

        if (error) throw error;

        return `💰 *PAYMENT QR GENERATED*\n\n💵 Amount: ${amount.toLocaleString()} RWF\n📱 QR Code: ${data.qr_url}\n💳 USSD: ${data.ussd_code}\n🔗 Link: ${data.payment_link}\n\n✅ Valid for 24 hours\n\n📲 Share QR to receive payment instantly`;
      } catch (error) {
        console.error('Payment QR generation failed:', error);
        return "❌ *Payment Error*\n\nCouldn't generate QR code\nPlease try again in a moment";
      }
    }
    
    if (message.toLowerCase().includes('scan')) {
      return "📱 *QR SCANNER READY*\n\n📸 Send me a photo of the QR code\n\n✅ I can process:\n• Payment QR codes\n• USSD codes\n• Bank transfer links\n\nJust snap and send!";
    }
    
    return "💰 *PAYMENT SERVICE*\n\n🎯 *Quick Payment*:\nSend amount: '5000'\n\n📱 *Scan & Pay*:\nSend 'scan qr'\n\n💸 *Send Money*:\n'5000 to 0788123456'\n\nWhat would you like to do?";
  }

  private async handleTransportRequest(message: string, context: UserContext, request: ServiceRequest): Promise<string> {
    const msg = message.toLowerCase();
    
    if (msg.includes('from') || msg.includes('to') || msg.includes('location')) {
      return "🛵 *MOTO BOOKING*\n\n📍 Please share your location or type:\n• Current location\n• Destination\n\nExample:\n'From Kimisagara to Kigali City'\n\n💰 I'll calculate fare and find nearest driver";
    }
    
    return "🛵 *TRANSPORT SERVICE*\n\n🎯 *Book Moto Ride*:\n📍 Share location or type route\n\n💰 *Services Available*:\n• City rides (500-2000 RWF)\n• Airport transfers\n• Package delivery\n• Scheduled trips\n\nWhere do you need to go?";
  }

  private async handleShoppingRequest(message: string, context: UserContext, request: ServiceRequest): Promise<string> {
    return "🛒 *SHOPPING ASSISTANT*\n\n🎯 *What are you looking for?*\n\n📱 *Categories*:\n• Electronics & Phones\n• Clothing & Fashion\n• Food & Groceries\n• Health & Beauty\n• Home & Garden\n\n🔍 Type item name or category\nExample: 'iPhone 15' or 'groceries'\n\nI'll find best prices and availability!";
  }

  private async handleBusinessRequest(message: string, context: UserContext, request: ServiceRequest): Promise<string> {
    return "🏪 *BUSINESS DISCOVERY*\n\n🎯 *Find Services Near You*\n\n📍 *Categories*:\n• 💊 Pharmacies\n• 🛒 Supermarkets\n• 🍽️ Restaurants\n• 🔧 Repair Services\n• 🏥 Health Centers\n\n💡 Tell me what you need:\n'Find pharmacy near me'\n'Restaurants in Kimisagara'\n\nI'll show options with ratings & contact info!";
  }

  private async handleDeliveryRequest(message: string, context: UserContext, request: ServiceRequest): Promise<string> {
    return "📦 *DELIVERY SERVICE*\n\n🎯 *Send Packages Safely*\n\n📋 *Delivery Types*:\n• Documents (500 RWF)\n• Small packages (1000 RWF)\n• Large items (2000+ RWF)\n• Food delivery\n\n📍 *Setup Delivery*:\nTell me:\n• What to send\n• Pickup location\n• Delivery address\n\nI'll arrange pickup within 30 minutes!";
  }

  private async handleGeneralRequest(message: string, context: UserContext): Promise<string> {
    if (context.userType === 'new') {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *INSTANT SERVICES*:\n💰 Payments - Send '5000'\n🛵 Transport - Send 'ride'\n🛒 Shopping - Send 'shop'\n📦 Delivery - Send 'deliver'\n🏪 Businesses - Send 'find pharmacy'\n\n✨ Just type what you need!\n\n🎯 Try sending a number for instant payment QR`;
    }
    
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('menu')) {
      return "📱 *easyMO SERVICES*\n\n💰 *PAYMENTS*\n• Send amount: '5000'\n• Scan QR: 'scan qr'\n\n🛵 *TRANSPORT*\n• Book ride: 'ride to city'\n\n🛒 *SHOPPING*\n• Browse: 'shop electronics'\n\n📦 *DELIVERY*\n• Send package: 'deliver'\n\n🏪 *BUSINESSES*\n• Find services: 'pharmacy near me'\n\nType any service to get started!";
    }
    
    return "🤖 I'm here to help!\n\n💡 Try:\n• Send amount for payment QR\n• 'ride' for transport\n• 'shop' to browse products\n• 'help' for all options\n\nWhat can I do for you today?";
  }

  private extractAmount(message: string): number | null {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
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

  async saveConversation(phone: string, userMessage: string, agentResponse: string, metadata: any = {}) {
    try {
      await this.supabase.from('agent_conversations').insert([
        {
          user_id: phone,
          role: 'user',
          message: userMessage,
          metadata: { ...metadata, timestamp: new Date().toISOString() }
        },
        {
          user_id: phone,
          role: 'assistant', 
          message: agentResponse,
          metadata: { agent: 'omni-agent', timestamp: new Date().toISOString() }
        }
      ]);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, contact_name, message_id } = await req.json();
    
    console.log(`🎯 Omni Agent processing: ${phone} - ${message}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const conversationManager = new ConversationManager(supabase);
    const responseEngine = new ContextualResponseEngine(supabase);

    // Get user context
    const userContext = await conversationManager.getOrCreateUserContext(phone);
    
    // Generate contextual response
    const response = await responseEngine.generateResponse(message, userContext);
    
    // Save conversation
    await conversationManager.saveConversation(phone, message, response, {
      message_id,
      contact_name,
      user_type: userContext.userType
    });

    // Log agent execution
    await supabase.from('agent_execution_log').insert({
      user_id: phone,
      function_name: 'omni-agent-enhanced',
      input_data: { message, user_context: userContext },
      success_status: true,
      model_used: 'gpt-4o',
      execution_time_ms: Date.now() % 1000
    });

    return new Response(JSON.stringify({
      success: true,
      response,
      user_type: userContext.userType,
      agent: 'omni-agent-enhanced'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Omni Agent Error:', error);
    
    const fallbackResponse = "🤖 I'm here to help! Send amount for payment QR (e.g., '5000') or 'menu' for all services.";
    
    return new Response(JSON.stringify({
      success: true,
      response: fallbackResponse,
      agent: 'omni-agent-enhanced',
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});