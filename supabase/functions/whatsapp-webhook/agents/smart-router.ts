import { SmartOnboardingAgent } from './smart-onboarding-agent.ts';
import { SmartPaymentAgent } from './smart-payment-agent.ts';
import { SmartMarketplaceAgent } from './smart-marketplace-agent.ts';
import { SmartLogisticsAgent } from './smart-logistics-agent.ts';
import { SmartEventsAgent } from './smart-events-agent.ts';
import { SmartSupportAgent } from './smart-support-agent.ts';

export class SmartAgentRouter {
  private agents: Map<string, any>;
  private supabase: any;
  private vectorMemory: any;
  private openAI: any;

  constructor(supabase: any, vectorMemory: any, openAI: any) {
    this.supabase = supabase;
    this.vectorMemory = vectorMemory;
    this.openAI = openAI;
    
    this.agents = new Map([
      ['onboarding', new SmartOnboardingAgent(supabase, vectorMemory, openAI)],
      ['payment', new SmartPaymentAgent(supabase, vectorMemory, openAI)],
      ['marketplace', new SmartMarketplaceAgent(supabase, vectorMemory, openAI)],
      ['logistics', new SmartLogisticsAgent(supabase, vectorMemory, openAI)],
      ['events', new SmartEventsAgent(supabase, vectorMemory, openAI)],
      ['support', new SmartSupportAgent(supabase, vectorMemory, openAI)]
    ]);
  }

  async routeAndProcess(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[]
  ): Promise<string> {
    try {
      console.log('🧠 Starting intelligent routing...');

      // First check if this is a new user (onboarding)
      if (!user || await this.isNewUser(user)) {
        console.log('👋 Routing to onboarding agent');
        return await this.agents.get('onboarding')!.process(message, user, whatsappNumber, context);
      }

      // Use AI to determine intent and route
      const intentAnalysis = await this.openAI.extractIntent(message);
      console.log(`🎯 Intent analysis: ${intentAnalysis.intent} (confidence: ${intentAnalysis.confidence})`);

      // Route based on AI-determined intent
      const agentType = this.mapIntentToAgent(intentAnalysis.intent, message);
      console.log(`🚀 Routing to ${agentType} agent`);

      const agent = this.agents.get(agentType) || this.agents.get('support');
      return await agent!.process(message, user, whatsappNumber, context, intentAnalysis);

    } catch (error) {
      console.error('❌ Routing error:', error);
      return "I'm having trouble understanding right now. Could you please rephrase your message? 🤔";
    }
  }

  private async isNewUser(user: any): boolean {
    if (!user) return true;
    
    try {
      // Check if user has had conversations in the last 5 minutes (indicates ongoing onboarding)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: conversations } = await this.supabase
        .from('agent_conversations')
        .select('id')
        .eq('user_id', user.id)
        .gte('ts', fiveMinutesAgo)
        .limit(1);

      // If no recent conversations and user was just created, they're new
      const userAge = Date.now() - new Date(user.created_at).getTime();
      return !conversations?.length && userAge < 10 * 60 * 1000; // 10 minutes
    } catch (error) {
      console.error('Error checking if new user:', error);
      return false;
    }
  }

  private mapIntentToAgent(intent: string, message: string): string {
    const msg = message.toLowerCase();

    // Override AI intent with pattern matching for critical flows
    if (/^\d+(\.\d+)?$/.test(msg.trim())) {
      return 'payment';
    }

    if (msg.includes('driver on') || msg.includes('driver off')) {
      return 'logistics';
    }

    // Use AI intent for other cases
    switch (intent) {
      case 'payment_request':
        return 'payment';
      case 'browse_products':
      case 'buy_product':
      case 'list_product':
        return 'marketplace';
      case 'driver_online':
      case 'driver_offline':
        return 'logistics';
      case 'event_search':
        return 'events';
      case 'help_request':
        return 'support';
      case 'onboarding':
        return 'onboarding';
      default:
        return 'support';
    }
  }
}