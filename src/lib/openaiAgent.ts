import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_URL = "https://ijblirphkrrsnxazohwt.supabase.co/functions/v1";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY!);

interface AgentRunInput {
  input: string;
  userId: string;
  domain?: string;
}

interface AgentRunOutput {
  output: string;
  buttons?: Array<{ text: string; payload: string }>;
  toolCalls?: Array<{
    name: string;
    args: any;
    result: any;
    latency: number;
  }>;
}

/**
 * Simple agent executor for Phase 1
 * Will be enhanced with OpenAI Agent SDK in Phase 2
 */
export class AgentExecutor {
  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    // For now, just return a simple response
    // This will be replaced with full OpenAI Agent SDK integration
    const response = this.generateSimpleResponse(input.input);
    
    return {
      output: response,
      buttons: this.getRecommendedButtons(input.input),
      toolCalls: []
    };
  }

  private generateSimpleResponse(input: string): string {
    const normalizedInput = input.toLowerCase();
    
    if (normalizedInput.includes('pay') || normalizedInput.includes('payment') || normalizedInput.includes('qr')) {
      return "I can help you with payments! Would you like to generate a QR code to receive money or pay someone?";
    }
    
    if (normalizedInput.includes('trip') || normalizedInput.includes('driver') || normalizedInput.includes('ride')) {
      return "I can help you with transportation! Are you looking for a ride or do you want to offer one as a driver?";
    }
    
    if (normalizedInput.includes('order') || normalizedInput.includes('buy') || normalizedInput.includes('product')) {
      return "I can help you with orders! What would you like to buy - products from a pharmacy, hardware store, or farm?";
    }
    
    return "Hello! I'm your easyMO assistant. I can help you with payments, trips, orders, and more. What would you like to do today?";
  }

  private getRecommendedButtons(input: string): Array<{ text: string; payload: string }> {
    const normalizedInput = input.toLowerCase();
    
    if (normalizedInput.includes('pay') || normalizedInput.includes('payment')) {
      return [
        { text: "Generate QR", payload: "payment_qr_generate" },
        { text: "Scan QR", payload: "payment_scan_qr" },
        { text: "Send Money", payload: "payment_send_money" }
      ];
    }
    
    if (normalizedInput.includes('trip') || normalizedInput.includes('driver')) {
      return [
        { text: "Find Driver", payload: "mobility_find_driver" },
        { text: "Offer Trip", payload: "mobility_offer_trip" },
        { text: "My Location", payload: "mobility_share_location" }
      ];
    }
    
    if (normalizedInput.includes('order') || normalizedInput.includes('buy')) {
      return [
        { text: "Pharmacy", payload: "order_pharmacy" },
        { text: "Hardware", payload: "order_hardware" },
        { text: "Fresh Produce", payload: "order_farmers" }
      ];
    }
    
    // Default buttons for welcome/unknown input
    return [
      { text: "💸 Payments", payload: "domain_payments" },
      { text: "🚖 Transport", payload: "domain_mobility" },
      { text: "🛒 Orders", payload: "domain_ordering" },
      { text: "🏠 Listings", payload: "domain_listings" }
    ];
  }
}

// Export singleton instance
export const executor = new AgentExecutor();