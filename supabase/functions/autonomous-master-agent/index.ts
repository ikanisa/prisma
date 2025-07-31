import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getOpenAI, generateIntelligentResponse, analyzeIntent } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OMNI AGENT - FULL IMPLEMENTATION PER JOB DESCRIPTION & OPERATING CHARTER
interface UserContext {
  phone: string;
  name?: string;
  language?: string;
  momo_number?: string;
  conversation_history: any[];
  preferences: Record<string, any>;
  current_state: {
    domain?: string;
    intent?: string;
    stage?: string;
    next_action?: string;
    timestamp: string;
    conversation_id?: string;
  };
  kpis: {
    total_interactions: number;
    successful_completions: number;
    avg_response_time: number;
    quality_score: number;
  };
}

interface AgentResponse {
  message: string;
  template?: any;
  actions?: any[];
  confidence: number;
  escalate?: boolean;
  next_action?: string;
  domain: string;
  intent: string;
  kpi_data?: any;
}

class OmniMasterAgent {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabase: any, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  async processMessage(phone: string, message: string): Promise<AgentResponse> {
    console.log(`🚀 OMNI AGENT processing: ${phone} - "${message}"`);
    
    try {
      // 1. Get user context
      const context = await this.getContext(phone);
      
      // 2. Process intent with advanced reasoning
      const analysis = await this.processIntent(message, context);
      
      // 3. Execute skills based on intent
      const skillResult = await this.executeSkills(analysis, context);
      
      // 4. Generate contextual response
      const response = this.generateResponse(analysis, skillResult, context);
      
      // 5. Update memory and state
      await this.updateMemoryAndState(phone, analysis, skillResult);
      
      // 6. Log interaction for learning
      await this.logInteraction(phone, message, response, analysis);
      
      return response;

    } catch (error) {
      console.error('🚨 OMNI AGENT error:', error);
      return {
        message: "I'm experiencing technical difficulties. Let me connect you with human support.",
        confidence: 0.1,
        escalate: true,
        domain: 'support',
        intent: 'escalate'
      };
    }
  }

  private async getContext(phone: string): Promise<UserContext> {
    try {
      const { data: memoryData } = await this.supabase
        .from('agent_memory_enhanced')
        .select('*')
        .eq('user_id', phone)
        .order('updated_at', { ascending: false })
        .limit(20);

      const preferences = {};
      (memoryData || []).forEach(item => {
        if (item.memory_type === 'preference') {
          preferences[item.memory_key] = item.memory_value;
        }
      });

      return {
        phone,
        name: preferences.name,
        language: preferences.language || 'en',
        momo_number: preferences.momo_number,
        conversation_history: memoryData || [],
        preferences,
        current_state: {
          stage: 'idle',
          timestamp: new Date().toISOString()
        },
        kpis: {
          total_interactions: 0,
          successful_completions: 0,
          avg_response_time: 0,
          quality_score: 0
        }
      };
    } catch (error) {
      console.error('Context error:', error);
      return {
        phone,
        conversation_history: [],
        preferences: {},
        current_state: { stage: 'idle', timestamp: new Date().toISOString() },
        kpis: { total_interactions: 0, successful_completions: 0, avg_response_time: 0, quality_score: 0 }
      };
    }
  }

  private async processIntent(message: string, context: UserContext) {
    try {
      // Use OpenAI SDK with Rwanda-first intelligence
      const analysis = await analyzeIntent(message);
      
      // Map to easyMO domains
      const domainMapping: Record<string, string> = {
        'payment': 'payments',
        'ride_request': 'mobility', 
        'product_browse': 'ordering',
        'driver_signup': 'mobility',
        'event_inquiry': 'listings',
        'support': 'support',
        'general': 'support'
      };
      
      return {
        domain: domainMapping[analysis.intent] || 'support',
        intent: analysis.intent,
        confidence: analysis.confidence,
        slots: analysis.entities,
        language_detected: 'en' // Will enhance with language detection
      };
    } catch (error) {
      console.error('Intent processing error:', error);
      return {
        domain: 'support',
        intent: 'help',
        confidence: 0.5,
        slots: {},
        language_detected: 'en'
      };
    }
  }

