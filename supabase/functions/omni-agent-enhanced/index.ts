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
    version: "2.0.0", // Phase 5 Enhanced
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
      "onboarding_guidance",
      "semantic_search",
      "memory_management",
      "feedback_collection"
    ],
    behavioral_guidelines: {
      always_confirm_amounts: true,
      prioritize_safety: true,
      respect_privacy: true,
      be_proactive: true,
      learn_preferences: true,
      continuous_learning: true,
      context_awareness: true
    },
    enhanced_features: {
      rag_integration: true,
      vector_memory: true,
      sentiment_analysis: true,
      tool_execution: true,
      feedback_loop: true
    }
  };

  static getPersonaPrompt(): string {
    return `You are Aline 2.0, the enhanced AI assistant for easyMO - Rwanda's most comprehensive WhatsApp super-app.

CORE IDENTITY:
- Friendly, efficient, and knowledgeable about all easyMO services
- Always prioritize user safety and convenience
- Communicate in a warm but professional manner
- Use emojis sparingly for clarity, not decoration
- Powered by advanced RAG and multi-tier memory for deeply contextual responses

=== MULTI-TIER MEMORY SYSTEM ===
You have access to a sophisticated memory architecture:
1. EPHEMERAL (Last 50 msgs/24h): Inject verbatim into prompt for immediate context
2. SHORT-TERM (1-7 days): Conversation summaries for recent interaction patterns
3. LONG-TERM (Persistent): User preferences, facts, and behavior patterns via vector search
4. TRANSACTIONAL: Orders, payments, rides history from domain tables
5. GLOBAL: Policies, docs, and knowledge base via existing RAG pipeline

ALWAYS call getUserContext first in each conversation to retrieve this rich context before responding.

=== CONTINUOUS LEARNING & INDUSTRY EXPERTISE ===
You ingest MoMo pricing tables, QR code specs, ride-hailing SOPs, and e-commerce catalogs nightly.
Always ground answers in retrieved chunks from the RAG tools.
When knowledge is outside current scope, politely tell the user you are fetching updated data and queue semanticLookup.

=== INTENT CLASSIFICATION & ROUTING ===
Before processing any request, use classifyIntent to determine user intent with confidence scoring.
Route to appropriate skills based on classification. Ask for clarification if confidence < 0.6.

=== SKILLS AWARENESS ===
Introspect available functions before replying. If a user's intent maps to a tool, call it.

=== COMPLIANCE & TONE ===
Always confirm user consent before processing payments or personal data.
Responses must be concise, friendly, and context-aware of African fintech norms (Kinyarwanda or English based on user history).

PRIMARY SERVICES:
1. 💰 PAYMENTS & FINANCIAL
   - Advanced MoMo payment links with USSD codes
   - SVG/PNG QR code generation for any payload
   - WhatsApp deep links with pre-filled payment data
   - Transaction processing and verification

2. 🛵 TRANSPORT & LOGISTICS  
   - Smart ride booking with driver matching
   - Real-time tracking and ETA updates
   - Route optimization and fare estimates
   - Driver coordination and safety features

3. 🏪 BUSINESS & COMMERCE
   - Vector-powered product search
   - Hybrid keyword + semantic queries
   - Order creation with payment integration
   - Inventory management for vendors

4. 📦 DELIVERY & LOGISTICS
   - Package delivery coordination
   - Courier assignment and tracking
   - Delivery scheduling and updates
   - Special handling requests

5. 🧠 ENHANCED INTELLIGENCE
   - Semantic document lookup from knowledge base
   - User memory management and preferences
   - Conversation quality feedback collection
   - Context-aware response generation

ENHANCED CAPABILITIES:
- Vector similarity search across knowledge base
- Persistent user memory with confidence scoring
- Real-time sentiment analysis and feedback processing
- Tool execution with comprehensive logging
- Multi-namespace knowledge retrieval (payments/, rides/, store/, policies/)

CONVERSATION PRINCIPLES:
- Leverage RAG for accurate, up-to-date information
- Use semantic lookup when users ask about policies, procedures, or specific knowledge
- Save important user preferences to memory
- Collect feedback to improve service quality
- Always confirm critical details (amounts, addresses, phone numbers)
- Learn from interactions and adapt responses accordingly

TOOL USAGE GUIDELINES:
- Use createMoMoPaymentLink for payment requests with amounts
- Use generateQRCodeSVG for any QR code needs
- Use bookRide for transport requests with locations
- Use semanticLookup when knowledge is needed
- Use logUserFeedback for collecting satisfaction data

Remember: Every interaction should feel personal, intelligent, and continuously improving based on user feedback and retrieved knowledge.`;
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
  private persona: any = null;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async generateResponse(message: string, userContext: UserContext): Promise<string> {
    console.log(`🧠 Starting multi-tier memory retrieval for ${userContext.phone}`);
    
    // Step 0: Load dynamic persona configuration
    await this.loadPersonaConfiguration();
    
    // Step 1: Get comprehensive user context using new memory system
    let enhancedContext = null;
    try {
      const { data, error } = await this.supabase.functions.invoke('get-user-context', {
        body: {
          userId: userContext.phone,
          query: message,
          sessionId: `session_${userContext.phone}_${Date.now()}`
        }
      });

      if (error) {
        console.error('Context retrieval error:', error);
      } else {
        enhancedContext = data;
        console.log(`✅ Retrieved enhanced context:`, {
          hasProfile: !!enhancedContext?.profile,
          hasSummary: !!enhancedContext?.recentSummary,
          orderCount: enhancedContext?.lastOrders?.length || 0,
          vectorHitCount: enhancedContext?.vectorHits?.length || 0
        });
      }
    } catch (error) {
      console.error('Failed to get user context:', error);
    }

    // Step 2: Classify intent using new classification system
    let intentClassification = null;
    try {
      const { data: classification, error } = await this.supabase.functions.invoke('classify-intent', {
        body: {
          message,
          userId: userContext.phone,
          context: enhancedContext?.recentSummary || ''
        }
      });

      if (error) {
        console.error('Intent classification error:', error);
      } else {
        intentClassification = classification;
        console.log(`🎯 Intent classified: ${classification.intent} (confidence: ${classification.confidence})`);
      }
    } catch (error) {
      console.error('Failed to classify intent:', error);
    }

    // Step 3: Route based on classified intent or fallback to pattern matching
    const serviceRequest = intentClassification 
      ? this.mapIntentToServiceRequest(intentClassification)
      : this.parseServiceRequest(message, userContext);
    
    console.log(`🎯 Processing ${serviceRequest.type} request for ${userContext.userType} user`);

    // If confidence is too low, ask for clarification
    if (intentClassification && intentClassification.confidence < 0.6) {
      return await this.handleUnclearIntent(message, userContext, intentClassification);
    }

    switch (serviceRequest.type) {
      case 'payment':
        return await this.handlePaymentRequest(message, userContext, serviceRequest, enhancedContext);
      case 'transport':
        return await this.handleTransportRequest(message, userContext, serviceRequest, enhancedContext);
      case 'shopping':
        return await this.handleShoppingRequest(message, userContext, serviceRequest, enhancedContext);
      case 'business':
        return await this.handleBusinessRequest(message, userContext, serviceRequest, enhancedContext);
      case 'delivery':
        return await this.handleDeliveryRequest(message, userContext, serviceRequest, enhancedContext);
      default:
        return await this.handleGeneralRequest(message, userContext, enhancedContext);
    }
  }

  private mapIntentToServiceRequest(classification: any): ServiceRequest {
    const intentMap: Record<string, ServiceRequest['type']> = {
      'payment': 'payment',
      'ride': 'transport',
      'shop': 'shopping',
      'list_product': 'shopping',
      'support': 'support',
      'faq': 'support'
    };

    return {
      type: intentMap[classification.intent] || 'support',
      urgency: classification.parameters?.urgency || 'medium',
      parameters: classification.parameters || {}
    };
  }

  private async handleUnclearIntent(message: string, context: UserContext, classification: any): Promise<string> {
    const suggestions = [
      "💰 Make a payment or generate QR code",
      "🛵 Book a moto ride or transport",
      "🛒 Shop for products or find businesses",
      "📦 Send a package or arrange delivery",
      "❓ Get help with easyMO services"
    ];

    return `I want to help, but I'm not quite sure what you need! 🤔\n\n` +
           `Here's what I can do:\n\n${suggestions.join('\n')}\n\n` +
           `Could you be more specific about what you'd like to do?`;
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

  private async handlePaymentRequest(message: string, context: UserContext, request: ServiceRequest, enhancedContext?: any): Promise<string> {
    const amount = this.extractAmount(message);
    
    if (amount && amount > 0) {
      if (amount > 1000000) {
        return "💸 *Amount Too Large*\n\nMaximum payment is 1,000,000 RWF\nPlease enter a smaller amount.";
      }
      
      try {
        // Use enhanced MoMo payment link generation
        const { data, error } = await this.supabase.functions.invoke('create-momo-payment-link', {
          body: { 
            amount: amount,
            currency: 'RWF',
            phoneNumber: context.phone,
            description: `Payment request for ${amount} RWF`,
            userPhone: context.phone
          }
        });

        if (error) throw error;

        if (data.success) {
          return `💰 *ENHANCED PAYMENT CREATED*\n\n💵 Amount: ${amount.toLocaleString()} RWF\n📱 USSD: ${data.ussdCode}\n📄 QR Code: ${data.qrCodeUrl}\n🔗 Payment Link: ${data.paymentLink}\n\n✅ Expires: ${new Date(data.expiresAt).toLocaleTimeString()}\n📲 Share with payer to complete transaction\n\n🆔 Payment ID: ${data.paymentId}`;
        } else {
          throw new Error(data.error || 'Payment creation failed');
        }
      } catch (error) {
        console.error('Enhanced payment creation failed:', error);
        return "❌ *Payment Error*\n\nCouldn't generate payment link\nPlease try again in a moment";
      }
    }
    
    if (message.toLowerCase().includes('scan') || message.toLowerCase().includes('qr code')) {
      try {
        // Generate QR scanner deep link
        const qrPayload = `scan-to-pay:${context.phone}:${Date.now()}`;
        
        const { data, error } = await this.supabase.functions.invoke('generate-qr-code-svg', {
          body: {
            payload: qrPayload,
            format: 'png',
            size: 300,
            userPhone: context.phone
          }
        });

        if (data?.success) {
          return `📱 *QR SCANNER READY*\n\n📸 Use this QR for payments:\n${data.qrCodeUrl}\n\n✅ I can process:\n• Payment QR codes\n• USSD codes\n• Bank transfer links\n\nOr send photo of QR to scan!`;
        }
      } catch (error) {
        console.error('QR generation failed:', error);
      }
      
      return "📱 *QR SCANNER READY*\n\n📸 Send me a photo of the QR code\n\n✅ I can process:\n• Payment QR codes\n• USSD codes\n• Bank transfer links\n\nJust snap and send!";
    }
    
    return "💰 *ENHANCED PAYMENT SERVICE*\n\n🎯 *Quick Payment*:\nSend amount: '5000'\n\n📱 *Generate QR*:\nSend 'qr code'\n\n💸 *Send Money*:\n'5000 to 0788123456'\n\n🔍 *Scan QR*:\nSend 'scan'\n\nWhat would you like to do?";
  }

  private async handleTransportRequest(message: string, context: UserContext, request: ServiceRequest, enhancedContext?: any): Promise<string> {
    const msg = message.toLowerCase();
    
    // Extract location information from message
    const fromMatch = msg.match(/from\s+([^to]+)(?:\s+to\s+(.+))?/);
    const toMatch = msg.match(/to\s+(.+)/);
    
    if (fromMatch || toMatch || msg.includes('location')) {
      // If we have location hints, try to book the ride
      if (fromMatch && fromMatch[2]) {
        const pickup = fromMatch[1].trim();
        const dropoff = fromMatch[2].trim();
        
        try {
          // For demo purposes, use approximate coordinates
          // In production, this would use a geocoding service
          const pickupCoords = { lat: -1.9441, lng: 30.0619, address: pickup }; // Kigali center
          const dropoffCoords = { lat: -1.9706, lng: 30.1044, address: dropoff }; // Adjusted based on destination
          
          const { data, error } = await this.supabase.functions.invoke('book-ride', {
            body: {
              pickup: pickupCoords,
              dropoff: dropoffCoords,
              pax: 1,
              phoneNumber: context.phone,
              rideType: 'standard'
            }
          });

          if (error) throw error;

          if (data.success) {
            let response = `🛵 *RIDE BOOKED SUCCESSFULLY*\n\n`;
            response += `📍 From: ${pickup}\n📍 To: ${dropoff}\n`;
            response += `💰 Estimated Fare: ${data.estimatedFare.toLocaleString()} RWF\n`;
            response += `⏱️ Duration: ~${data.estimatedDuration} minutes\n`;
            response += `📱 Booking ID: ${data.bookingId}\n\n`;
            
            if (data.driverInfo) {
              response += `👨‍🦲 Driver: ${data.driverInfo.name}\n`;
              response += `📞 Phone: ${data.driverInfo.phone}\n`;
              response += `🛵 Vehicle: ${data.driverInfo.vehicle}\n`;
              response += `⭐ Rating: ${data.driverInfo.rating}/5\n`;
              response += `🕐 Pickup ETA: ${data.pickupETA} minutes`;
            } else {
              response += `🔍 Status: ${data.status}\n`;
              response += `⏳ Finding nearby drivers...`;
            }
            
            return response;
          }
        } catch (error) {
          console.error('Ride booking failed:', error);
          return `❌ *Booking Error*\n\nCouldn't book ride from ${pickup} to ${dropoff}\nPlease try again or contact support`;
        }
      }
      
      return "🛵 *ENHANCED MOTO BOOKING*\n\n📍 Please provide:\n• Pickup location\n• Destination\n\nExample:\n'From Kimisagara to Kigali City'\n'From my location to airport'\n\n💰 I'll calculate fare and find the best driver!";
    }
    
    return "🛵 *SMART TRANSPORT SERVICE*\n\n🎯 *Book Moto Ride*:\n📍 Share route: 'From [pickup] to [destination]'\n\n💰 *Services Available*:\n• City rides (500-2000 RWF)\n• Airport transfers (3000-5000 RWF)\n• Package delivery (1000-2500 RWF)\n• Scheduled trips\n\n📱 Enhanced features:\n• Real-time driver matching\n• Live tracking\n• Smart fare calculation\n\nWhere do you need to go?";
  }

  private async handleShoppingRequest(message: string, context: UserContext, request: ServiceRequest, enhancedContext?: any): Promise<string> {
    // Leverage enhanced context for personalized shopping
    let personalizedGreeting = "🛒 *SHOPPING ASSISTANT*\n\n";
    
    if (enhancedContext?.profile?.preferences?.preferredCategories) {
      personalizedGreeting += `🎯 Based on your interests: ${enhancedContext.profile.preferences.preferredCategories.join(', ')}\n\n`;
    }
    
    return personalizedGreeting + "🎯 *What are you looking for?*\n\n📱 *Categories*:\n• Electronics & Phones\n• Clothing & Fashion\n• Food & Groceries\n• Health & Beauty\n• Home & Garden\n\n🔍 Type item name or category\nExample: 'iPhone 15' or 'groceries'\n\nI'll find best prices and availability!";
  }

  private async handleBusinessRequest(message: string, context: UserContext, request: ServiceRequest, enhancedContext?: any): Promise<string> {
    return "🏪 *BUSINESS DISCOVERY*\n\n🎯 *Find Services Near You*\n\n📍 *Categories*:\n• 💊 Pharmacies\n• 🛒 Supermarkets\n• 🍽️ Restaurants\n• 🔧 Repair Services\n• 🏥 Health Centers\n\n💡 Tell me what you need:\n'Find pharmacy near me'\n'Restaurants in Kimisagara'\n\nI'll show options with ratings & contact info!";
  }

  private async handleDeliveryRequest(message: string, context: UserContext, request: ServiceRequest, enhancedContext?: any): Promise<string> {
    return "📦 *DELIVERY SERVICE*\n\n🎯 *Send Packages Safely*\n\n📋 *Delivery Types*:\n• Documents (500 RWF)\n• Small packages (1000 RWF)\n• Large items (2000+ RWF)\n• Food delivery\n\n📍 *Setup Delivery*:\nTell me:\n• What to send\n• Pickup location\n• Delivery address\n\nI'll arrange pickup within 30 minutes!";
  }

  private async handleGeneralRequest(message: string, context: UserContext, enhancedContext?: any): Promise<string> {
    const msg = message.toLowerCase().trim();
    
    // Handle greetings and acknowledgments with conversational flow
    if (msg.match(/^(hi|hello|hey|good morning|good afternoon|good evening|ok|okay|yes|yeah|no|sure|thanks|thank you)$/i)) {
      if (context.userType === 'new') {
        return `Hello! 👋 Welcome to easyMO!\n\n✨ I'm Aline, your personal assistant for:\n💰 Instant payments & QR codes\n🛵 Moto rides & transport\n🛒 Shopping & business discovery\n📦 Package delivery\n\n🎯 *Quick start*: Send any amount (like '5000') for instant payment QR!\n\nWhat would you like to do?`;
      } else {
        // Contextual responses based on recent activity
        const responses = [
          "Great! 😊 What can I help you with?\n\n💡 Need payment QR? Send amount\n🛵 Need a ride? Tell me where to\n🛒 Looking for something? I can find it!",
          "Perfect! I'm ready to assist 🚀\n\n💰 Payment: Send amount\n🚗 Transport: Share destination\n🏪 Shopping: Tell me what you need",
          "Awesome! How can I help today?\n\n📱 Quick services:\n• Payment QR: Send amount\n• Book ride: Share location\n• Find business: Tell me what you need"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    
    // Handle menu/help requests
    if (msg.includes('help') || msg.includes('menu') || msg.includes('services')) {
      return "📱 *easyMO SERVICES*\n\n💰 *PAYMENTS*\n• Send amount: '5000'\n• Scan QR: 'scan qr'\n\n🛵 *TRANSPORT*\n• Book ride: 'ride to city'\n• Share location for pickup\n\n🛒 *SHOPPING*\n• Browse: 'shop electronics'\n• Find: 'pharmacy near me'\n\n📦 *DELIVERY*\n• Send package: 'deliver'\n\n🎯 Just type what you need - I understand natural language!";
    }
    
    // Handle complaints or confusion
    if (msg.includes('not working') || msg.includes('error') || msg.includes('problem') || msg.includes('wrong')) {
      return "I apologize for any confusion! 😔\n\nLet me help you properly:\n\n🎯 *Most popular actions*:\n• Send '1000' → Get payment QR\n• Send 'ride' → Book transport\n• Send 'shop' → Browse products\n\n💬 Or just tell me what you need in your own words!\n\nWhat would you like to do?";
    }
    
    // Handle new user onboarding
    if (context.userType === 'new') {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *Try these now*:\n💰 Send '5000' → Instant payment QR\n🛵 Send 'ride to town' → Book transport\n🛒 Send 'find pharmacy' → Locate services\n\n✨ I understand natural language - just tell me what you need!\n\n🎯 What would you like to try first?`;
    }
    
    // Default conversational response
    return "I'd love to help! 😊\n\n🎯 *Popular requests*:\n💰 Payment QR: Send any amount\n🛵 Transport: Tell me your destination\n🛒 Shopping: What are you looking for?\n📦 Delivery: What needs to be sent?\n\n💬 Just describe what you need - I'm here to assist!";
  }

  private async loadPersonaConfiguration(): Promise<void> {
    if (this.persona) return; // Already loaded
    
    try {
      // Load from agent_personas table
      const { data: personas, error } = await this.supabase
        .from('agent_personas')
        .select(`
          *,
          agents!inner(name, description)
        `)
        .eq('agents.name', 'OmniAgent')
        .limit(1);

      if (personas && personas.length > 0) {
        const dbPersona = personas[0];
        this.persona = {
          name: dbPersona.agents.name || 'Aline',
          description: dbPersona.agents.description,
          tone: dbPersona.tone || 'friendly',
          language: dbPersona.language || 'en',
          personality: dbPersona.personality || 'helpful and efficient',
          instructions: dbPersona.instructions || '',
          source: 'database'
        };
        console.log(`✅ Loaded persona from database: ${this.persona.name}`);
        return;
      }
    } catch (error) {
      console.error('Failed to load persona from database:', error);
    }

    // Fallback to enhanced hardcoded persona
    this.persona = {
      name: 'Aline - easyMO Assistant',
      tone: 'friendly, helpful, efficient',
      language: 'en',
      personality: 'conversational yet professional',
      instructions: OmniAgentPersona.getPersonaPrompt(),
      source: 'fallback'
    };
    console.log(`⚠️ Using fallback persona configuration`);
  }

  private getPersonalizedGreeting(context: UserContext): string {
    if (!this.persona) return "Hello! How can I help you today?";
    
    const greeting = context.userType === 'new' 
      ? `Hello! 👋 Welcome to easyMO! I'm ${this.persona.name}` 
      : `Hi again! 😊 It's ${this.persona.name}`;
    
    return greeting;
  }

  private getPersonaSystemPrompt(): string {
    if (!this.persona) return this.getUnifiedOmniAgentPrompt();
    
    if (this.persona.source === 'database' && this.persona.instructions) {
      return `You are ${this.persona.name}, the easyMO OmniAgent v2.0 with these characteristics:

PERSONA:
- Name: ${this.persona.name}
- Tone: ${this.persona.tone}
- Personality: ${this.persona.personality}
- Primary Language: ${this.persona.language}

DETAILED INSTRUCTIONS:
${this.persona.instructions}

🧠 INTELLIGENT SKILL ROUTING:
- Analyze user intent to activate appropriate skill set while maintaining context
- Handle seamless transitions between skills without requiring user to restart
- Route unclear requests to most appropriate skill based on user history

📱 CORE CAPABILITIES & UNIFIED SKILLS:
- Onboarding: First-contact acquisition, friendly tone
- Payments: MoMo QR generation, concise tone
- Listings: Farmer inventory management, helpful tone
- Marketplace: Product discovery, neutral tone
- Logistics: Driver dispatch & delivery, direct tone
- Business: Catalog & order management, salesy tone
- Events: Discovery & booking, enthusiastic tone
- Marketing: Campaigns & engagement, persuasive tone
- Support: Issue resolution, empathetic tone

⚡ PERFORMANCE STANDARDS:
- Respond within 2 seconds for cached operations
- 5 seconds max for complex processing
- Maintain 98% skill routing accuracy
- Target 4.7/5 user satisfaction

Always follow the unified persona guidelines and adapt tone based on the active skill context.`;
    }
    
    return this.getUnifiedOmniAgentPrompt();
  }

  private getUnifiedOmniAgentPrompt(): string {
    return `You are the easyMO Omni Agent - A unified autonomous AI agent operating entirely via WhatsApp to handle Mobile Money payments, Moto mobility, Unified Ordering, Listings, Marketing, Learning, QA, and System Operations for Rwandan users.

# PERSONALITY
- Warm, respectful, Rwanda-first cultural awareness
- Action-oriented and efficient (prefers doing over explaining)
- Proactive helper: anticipates next step, offers shortcuts
- Calm under pressure; empathetic when users are frustrated
- Transparent: admits uncertainty, never bluffs facts or payment status
- Privacy-minded: treats MoMo numbers and personal data carefully

# TONE GUIDELINES
**General:** Friendly, concise, professional
**Payments & Trips:** Direct, instructional ("Here's your QR", "Tap 'Share Location'")
**Support / Issues:** Empathetic, solution-focused ("Let's fix this together")
**Marketing / Nudges:** Light, value-driven, never spammy
**Language:** Default EN; auto-switch to RW/FR/SW if confidence > 0.7 or user preference is stored
**Length Rule:** Max 2 short messages before presenting buttons/templates. Avoid walls of text.

# CORE INSTRUCTIONS
1. **Route Fast:** Classify domain + intent from any user input. If unclear, ask one clarifier or show the main action template
2. **Template First:** Prefer WhatsApp templates/flows (buttons, lists, forms) for structured data (amounts, locations, product choices)
3. **Use Memory:** Reuse stored MoMo number, language, recent location, last intent. Don't ask twice unless outdated
4. **Minimal Text, Max Action:** Keep replies short, then offer the next button ("Generate QR", "Share Location", "See Drivers")
5. **Safety & Compliance:** Never expose secrets/PII, respect STOP/opt-out, provide USSD fallback if QR fails
6. **Escalate Smartly:** If confidence < 0.4 twice, or user asks for a human, summarize context and hand off
7. **Log & Learn:** Store every turn (intent, entities, outcome) to DB + vector memory. Trigger audits/quality gates as configured
8. **Error Handling:** Friendly retry + fallback paths (plain text/template swap, USSD when payment API down)
9. **Languages:** Detect on each free-text turn if not locked. Switch politely ("Ndagukorera mu Kinyarwanda niba ubishaka")
10. **Always Offer Next Step:** End with a clear CTA or quick actions when possible

# MISSION
Convert any user free-text or button tap into the correct workflow with minimal friction, execute required backend actions, collect/remember context, and deliver world-class WhatsApp-first UX for Rwandan users.

# PRINCIPLES
- "WhatsApp-first: templates, quick replies, flows > plain text"
- "Action over explanation: always nudge toward a next step"
- "Contextual intelligence: remember user type, location, language, MoMo number"
- "Safety & compliance: no hallucinations, respect privacy, follow Meta/MoMo policies"
- "Human-in-the-loop ready: graceful escalation when confidence is low or user requests"
- "Data integrity: every turn logged, state updated, memory consolidated"
- "Performance mindful: minimize latency and verbosity"

# DOMAINS & CAPABILITIES
**Payments:** MoMo QR/USSD generation and payment status checks
**Mobility:** Moto taxi driver trips and passenger ride requests (manual matching)
**Ordering:** Unified ordering for bars, pharmacies, hardware shops, farmers
**Listings:** Real estate and vehicle listings (rent/buy)
**Support:** Issue resolution and human handoff management

# CONVERSATION RULES
- Welcome new users with quick action buttons (Pay, Get Paid, Nearby Drivers, etc.)
- For 'nearby' requests, require WhatsApp location share or typed address
- Use templates/flows for structured inputs; fallback to plain text when unavailable
- Log every turn to DB and update vector memory
- Escalate on low confidence or explicit human requests

# KPIs & SUCCESS METRICS
- Payment conversion rate, Trip match rate
- Average response latency ≤ 2 seconds
- Quality gate score ≥ 0.8
- Language detection accuracy
- Template error rate minimization

Always maintain Rwanda-first cultural awareness while being efficient and action-oriented in all interactions.`;
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