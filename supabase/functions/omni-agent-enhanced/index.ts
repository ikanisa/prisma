import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

class OpenAIAssistantAgent {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  async processMessage(message: string, userContext: UserContext): Promise<AIProcessingResult> {
    console.log(`🤖 OpenAI Assistant processing: ${userContext.phone} - ${message}`);

    try {
      // Get active assistant
      const { data: assistantConfig } = await this.supabase
        .from('assistant_configs')
        .select('assistant_id')
        .eq('name', 'easyMO_Omni_V2')
        .eq('status', 'active')
        .single();

      if (!assistantConfig) {
        console.warn('No active assistant found, using fallback');
        return this.getFallbackResult(message, userContext);
      }

      // Create thread
      const thread = await this.createThread();
      
      // Add user message
      await this.addMessageToThread(thread.id, message);
      
      // Run assistant
      const run = await this.runAssistant(thread.id, assistantConfig.assistant_id, userContext);
      
      // Get response
      const response = await this.getAssistantResponse(thread.id);
      
      // Store conversation
      await this.storeConversation(userContext.phone, message, response);

      return {
        success: true,
        response: response,
        confidence: 0.9,
        intent: 'assistant_processed',
        toolsCalled: ['openai_assistant']
      };

    } catch (error) {
      console.error('❌ Assistant processing error:', error);
      return this.getFallbackResult(message, userContext);
    }
  }

  private async createThread() {
    const response = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    return await response.json();
  }

  private async addMessageToThread(threadId: string, content: string) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.status}`);
    }

    return await response.json();
  }

  private async runAssistant(threadId: string, assistantId: string, userContext: UserContext) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        additional_instructions: `User context: ${JSON.stringify(userContext)}. CRITICAL: Respond with action buttons using composeWhatsAppMessage tool. Keep responses under 160 characters.`,
        max_prompt_tokens: 8000,
        max_completion_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to run assistant: ${response.status}`);
    }

    const run = await response.json();
    return await this.pollRunCompletion(threadId, run.id);
  }

  private async pollRunCompletion(threadId: string, runId: string, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to check run: ${response.status}`);
      }

      const run = await response.json();
      console.log(`📊 Run status: ${run.status}`);

      if (run.status === 'completed') {
        return run;
      } else if (run.status === 'requires_action') {
        await this.handleToolCalls(threadId, runId, run.required_action);
        continue;
      } else if (['failed', 'cancelled', 'expired'].includes(run.status)) {
        throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Run timed out');
  }

  private async handleToolCalls(threadId: string, runId: string, requiredAction: any) {
    const toolCalls = requiredAction.submit_tool_outputs.tool_calls;
    const toolOutputs = [];

    for (const toolCall of toolCalls) {
      console.log(`🔧 Executing tool: ${toolCall.function.name}`);
      
      try {
        const result = await this.executeToolCall(toolCall);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(result)
        });
      } catch (error) {
        console.error(`❌ Tool call failed: ${toolCall.function.name}`, error);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: error.message })
        });
      }
    }

    // Submit tool outputs
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ tool_outputs: toolOutputs })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit tool outputs: ${response.status}`);
    }
  }

  private async executeToolCall(toolCall: any) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args);

    const toolMap: { [key: string]: string } = {
      'detectIntentAndSlots': 'detect-intent-slots',
      'getUserContext': 'get-user-context', 
      'searchBusinesses': 'search-businesses',
      'createMoMoPaymentLink': 'qr-payment-generator',
      'generateQRCodeSVG': 'generate-qr-code-svg',
      'bookRide': 'book-ride',
      'composeWhatsAppMessage': 'compose-whatsapp-message',
      'updateUserProfile': 'update-user-profile'
    };

    const functionName = toolMap[name];
    if (!functionName) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const { data, error } = await this.supabase.functions.invoke(functionName, {
      body: parsedArgs
    });

    if (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }

    return data;
  }

  private async getAssistantResponse(threadId: string): Promise<string> {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`);
    }

    const messagesData = await response.json();
    const assistantMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');

    if (assistantMessages.length === 0) {
      return "I processed your request. Please check for any action buttons sent.";
    }

    const lastMessage = assistantMessages[0];
    return lastMessage.content[0]?.text?.value || "Processing completed.";
  }

  private async storeConversation(phone: string, message: string, response: string) {
    try {
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
          message: response,
          metadata: {
            agent: 'openai_assistant',
            timestamp: new Date().toISOString()
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Failed to store conversation:', error);
    }
  }

  private getFallbackResult(message: string, userContext: UserContext): AIProcessingResult {
    const fallbackResponse = userContext.userType === 'new' 
      ? `Muraho! 👋 Welcome to easyMO!\n\n🎯 Quick Services:\n💰 Pay - Bills, utilities\n🛵 Ride - Moto transport\n🛒 Shop - Browse products\n\nWhat would you like to try?`
      : `I want to help! 🤔\n\n💰 "Pay [amount]" - Create payment\n🛵 "Ride to [place]" - Book transport\n🛒 "Find [item]" - Search products\n\nWhat do you need?`;

    return {
      success: false,
      response: fallbackResponse,
      confidence: 0.7,
      intent: 'fallback'
    };
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
    const assistantAgent = new OpenAIAssistantAgent(supabase, openaiApiKey);

    // Get user context
    const userContext = await conversationManager.getOrCreateUserContext(phone);
    
    // Process with AI intelligence
    const result = await assistantAgent.processMessage(message, userContext);

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