  private async executeSkills(analysis: any, context: UserContext) {
    const { domain, intent, slots } = analysis;
    
    try {
      switch (`${domain}.${intent}`) {
        case 'payments.generate_qr':
          return await this.generateQR(slots, context);
        case 'payments.send_money':
          return await this.sendMoney(slots, context);
        case 'mobility.create_trip':
          return await this.createTrip(slots, context);
        case 'mobility.request_ride':
          return await this.requestRide(slots, context);
        case 'ordering.browse_products':
          return await this.browseProducts(slots, context);
        case 'listings.create_listing':
          return await this.createListing(slots, context);
        default:
          return { success: false, message: 'Skill not implemented' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async generateQR(slots: any, context: UserContext) {
    const { data, error } = await this.supabase.functions.invoke('enhanced-qr-generator', {
      body: { phone: context.phone, amount: slots.amount || 0 }
    });
    
    if (error) throw error;
    return { success: true, qr_url: data.qr_url, amount: slots.amount };
  }

  private async sendMoney(slots: any, context: UserContext) {
    const ussdCode = `*182*1*1*${slots.recipient}*${slots.amount}#`;
    return { 
      success: true, 
      message: `To send ${slots.amount} RWF to ${slots.recipient}, dial: ${ussdCode}`,
      ussd_code: ussdCode
    };
  }

  private async createTrip(slots: any, context: UserContext) {
    const { data, error } = await this.supabase.functions.invoke('create-ride', {
      body: {
        driver_id: context.phone,
        pickup_location: slots.pickup,
        dropoff_location: slots.dropoff,
        fare: slots.fare || 2000
      }
    });
    
    if (error) throw error;
    return { success: true, trip_id: data.trip_id };
  }

  private async requestRide(slots: any, context: UserContext) {
    const { data, error } = await this.supabase.functions.invoke('create-request', {
      body: {
        passenger_id: context.phone,
        pickup_location: slots.pickup,
        destination: slots.destination
      }
    });
    
    if (error) throw error;
    return { success: true, request_id: data.request_id };
  }

  private async browseProducts(slots: any, context: UserContext) {
    const { data, error } = await this.supabase.functions.invoke('catalog-search', {
      body: { category: slots.category, search_term: slots.search }
    });
    
    if (error) throw error;
    return { success: true, products: data.products };
  }

  private async createListing(slots: any, context: UserContext) {
    const { data, error } = await this.supabase.functions.invoke('listing-publish', {
      body: {
        owner_phone: context.phone,
        type: slots.type,
        title: slots.title,
        price: slots.price
      }
    });
    
    if (error) throw error;
    return { success: true, listing_id: data.listing_id };
  }

  private generateResponse(analysis: any, skillResult: any, context: UserContext): AgentResponse {
    if (skillResult?.success) {
      return this.formatSuccessResponse(analysis.domain, analysis.intent, skillResult, context);
    } else {
      return this.formatErrorResponse(skillResult, analysis, context);
    }
  }

  private formatSuccessResponse(domain: string, intent: string, result: any, context: UserContext): AgentResponse {
    const templates = {
      'payments.generate_qr': `✅ QR code generated! ${result.qr_url}`,
      'payments.send_money': `💸 ${result.message}`,
      'mobility.create_trip': `🏍️ Trip created! Trip ID: ${result.trip_id}`,
      'mobility.request_ride': `🔍 Ride requested! Request ID: ${result.request_id}`,
      'ordering.browse_products': `🛒 Found ${result.products?.length || 0} products`,
      'listings.create_listing': `📝 Listing created! ID: ${result.listing_id}`
    };

    const message = templates[`${domain}.${intent}`] || `✅ ${intent} completed successfully!`;
    
    return {
      message,
      confidence: 0.9,
      escalate: false,
      domain,
      intent,
      next_action: 'completed'
    };
  }

  private formatErrorResponse(result: any, analysis: any, context: UserContext): AgentResponse {
    const message = `❌ ${result?.error || 'Operation failed'}. How can I help you instead?`;
    
    return {
      message,
      confidence: 0.6,
      escalate: false,
      domain: analysis.domain,
      intent: analysis.intent,
      next_action: 'retry'
    };
  }

  private async updateMemoryAndState(phone: string, analysis: any, skillResult: any) {
    try {
      await this.supabase
        .from('agent_memory_enhanced')
        .upsert({
          user_id: phone,
          memory_type: 'interaction',
          memory_key: 'last_domain',
          memory_value: { value: analysis.domain },
          updated_at: new Date().toISOString()
        });

      if (analysis.slots?.language) {
        await this.supabase
          .from('agent_memory_enhanced')
          .upsert({
            user_id: phone,
            memory_type: 'preference',
            memory_key: 'language',
            memory_value: { value: analysis.slots.language },
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Memory update error:', error);
    }
  }

  private async logInteraction(phone: string, message: string, response: AgentResponse, analysis: any) {
    try {
      await this.supabase
        .from('agent_execution_log')
        .insert({
          user_id: phone,
          function_name: 'omni_master_agent',
          input_data: { message, analysis },
          success_status: !response.escalate,
          model_used: 'gpt-4o'
        });
    } catch (error) {
      console.error('Logging error:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();
    
    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const omniAgent = new OmniMasterAgent(supabase, openaiApiKey);
    
    const response = await omniAgent.processMessage(phone, message);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "Service temporarily unavailable. Please try again.",
        escalate: true
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});