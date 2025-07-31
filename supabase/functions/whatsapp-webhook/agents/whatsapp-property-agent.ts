
export class WhatsAppPropertyAgent {
  private supabase: any;
  private openAI: any;

  constructor(supabase: any, openAI: any) {
    this.supabase = supabase;
    this.openAI = openAI;
  }

  async process(message: string, user: any, whatsappNumber: string, context: string[]): Promise<string> {
    console.log('🏠 WhatsApp Property Agent processing message');

    // Route to specialized property agent
    try {
      const { data, error } = await this.supabase.functions.invoke('whatsapp-property-agent', {
        body: {
          phone_number: whatsappNumber,
          message: message,
          user_context: user
        }
      });

      if (error) {
        console.error('Property agent error:', error);
        return "I'm having trouble with property services right now. Please try again in a moment.";
      }

      return data.response || "Property request processed!";
    } catch (error) {
      console.error('Property agent call failed:', error);
      return "I'm here to help with properties! You can list your property, search for properties to buy/rent, contact property owners, or schedule viewings. What would you like to do? 🏠";
    }
  }

  private isPropertyQuery(message: string): boolean {
    const propertyKeywords = [
      'house', 'apartment', 'room', 'property', 'land', 'plot',
      'rent house', 'buy house', 'apartment for rent', 'property for sale',
      'looking for house', 'need apartment', 'real estate',
      'bedroom', 'bathroom', 'furnished', 'landlord', 'tenant'
    ];

    const lowerMessage = message.toLowerCase();
    return propertyKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
