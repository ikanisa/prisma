import { OnboardingAgent } from './onboarding-agent.ts';
import { PaymentAgent } from './payment-agent.ts';
import { ListingAgent } from './listing-agent.ts';
import { MarketplaceAgent } from './marketplace-agent.ts';
import { LogisticsAgent } from './logistics-agent.ts';
import { EventsAgent } from './events-agent.ts';
import { SupportAgent } from './support-agent.ts';

export class AgentRouter {
  private agents: Map<string, any>;
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.agents = new Map([
      ['onboarding', new OnboardingAgent(supabase)],
      ['payment', new PaymentAgent(supabase)],
      ['listing', new ListingAgent(supabase)],
      ['marketplace', new MarketplaceAgent(supabase)],
      ['logistics', new LogisticsAgent(supabase)],
      ['events', new EventsAgent(supabase)],
      ['support', new SupportAgent(supabase)]
    ]);
  }

  async routeMessage(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      // Check if this is a first message (new user)
      if (!user.created_at || this.isFirstMessage(user)) {
        return await this.agents.get('onboarding')!.process(message, user, whatsappNumber);
      }

      // Route based on message patterns
      const route = this.determineRoute(message, user);
      const agent = this.agents.get(route) || this.agents.get('support');
      
      return await agent!.process(message, user, whatsappNumber);
    } catch (error) {
      console.error('Routing error:', error);
      return "Sorry, I'm having trouble processing your request. Please try again.";
    }
  }

  private isFirstMessage(user: any): boolean {
    // Check if user has had previous conversations
    const timeSinceCreation = new Date().getTime() - new Date(user.created_at).getTime();
    return timeSinceCreation < 60000; // Within 1 minute of creation
  }

  private determineRoute(message: string, user: any): string {
    const msg = message.toLowerCase().trim();

    // Payment agent - numeric amount
    if (/^\d+(\.\d+)?$/.test(msg)) {
      return 'payment';
    }

    // Listing agent - add products
    if (/^add\s/.test(msg)) {
      return 'listing';
    }

    // Logistics agent - driver commands
    if (/driver\s+(on|off)/.test(msg)) {
      return 'logistics';
    }

    // Marketplace agent - browsing and buying
    if (msg === 'browse' || /^(need|buy|want)\s/.test(msg)) {
      return 'marketplace';
    }

    // Events agent
    if (msg === 'events' || msg === 'add event') {
      return 'events';
    }

    // Help requests
    if (msg === 'help' || msg.includes('help')) {
      return 'support';
    }

    // Default to support for unrecognized messages
    return 'support';
  }
}