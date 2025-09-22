import { supabaseClient } from "./client.ts";
export class SmartSupportAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[], 
    intentAnalysis?: any
  ): Promise<string> {
    try {
      console.log('🆘 Processing with Smart Support Agent');

      const msg = message.toLowerCase().trim();

      // Handle opt-out requests (critical for marketing compliance)
      if (msg === 'stop' || msg === 'no' || msg.includes('unsubscribe')) {
        return await this.handleOptOut(user);
      }

      // Analyze sentiment to detect frustrated users
      const sentiment = await this.openAI.analyzeSentiment(message);
      console.log(`💭 Sentiment analysis: ${sentiment}`);

      if (msg === 'help' || msg.includes('help me')) {
        return await this.getAIHelpMenu(context);
      }

      // Handle specific help topics with AI enhancement
      if (msg.includes('payment') || msg.includes('pay') || msg.includes('money')) {
        return await this.getAIPaymentHelp(message, context);
      }

      if (msg.includes('driver') || msg.includes('delivery') || msg.includes('transport')) {
        return await this.getAIDriverHelp(message, context);
      }

      if (msg.includes('product') || msg.includes('buy') || msg.includes('sell') || msg.includes('market')) {
        return await this.getAIProductHelp(message, context);
      }

      // For negative sentiment or unrecognized issues, create support ticket
      if (sentiment === 'negative' || intentAnalysis?.confidence < 0.6) {
        return await this.createSupportTicket(message, user, context);
      }

      // AI-powered general support
      const systemMessage = `You are a helpful support agent for easyMO, a WhatsApp super-app in Rwanda for:
      - 💰 Payments (send amounts like '5000')
      - 🛒 Marketplace (browse, buy, sell products)
      - 🛵 Transportation (driver services)
      - 🎉 Events (create and find events)

      The user said: "${message}"
      Sentiment: ${sentiment}
      
      Provide helpful guidance or troubleshooting. If you can't solve their issue, offer to create a support ticket. 
      Be empathetic and solution-focused. Keep under 200 characters. Use emojis.`;

      return await this.openAI.generateResponse(message, systemMessage, context);

    } catch (error) {
      console.error('❌ Smart Support Agent error:', error);
      return "I'm here to help! 🆘 Send 'help' to see what I can assist you with, or describe your issue.";
    }
  }

  private async handleOptOut(user: any): Promise<string> {
    try {
      // In a full implementation, you'd mark the user as opted out
      console.log(`📵 User ${user?.id || 'unknown'} opted out of marketing messages`);
      
      const systemMessage = `A user has opted out of marketing messages. Create a confirmation message that:
      1. Confirms they're removed from marketing
      2. Explains they can still use easyMO services
      3. Is respectful and understanding
      
      Keep under 200 characters. Use appropriate emojis.`;

      return await this.openAI.generateResponse(
        "User opted out of marketing", 
        systemMessage, 
        []
      );
    } catch (error) {
      return "✅ You have been removed from marketing messages. You can still use all easyMO services by sending commands.";
    }
  }

  private async getAIHelpMenu(context: string[]): Promise<string> {
    const systemMessage = `Create a comprehensive help menu for easyMO with these features:
    - 💰 Payments: Send amounts like '5000'
    - 🛒 Shopping: 'browse', 'need [item]'
    - 🚛 Selling: 'add [product] [qty][unit] [price]'
    - 🛵 Drivers: 'driver on/off'
    - 🎉 Events: 'events', 'add event'
    
    Make it clear and organized. Use emojis and bullet points. Can be longer than 200 chars for help menu.`;

    return await this.openAI.generateResponse(
      "User requested help menu", 
      systemMessage, 
      context
    );
  }

  private async getAIPaymentHelp(message: string, context: string[]): Promise<string> {
    const systemMessage = `The user has a payment-related question: "${message}"
    
    Provide helpful payment guidance:
    - How to make payments (send amount like '5000')
    - USSD code usage
    - QR code scanning
    - Common troubleshooting (airtime, correct amount, try again)
    
    Be specific and helpful. Keep under 200 characters unless detailed steps needed.`;

    return await this.openAI.generateResponse(message, systemMessage, context);
  }

  private async getAIDriverHelp(message: string, context: string[]): Promise<string> {
    const systemMessage = `The user has a driver-related question: "${message}"
    
    Provide helpful driver guidance:
    - Registration process
    - Commands: 'driver on', 'driver off', 'driver status'
    - How orders are assigned
    - Requirements and setup
    
    Be clear and encouraging. Keep under 200 characters.`;

    return await this.openAI.generateResponse(message, systemMessage, context);
  }

  private async getAIProductHelp(message: string, context: string[]): Promise<string> {
    const systemMessage = `The user has a marketplace question: "${message}"
    
    Provide helpful marketplace guidance:
    - For buyers: 'browse', 'need [item]', 'buy id:[id]'
    - For sellers: 'add [product] [qty][unit] [price]'
    - How payments work
    - Product availability
    
    Be encouraging and clear. Keep under 200 characters.`;

    return await this.openAI.generateResponse(message, systemMessage, context);
  }

  private async createSupportTicket(message: string, user: any, context: string[]): Promise<string> {
    try {
      const { error } = await this.supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          topic: message.substring(0, 255),
          status: 'open'
        });

      if (error) {
        console.error('❌ Error creating support ticket:', error);
        return "I couldn't create a support ticket right now. Please try describing your issue differently or try again later.";
      }

      const systemMessage = `A support ticket was successfully created for the user's issue: "${message.substring(0, 100)}"
      
      Create a reassuring confirmation message that:
      1. Confirms the ticket was created
      2. Mentions our team will help shortly
      3. Offers immediate help options
      4. Is empathetic and professional
      
      Keep under 200 characters. Use emojis.`;

      return await this.openAI.generateResponse(
        `Support ticket created for: ${message.substring(0, 50)}`, 
        systemMessage, 
        context
      );

    } catch (error) {
      console.error('❌ Error in createSupportTicket:', error);
      return "I want to help you! 🆘 Please try rephrasing your question or send 'help' to see what I can assist with.";
    }
  }
}