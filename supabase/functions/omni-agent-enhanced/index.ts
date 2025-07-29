import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
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
  preferredLanguage: string;
  lastInteraction?: string;
  conversationCount: number;
  userType: 'new' | 'returning' | 'power_user';
  currentFlow?: string;
  locationContext?: string;
  paymentHistory?: any[];
  preferences?: Record<string, any>;
  enhancedContext?: any;
}

interface AIProcessingResult {
  success: boolean;
  response: string;
  confidence: number;
  intent: string;
  nextActions?: string[];
  toolsCalled?: string[];
  learningInsights?: any;
}

class IntelligentOmniAgent {
  private supabase: any;
  private openaiApiKey: string;
  private personaPrompt: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
    this.personaPrompt = this.buildUnifiedPersonaPrompt();
  }

  private buildUnifiedPersonaPrompt(): string {
    return `You are the easyMO Omni Agent - Rwanda's WhatsApp super-app AI assistant.

# CORE PERSONALITY
- Warm, respectful, Rwanda-first cultural awareness
- Action-oriented and efficient - always offer next steps
- Empathetic when users are frustrated
- Never repeat the same response - always be unique and helpful

# RESPONSE GUIDELINES
- Keep responses concise and actionable
- Offer specific next steps or options
- Use emojis appropriately for Rwandan context
- Detect user intent accurately and respond accordingly

# CAPABILITIES
**Payments:** Generate QR codes, mobile money transfers, payment links
**Transport:** Book moto rides, arrange transport, find drivers  
**Shopping:** Find products, connect with vendors, marketplace
**Support:** Answer questions, solve problems, escalate when needed

# LANGUAGE SUPPORT
- Default: English
- Support: Kinyarwanda, French when needed
- Detect language preference and adapt

# RESPONSE FORMAT
Always provide helpful, unique responses. Never send duplicate or generic messages.
Focus on understanding what the user actually needs and provide specific assistance.`;
  }

  async processMessage(message: string, userContext: UserContext): Promise<AIProcessingResult> {
    console.log(`🧠 Starting multi-tier memory retrieval for ${userContext.phone}`);

    try {
      // Step 1: Get enhanced user context
      const enhancedContext = await this.getEnhancedUserContext(userContext.phone, message);
      userContext.enhancedContext = enhancedContext;
      
      console.log(`✅ Retrieved enhanced context:`, {
        hasProfile: !!enhancedContext?.profile,
        hasSummary: !!enhancedContext?.recentSummary,
        orderCount: enhancedContext?.lastOrders?.length || 0,
        vectorHitCount: enhancedContext?.vectorHits?.length || 0
      });

      // Step 2: Classify intent properly
      const intent = await this.classifyIntent(message, userContext);
      console.log(`🎯 Intent classified: ${intent.intent} (confidence: ${intent.confidence})`);

      // Step 3: Generate contextual response based on intent
      const response = await this.generateContextualResponse(message, intent, userContext);

      // Step 4: Store conversation for learning
      await this.storeConversationInsights(userContext.phone, message, response);

      return {
        success: true,
        response: response.response,
        confidence: response.confidence,
        intent: response.intent,
        nextActions: response.nextActions,
        toolsCalled: response.toolsCalled,
        learningInsights: response.learningInsights
      };

    } catch (error) {
      console.error('❌ AI Processing error:', error);
      return {
        success: false,
        response: this.getFallbackResponse(userContext),
        confidence: 0.3,
        intent: 'error_fallback'
      };
    }
  }

  private async getEnhancedUserContext(phone: string, message: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('get-user-context', {
        body: {
          userId: phone,
          query: message,
          sessionId: `session_${phone}_${Date.now()}`
        }
      });

      if (error) {
        console.error('Context retrieval error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get enhanced context:', error);
      return null;
    }
  }

  private async classifyIntent(message: string, userContext: UserContext): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('classify-intent', {
        body: {
          message: message,
          userId: userContext.phone,
          context: userContext.enhancedContext?.recentSummary || ''
        }
      });

      if (error || !data) {
        throw new Error('Intent classification failed');
      }

      return data;
    } catch (error) {
      console.error('Intent classification error:', error);
      
      // Fallback intent classification
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('pay') || lowerMessage.includes('money') || /\d+/.test(message)) {
        return { intent: 'payment', confidence: 0.7 };
      } else if (lowerMessage.includes('ride') || lowerMessage.includes('moto')) {
        return { intent: 'ride', confidence: 0.7 };
      } else if (lowerMessage.includes('shop') || lowerMessage.includes('buy')) {
        return { intent: 'shop', confidence: 0.7 };
      } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return { intent: 'support', confidence: 0.7 };
      } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('muraho')) {
        return { intent: 'greeting', confidence: 0.8 };
      }
      
      return { intent: 'unclear', confidence: 0.3 };
    }
  }

  private async generateContextualResponse(message: string, intent: any, userContext: UserContext): Promise<any> {
    // Determine response based on user type and intent
    if (userContext.userType === 'new') {
      console.log('🎯 Processing support request for new user');
      return this.handleNewUserResponse(message, intent, userContext);
    } else {
      console.log('🎯 Processing support request for returning user'); 
      return this.handleReturningUserResponse(message, intent, userContext);
    }
  }

  private async handleNewUserResponse(message: string, intent: any, userContext: UserContext): Promise<any> {
    const baseResponse = `Muraho! 👋 Welcome to easyMO!\n\n`;
    
    switch (intent.intent) {
      case 'greeting':
        return {
          response: `${baseResponse}🎯 Quick Services:\n💰 *Pay* - Bills, utilities\n🛵 *Ride* - Moto transport\n🛒 *Shop* - Browse products\n📦 *Deliver* - Send packages\n❓ *Help* - Get assistance\n\nWhat would you like to try?`,
          confidence: 0.9,
          intent: 'onboarding',
          nextActions: ['show_services']
        };
      
      case 'payment':
        return {
          response: `${baseResponse}💰 For payments, just tell me:\n• Amount: "Pay 5000 RWF"\n• Bill type: "Pay electricity"\n• Or: "Generate QR code"\n\nWhat payment do you need?`,
          confidence: 0.8,
          intent: 'payment_help',
          nextActions: ['payment_setup']
        };
        
      case 'ride':
        return {
          response: `${baseResponse}🛵 For rides, tell me:\n• "Ride to [destination]"\n• "Book moto to town"\n• Or share your location\n\nWhere do you want to go?`,
          confidence: 0.8,
          intent: 'ride_help',
          nextActions: ['ride_setup']
        };
        
      default:
        return {
          response: `${baseResponse}Here's what I can help with:\n💰 Payments & money transfers\n🛵 Moto rides & transport\n🛒 Shopping & marketplace\n📦 Package delivery\n❓ General support\n\nWhat do you need help with?`,
          confidence: 0.7,
          intent: 'general_help',
          nextActions: ['clarify_need']
        };
    }
  }

  private async handleReturningUserResponse(message: string, intent: any, userContext: UserContext): Promise<any> {
    switch (intent.intent) {
      case 'greeting':
        return {
          response: `Welcome back! 😊\n\n🚀 Quick actions:\n💰 "Pay [amount]" - Instant payment\n🛵 "Ride to [place]" - Book transport\n🛒 "Find [item]" - Search products\n\nWhat can I help you with today?`,
          confidence: 0.9,
          intent: 'greeting_returning',
          nextActions: ['quick_actions']
        };
        
      case 'payment':
        const amount = message.match(/\d+/)?.[0];
        if (amount) {
          return {
            response: `💰 Creating payment for ${amount} RWF...\n\n✅ Payment options:\n📱 Mobile Money USSD\n📄 QR Code for scanning\n🔗 Payment link to share\n\nWhich would you prefer?`,
            confidence: 0.9,
            intent: 'payment_amount',
            nextActions: ['generate_payment'],
            toolsCalled: ['create-payment-options']
          };
        } else {
          return {
            response: `💰 Happy to help with payments!\n\nJust tell me:\n• Amount: "5000 RWF"\n• Bill type: "Electricity bill"\n• Recipient: Phone number\n\nWhat payment do you need?`,
            confidence: 0.8,
            intent: 'payment_info',
            nextActions: ['get_payment_details']
          };
        }
        
      case 'ride':
        return {
          response: `🛵 Ready to book your ride!\n\n📍 I need:\n• Your pickup location (or "current location")\n• Where you want to go\n• When (now or specific time)\n\nWhere are you heading?`,
          confidence: 0.8,
          intent: 'ride_booking',
          nextActions: ['get_ride_details']
        };
        
      case 'shop':
        return {
          response: `🛒 Let's find what you need!\n\nPopular categories:\n🥬 Fresh produce from farmers\n💊 Pharmacy & health items\n🏪 Local businesses & shops\n🔧 Hardware & tools\n\nWhat are you looking for?`,
          confidence: 0.8,
          intent: 'shopping',
          nextActions: ['browse_categories']
        };
        
      case 'support':
        return {
          response: `🆘 I'm here to help!\n\nCommon issues I can solve:\n• Payment problems\n• Ride booking issues\n• Account questions\n• Technical support\n\nWhat specific issue are you having?`,
          confidence: 0.8,
          intent: 'support_request',
          nextActions: ['diagnose_issue']
        };
        
      case 'unclear':
        return {
          response: `I want to help, but I'm not quite sure what you need! 🤔\n\nHere's what I can do:\n💰 Make a payment or generate QR code\n🛵 Book a moto ride or transport\n🏪 Shop for products or find businesses\n📦 Send a package or arrange delivery\n❓ Get help with easyMO services\n\nCould you be more specific about what you'd like to do?`,
          confidence: 0.6,
          intent: 'clarification',
          nextActions: ['clarify_intent']
        };
        
      default:
        return {
          response: `Thanks for reaching out! 👋\n\nI can help you with:\n💰 Payments & transfers\n🛵 Transport & rides\n🛒 Shopping & marketplace\n📦 Delivery services\n\nWhat would you like to do?`,
          confidence: 0.7,
          intent: 'general',
          nextActions: ['show_options']
        };
    }
  }

  private async storeConversationInsights(phone: string, message: string, response: any): Promise<void> {
    try {
      // Store conversation
      await this.supabase.from('agent_conversations').insert([
        {
          user_id: phone,
          role: 'user', 
          message: message,
          metadata: { timestamp: new Date().toISOString() }
        },
        {
          user_id: phone,
          role: 'assistant',
          message: response.response,
          metadata: { 
            agent: 'omni-agent-enhanced',
            confidence: response.confidence,
            intent: response.intent,
            toolsCalled: response.toolsCalled,
            timestamp: new Date().toISOString()
          }
        }
      ]);

    } catch (error) {
      console.error('❌ Failed to store insights:', error);
    }
  }

  private getFallbackResponse(userContext: UserContext): string {
    if (userContext.userType === 'new') {
      return `Muraho! 👋 Welcome to easyMO!\n\nI can help you with:\n💰 'Pay 5000' - Create payment\n🛵 'Ride to town' - Book moto\n🛒 'Find shop' - Search businesses\n❓ 'Help' - Get assistance\n\nWhat can I help you with?`;
    }
    return `I want to help, but I'm not quite sure what you need! 🤔\n\nHere's what I can do:\n💰 Make a payment or generate QR code\n🛵 Book a moto ride or transport\n🏪 Shop for products or find businesses\n📦 Send a package or arrange delivery\n❓ Get help with easyMO services\n\nCould you be more specific about what you'd like to do?`;
  }
}

