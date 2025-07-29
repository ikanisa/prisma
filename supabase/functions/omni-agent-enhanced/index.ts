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
    return `You are the easyMO Omni Agent - A unified autonomous AI agent operating entirely via WhatsApp to handle Mobile Money payments, Moto mobility, Unified Ordering, Listings, Marketing, Learning, QA, and System Operations for Rwandan users.

# CORE PERSONALITY
- Warm, respectful, Rwanda-first cultural awareness
- Action-oriented and efficient (prefers doing over explaining)  
- Proactive helper: anticipates next step, offers shortcuts
- Calm under pressure; empathetic when users are frustrated
- Transparent: admits uncertainty, never bluffs facts or payment status
- Privacy-minded: treats MoMo numbers and personal data carefully

# TONE GUIDELINES BY CONTEXT
**General:** Friendly, concise, professional
**Payments & Trips:** Direct, instructional ("Here's your QR", "Tap 'Share Location'")
**Support/Issues:** Empathetic, solution-focused ("Let's fix this together")
**Marketing/Nudges:** Light, value-driven, never spammy
**Language:** Default EN; auto-switch to RW/FR/SW if confidence > 0.7 or user preference stored
**Length Rule:** Max 2 short messages before presenting buttons/templates. Avoid walls of text.

# CORE INSTRUCTIONS
1. **Route Fast:** Classify domain + intent from any user input. If unclear, ask one clarifier or show main action template
2. **Template First:** Prefer WhatsApp templates/flows (buttons, lists, forms) for structured data (amounts, locations, product choices)
3. **Use Memory:** Reuse stored MoMo number, language, recent location, last intent. Don't ask twice unless outdated
4. **Minimal Text, Max Action:** Keep replies short, then offer next button ("Generate QR", "Share Location", "See Drivers")
5. **Safety & Compliance:** Never expose secrets/PII, respect STOP/opt-out, provide USSD fallback if QR fails
6. **Escalate Smartly:** If confidence < 0.4 twice, or user asks for a human, summarize context and hand off
7. **Log & Learn:** Store every turn (intent, entities, outcome) to DB + vector memory
8. **Error Handling:** Friendly retry + fallback paths (plain text/template swap, USSD when payment API down)
9. **Languages:** Detect on each free-text turn if not locked. Switch politely ("Ndagukorera mu Kinyarwanda niba ubishaka")
10. **Always Offer Next Step:** End with clear CTA or quick actions when possible

# DYNAMIC TOOL USAGE
When user needs require actions, call appropriate functions:
- Payment amounts → create-momo-payment-link
- Transport requests → book-ride  
- Product searches → product search functions
- QR generation → generate-qr-code-svg
- Context retrieval → get-user-context
- Intent unclear → classify-intent

# DOMAINS & CAPABILITIES
**Payments:** MoMo QR/USSD generation, payment status checks
**Mobility:** Moto taxi driver trips, passenger ride requests (manual matching)
**Ordering:** Unified ordering for bars, pharmacies, hardware shops, farmers
**Listings:** Real estate and vehicle listings (rent/buy)
**Support:** Issue resolution and human handoff management

# RESPONSE FORMAT
Always respond in this JSON structure:
{
  "response": "Your message text",
  "confidence": 0.0-1.0,
  "intent": "detected_intent",
  "nextActions": ["suggested_actions"],
  "toolsCalled": ["function_names"],
  "learningInsights": {...}
}

# CONTEXT AWARENESS
- Remember user's language preference, location, payment history
- Adapt tone based on user type (new/returning/power)
- Consider time of day, previous interactions
- Use retrieved context to provide personalized responses

Always maintain Rwanda-first cultural awareness while being efficient and action-oriented.`;
  }

  async processMessage(message: string, userContext: UserContext): Promise<AIProcessingResult> {
    console.log(`🧠 AI Processing: ${userContext.phone} - ${message.substring(0, 50)}...`);

    try {
      // Step 1: Get enhanced user context
      const enhancedContext = await this.getEnhancedUserContext(userContext.phone, message);
      userContext.enhancedContext = enhancedContext;

      // Step 2: Build dynamic context-aware prompt
      const contextPrompt = this.buildContextualPrompt(message, userContext);

      // Step 3: Process with OpenAI GPT-4.1 for intelligent response
      const aiResponse = await this.processWithOpenAI(contextPrompt, userContext);

      // Step 4: Execute any required tools based on AI decision
      const toolResults = await this.executeRequiredTools(aiResponse, userContext);

      // Step 5: Generate final response incorporating tool results
      const finalResponse = await this.generateFinalResponse(aiResponse, toolResults, userContext);

      // Step 6: Learn and store insights
      await this.storeConversationInsights(userContext.phone, message, finalResponse);

      return {
        success: true,
        response: finalResponse.response,
        confidence: finalResponse.confidence,
        intent: finalResponse.intent,
        nextActions: finalResponse.nextActions,
        toolsCalled: finalResponse.toolsCalled,
        learningInsights: finalResponse.learningInsights
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

  private buildContextualPrompt(message: string, userContext: UserContext): string {
    let contextInfo = `
USER CONTEXT:
- Phone: ${userContext.phone}
- Type: ${userContext.userType}
- Language: ${userContext.preferredLanguage}
- Conversations: ${userContext.conversationCount}
- Last interaction: ${userContext.lastInteraction || 'first time'}
`;

    if (userContext.enhancedContext) {
      const ctx = userContext.enhancedContext;
      contextInfo += `
ENHANCED CONTEXT:
- Profile: ${ctx.profile ? 'Available' : 'None'}
- Recent summary: ${ctx.recentSummary || 'None'}
- Order history: ${ctx.lastOrders?.length || 0} orders
- Vector hits: ${ctx.vectorHits?.length || 0} relevant memories
- Ephemeral memory: ${ctx.ephemeralMemory ? 'Available' : 'None'}
`;
    }

    return `${this.personaPrompt}

${contextInfo}

USER MESSAGE: "${message}"

Analyze this message and respond intelligently according to your persona. If the user needs specific actions (payments, rides, etc.), indicate which tools should be called in your response.`;
  }

  private async processWithOpenAI(prompt: string, userContext: UserContext): Promise<any> {
    try {
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: prompt
        }
      ];

      const completion = await createChatCompletion(messages, {
        model: 'gpt-4.1-2025-04-14',
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const content = completion.choices[0]?.message?.content;

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(content);
      } catch {
        return {
          response: content,
          confidence: 0.8,
          intent: 'general_query',
          nextActions: [],
          toolsCalled: []
        };
      }
    } catch (error) {
      console.error('❌ OpenAI SDK processing error:', error);
      throw error;
    }
  }

  private async executeRequiredTools(aiResponse: any, userContext: UserContext): Promise<any> {
    const toolResults: any = {};
    
    if (!aiResponse.toolsCalled || aiResponse.toolsCalled.length === 0) {
      return toolResults;
    }

    console.log(`🔧 Executing tools: ${aiResponse.toolsCalled.join(', ')}`);

    for (const tool of aiResponse.toolsCalled) {
      try {
        switch (tool) {
          case 'create-momo-payment-link':
            toolResults[tool] = await this.handlePaymentGeneration(aiResponse, userContext);
            break;
          case 'book-ride':
            toolResults[tool] = await this.handleRideBooking(aiResponse, userContext);
            break;
          case 'generate-qr-code-svg':
            toolResults[tool] = await this.handleQRGeneration(aiResponse, userContext);
            break;
          case 'classify-intent':
            toolResults[tool] = await this.handleIntentClassification(aiResponse, userContext);
            break;
          default:
            console.log(`⚠️ Unknown tool: ${tool}`);
        }
      } catch (error) {
        console.error(`❌ Tool execution error for ${tool}:`, error);
        toolResults[tool] = { error: error.message };
      }
    }

    return toolResults;
  }

  private async handlePaymentGeneration(aiResponse: any, userContext: UserContext): Promise<any> {
    // Extract amount from AI response or user context
    const amount = this.extractAmountFromContext(aiResponse, userContext);
    
    if (!amount || amount <= 0) {
      return { error: 'No valid amount specified' };
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('create-momo-payment-link', {
        body: {
          amount: amount,
          currency: 'RWF',
          phoneNumber: userContext.phone,
          description: `Payment request for ${amount} RWF`,
          userPhone: userContext.phone
        }
      });

      return { data, error };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async handleRideBooking(aiResponse: any, userContext: UserContext): Promise<any> {
    // This would extract pickup/dropoff from AI analysis
    const rideDetails = this.extractRideDetailsFromContext(aiResponse, userContext);
    
    try {
      const { data, error } = await this.supabase.functions.invoke('book-ride', {
        body: {
          pickup: rideDetails.pickup,
          dropoff: rideDetails.dropoff,
          pax: 1,
          phoneNumber: userContext.phone,
          rideType: 'standard'
        }
      });

      return { data, error };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async handleQRGeneration(aiResponse: any, userContext: UserContext): Promise<any> {
    try {
      const qrPayload = `scan-to-pay:${userContext.phone}:${Date.now()}`;
      
      const { data, error } = await this.supabase.functions.invoke('generate-qr-code-svg', {
        body: {
          payload: qrPayload,
          format: 'png',
          size: 300,
          userPhone: userContext.phone
        }
      });

      return { data, error };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async handleIntentClassification(aiResponse: any, userContext: UserContext): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('classify-intent', {
        body: {
          message: aiResponse.originalMessage || '',
          userId: userContext.phone,
          context: userContext.enhancedContext?.recentSummary || ''
        }
      });

      return { data, error };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async generateFinalResponse(aiResponse: any, toolResults: any, userContext: UserContext): Promise<any> {
    // If tools were executed, incorporate their results into the response
    if (Object.keys(toolResults).length > 0) {
      let enhancedResponse = aiResponse.response;

      // Enhance response with tool results
      for (const [tool, result] of Object.entries(toolResults)) {
        if (result && !result.error) {
          enhancedResponse = this.incorporateToolResult(enhancedResponse, tool, result, userContext);
        }
      }

      return {
        ...aiResponse,
        response: enhancedResponse,
        toolResults
      };
    }

    return aiResponse;
  }

  private incorporateToolResult(response: string, tool: string, result: any, userContext: UserContext): string {
    switch (tool) {
      case 'create-momo-payment-link':
        if (result.data?.success) {
          const data = result.data;
          return `💰 *PAYMENT CREATED*\n\n💵 Amount: ${data.amount?.toLocaleString()} RWF\n📱 USSD: ${data.ussdCode}\n📄 QR Code: ${data.qrCodeUrl}\n🔗 Payment Link: ${data.paymentLink}\n\n✅ Expires: ${new Date(data.expiresAt).toLocaleTimeString()}\n📲 Share with payer to complete transaction\n\n🆔 Payment ID: ${data.paymentId}`;
        }
        break;
      case 'book-ride':
        if (result.data?.success) {
          const data = result.data;
          return `🛵 *RIDE BOOKED*\n\n📍 Route: ${data.pickup?.address} → ${data.dropoff?.address}\n💰 Fare: ${data.estimatedFare?.toLocaleString()} RWF\n⏱️ Duration: ~${data.estimatedDuration} min\n📱 Booking ID: ${data.bookingId}\n\n${data.driverInfo ? `👨‍🦲 Driver: ${data.driverInfo.name}\n📞 Phone: ${data.driverInfo.phone}` : '🔍 Finding driver...'}`;
        }
        break;
      case 'generate-qr-code-svg':
        if (result.data?.success) {
          return `📱 *QR SCANNER READY*\n\n📸 Use this QR for payments:\n${result.data.qrCodeUrl}\n\n✅ I can process payment QR codes, USSD codes, and bank links!\n\nOr send photo of QR to scan!`;
        }
        break;
    }
    return response;
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

      // Store execution log
      await this.supabase.from('agent_execution_log').insert({
        user_id: phone,
        function_name: 'omni-agent-enhanced',
        intent: response.intent,
        confidence: response.confidence,
        response_type: 'intelligent_ai',
        tools_called: response.toolsCalled,
        execution_time_ms: Date.now(), // This would be calculated properly
        success: true,
        metadata: response.learningInsights
      });

    } catch (error) {
      console.error('❌ Failed to store insights:', error);
    }
  }

  private extractAmountFromContext(aiResponse: any, userContext: UserContext): number | null {
    // Try to extract amount from AI response or original message
    const text = aiResponse.originalMessage || aiResponse.response || '';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  private extractRideDetailsFromContext(aiResponse: any, userContext: UserContext): any {
    // This would use AI to extract pickup/dropoff locations
    return {
      pickup: { lat: -1.9441, lng: 30.0619, address: 'Current Location' },
      dropoff: { lat: -1.9706, lng: 30.1044, address: 'Destination' }
    };
  }

  private getFallbackResponse(userContext: UserContext): string {
    if (userContext.userType === 'new') {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *Try these now*:\n💰 Send '5000' → Instant payment QR\n🛵 Send 'ride to town' → Book transport\n🛒 Send 'find pharmacy' → Locate services\n\n✨ I understand natural language - just tell me what you need!\n\n🎯 What would you like to try first?`;
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
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, contact_name, message_id } = await req.json();
    
    console.log(`🎯 Enhanced Omni Agent processing: ${phone} - ${message}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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