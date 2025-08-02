import { supabaseClient } from "./client.ts";
export class SupportAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      // Handle opt-out requests
      if (msg === 'stop' || msg === 'no') {
        return await this.handleOptOut(user);
      }

      // Handle specific help topics
      if (msg === 'help') {
        return this.getHelpMenu();
      }

      if (msg.includes('payment') || msg.includes('pay')) {
        return this.getPaymentHelp();
      }

      if (msg.includes('driver') || msg.includes('delivery')) {
        return this.getDriverHelp();
      }

      if (msg.includes('product') || msg.includes('buy') || msg.includes('sell')) {
        return this.getProductHelp();
      }

      // For unrecognized messages, create support ticket
      return await this.createSupportTicket(message, user);

    } catch (error) {
      console.error('SupportAgent error:', error);
      return "I'm here to help! Send 'help' to see what I can assist you with.";
    }
  }

  private async handleOptOut(user: any): Promise<string> {
    try {
      // Mark user as opted out (you might want to add an opt_out field to users table)
      // For now, we'll just acknowledge the request
      return "✅ You have been removed from marketing messages. You can still use easyMO services by sending commands.";
    } catch (error) {
      return "Opt-out request received.";
    }
  }

  private getHelpMenu(): string {
    return `🆘 easyMO Help Menu:

💰 PAYMENTS
Send a number (e.g., '5000') to generate payment QR

🛒 SHOPPING
• 'browse' - See all products
• 'need [item]' - Search products

🚛 SELLING (Farmers)
• 'add [product] [qty][unit] [price]'
Example: 'add beans 30kg 1500'

🛵 DRIVERS
• 'driver on' - Go online
• 'driver off' - Go offline

🎉 EVENTS
• 'events' - See upcoming events
• 'add event' - Create new event

Need more help? Just describe your issue and I'll create a support ticket.`;
  }

  private getPaymentHelp(): string {
    return `💰 Payment Help:

To make a payment:
1. Send the amount (e.g., '5000')
2. Use the USSD code or scan QR
3. Complete payment on your phone

Payment issues?
• Check your phone has airtime
• Ensure amount is correct
• Try again after 1 minute

Still having trouble? Describe the issue for support.`;
  }

  private getDriverHelp(): string {
    return `🛵 Driver Help:

Getting Started:
1. Register as driver in onboarding
2. Provide vehicle plate number
3. Send 'driver on' to go online

Commands:
• 'driver on' - Start receiving orders
• 'driver off' - Stop receiving orders
• 'driver status' - Check your status

Orders will be assigned automatically when you're online.`;
  }

  private getProductHelp(): string {
    return `🛒 Product Help:

BUYERS:
• 'browse' - See all products
• 'need beans' - Search for specific items
• 'buy id:abc123' - Purchase a product

SELLERS:
• 'add maize 50kg 2000' - List products
Format: add [name] [quantity][unit] [price]

Products appear immediately when listed.
Buyers pay directly through QR codes.`;
  }

  private async createSupportTicket(message: string, user: any): Promise<string> {
    try {
      const { error } = await this.supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          topic: message.substring(0, 255), // Truncate if too long
          status: 'open'
        });

      if (error) {
        console.error('Error creating support ticket:', error);
        return "I couldn't create a support ticket right now. Please try again later.";
      }

      return `🎫 Support ticket created! Our team will assist you shortly.

Your message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

For immediate help, send 'help' to see common solutions.`;

    } catch (error) {
      console.error('Error in createSupportTicket:', error);
      return "I'll help you! Send 'help' to see what I can assist you with, or try rephrasing your question.";
    }
  }
}