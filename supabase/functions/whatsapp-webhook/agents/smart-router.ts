import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class AISmartRouter {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  async routeAndProcess(message: string, userId: string, phone: string, context?: any): Promise<any> {
    console.log(`🧠 AI Smart Router processing: ${phone} - ${message}`);

    try {
      // Step 1: Get user context and data
      const userContext = await this.getUserContext(userId);
      
      // Step 2: Use AI to analyze intent and determine routing
      const routingDecision = await this.getAIRoutingDecision(message, userContext, context);
      
      // Step 3: Execute the routing decision
      const result = await this.executeRouting(routingDecision, message, userContext);
      
      return {
        success: true,
        response: result,
        intent: routingDecision.intent,
        confidence: routingDecision.confidence,
        agent: routingDecision.agent
      };
    } catch (error) {
      console.error('❌ AI Smart Router error:', error);
      return {
        success: false,
        response: this.getFallbackResponse(userId),
        intent: 'error',
        confidence: 0.1
      };
    }
  }

  private async getUserContext(userId: string): Promise<any> {
    try {
      // Get user profile
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone', userId)
        .single();

      // Get recent conversations
      const { data: conversations } = await this.supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(5);

      // Get user location
      const { data: location } = await this.supabase
        .from('user_locations')
        .select('*')
        .eq('phone_number', userId)
        .single();

      // Determine user type
      const conversationCount = conversations?.length || 0;
      let userType = 'new';
      if (conversationCount > 20) userType = 'power_user';
      else if (conversationCount > 0) userType = 'returning';

      return {
        user: user || { phone: userId },
        userType,
        conversationCount,
        recentConversations: conversations || [],
        location: location || null,
        hasLocation: !!location
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        user: { phone: userId },
        userType: 'new',
        conversationCount: 0,
        recentConversations: [],
        location: null,
        hasLocation: false
      };
    }
  }

  private async getAIRoutingDecision(message: string, userContext: any, context?: any): Promise<any> {
    const systemPrompt = this.buildRoutingPrompt(userContext, context);

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
          max_tokens: 500,
          temperature: 0.3,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch {
        // Fallback if JSON parsing fails
        return {
          intent: 'general_inquiry',
          agent: 'omni-agent-enhanced',
          confidence: 0.5,
          reasoning: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      console.error('❌ OpenAI routing error:', error);
      return {
        intent: 'general_inquiry',
        agent: 'omni-agent-enhanced',
        confidence: 0.3,
        reasoning: 'OpenAI API error'
      };
    }
  }

  private buildRoutingPrompt(userContext: any, context?: any): string {
    return `You are the easyMO AI Smart Router. Analyze user messages and determine the best agent routing.

# USER CONTEXT
- Phone: ${userContext.user.phone}
- Type: ${userContext.userType}
- Conversation Count: ${userContext.conversationCount}
- Has Location: ${userContext.hasLocation}
- Recent Conversations: ${userContext.recentConversations.length} messages

# AVAILABLE AGENTS
1. **omni-agent-enhanced**: Primary intelligent agent for complex requests, payments, transport, general queries
2. **data-aware-agent**: For data-heavy requests requiring real database lookups (nearby drivers, businesses, products)
3. **whatsapp-core-engine**: For structured WhatsApp flows, templates, and session management
4. **autonomous-payment-agent**: Specialized for payment processing and QR generation
5. **book-ride**: Specialized for ride booking and transport coordination

# ROUTING RULES
- **omni-agent-enhanced**: Default for most requests, complex queries, multi-step interactions
- **data-aware-agent**: When user asks for nearby services, real-time data, specific business/driver info
- **whatsapp-core-engine**: For template responses, structured flows, menu navigation
- **autonomous-payment-agent**: For payment amounts, QR generation, money transfer
- **book-ride**: For explicit ride booking with pickup/dropoff locations

# INTENT CATEGORIES
- **payment**: Amount mentions, QR codes, money transfer, payment status
- **transport**: Ride booking, nearby drivers, transport requests, driver services
- **location_search**: Find nearby (drivers, businesses, pharmacies), location-based queries
- **marketplace**: Product search, buying, selling, inventory
- **general**: Greetings, help, menu, unclear requests
- **onboarding**: New user welcome, setup, registration

# USER MESSAGE PATTERNS
- Numbers only (e.g., "5000") → payment intent
- "nearby drivers/passengers" → location_search intent
- "book ride from X to Y" → transport intent
- "find pharmacy/shop" → location_search intent
- Greetings, help → general intent

# RESPONSE FORMAT
Respond with JSON only:
{
  "intent": "payment|transport|location_search|marketplace|general|onboarding",
  "agent": "omni-agent-enhanced|data-aware-agent|whatsapp-core-engine|autonomous-payment-agent|book-ride",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of routing decision",
  "requiresData": true/false,
  "parameters": {...any extracted parameters}
}

# EXAMPLES
- "5000" → {"intent": "payment", "agent": "autonomous-payment-agent", "confidence": 0.9}
- "nearby drivers" → {"intent": "location_search", "agent": "data-aware-agent", "confidence": 0.95}
- "book ride to city" → {"intent": "transport", "agent": "book-ride", "confidence": 0.9}
- "hello" → {"intent": "general", "agent": "omni-agent-enhanced", "confidence": 0.8}

Analyze the user message and provide the best routing decision.`;
  }

  private async executeRouting(routingDecision: any, message: string, userContext: any): Promise<string> {
    const { agent, intent, parameters } = routingDecision;
    
    console.log(`🚀 Routing to ${agent} for ${intent} intent`);

    try {
      const payload = {
        message,
        phone: userContext.user.phone,
        userId: userContext.user.phone,
        intent,
        parameters: parameters || {},
        userContext: userContext
      };

      const { data: result, error } = await this.supabase.functions.invoke(agent, {
        body: payload
      });

      if (error) {
        console.error(`❌ Agent ${agent} error:`, error);
        throw error;
      }

      return result?.response || result?.message || "I processed your request successfully.";
    } catch (error) {
      console.error(`❌ Error executing routing to ${agent}:`, error);
      
      // Fallback to omni-agent-enhanced if primary agent fails
      if (agent !== 'omni-agent-enhanced') {
        console.log('🔄 Falling back to omni-agent-enhanced');
        try {
          const { data: fallbackResult, error: fallbackError } = await this.supabase.functions.invoke('omni-agent-enhanced', {
            body: {
              message,
              phone: userContext.user.phone,
              intent: 'fallback_routing'
            }
          });

          if (!fallbackError && fallbackResult?.response) {
            return fallbackResult.response;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback routing also failed:', fallbackError);
        }
      }

      return this.getFallbackResponse(userContext.user.phone);
    }
  }

  private getFallbackResponse(userId: string): string {
    return "I'm here to help! 😊\n\n🎯 Try:\n💰 Send amount for payment QR\n🛵 'nearby drivers' for transport\n🛒 'find pharmacy' for services\n📞 'help' for assistance\n\nWhat would you like to do?";
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, phone, context } = await req.json();
    
    console.log(`🧠 Smart Router processing: ${userId} - ${message}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const router = new AISmartRouter(supabase, openaiApiKey);
    
    // Route intelligently using AI
    const result = await router.routeAndProcess(message, userId, phone, context);

    console.log(`✅ Smart routing complete: ${result.intent} → ${result.agent} (${result.confidence})`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Smart Router error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      response: "I'm experiencing technical difficulties. Please try again in a moment.",
      intent: 'error',
      confidence: 0.1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});