class ConversationManager {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getOrCreateUserContext(phone: string): Promise<UserContext> {
    try {
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
    
    console.log(`🎯 Omni Agent processing: ${phone} - ${message}`);

    // Check for recent duplicate messages to prevent loops
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: recentMessages } = await supabase
      .from('agent_conversations')
      .select('message, ts')
      .eq('user_id', phone)
      .eq('role', 'user')
      .gt('ts', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
      .order('ts', { ascending: false })
      .limit(3);

    // If we have the exact same message recently, don't process again
    if (recentMessages?.some(m => m.message === message)) {
      console.log('⚠️ Duplicate message detected, skipping processing');
      return new Response(JSON.stringify({
        success: true,
        response: '',
        confidence: 1.0,
        intent: 'duplicate_ignored'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const conversationManager = new ConversationManager(supabase);
    const intelligentAgent = new IntelligentOmniAgent(supabase, openaiApiKey);

    // Get user context
    const userContext = await conversationManager.getOrCreateUserContext(phone);
    
    // Process with AI intelligence
    const result = await intelligentAgent.processMessage(message, userContext);

    console.log(`✅ AI Processing complete:`, {
      success: result.success,
      confidence: result.confidence,
      intent: result.intent,
      toolsCalled: result.toolsCalled?.length || 0
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced Omni Agent error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
      confidence: 0.3,
      intent: 'error_fallback'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});