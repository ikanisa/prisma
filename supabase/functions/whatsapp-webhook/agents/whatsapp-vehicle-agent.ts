import { supabaseClient } from "./client.ts";

export class WhatsAppVehicleAgent {
  private supabase: any;
  private openAI: any;

  constructor(supabase: any, openAI: any) {
    this.supabase = supabase;
    this.openAI = openAI;
  }

  async process(message: string, user: any, whatsappNumber: string, context: string[]): Promise<string> {
    console.log('🚗 WhatsApp Vehicle Agent processing message');

    // Route to specialized vehicle agent
    try {
      const { data, error } = await this.supabase.functions.invoke('whatsapp-vehicle-agent', {
        body: {
          phone_number: whatsappNumber,
          message: message,
          user_context: user
        }
      });

      if (error) {
        console.error('Vehicle agent error:', error);
        return "I'm having trouble with vehicle services right now. Please try again in a moment.";
      }

      return data.response || "Vehicle request processed!";
    } catch (error) {
      console.error('Vehicle agent call failed:', error);
      return "I'm here to help with vehicles! You can list your vehicle, search for vehicles to buy/rent, or contact vehicle sellers. What would you like to do? 🚗";
    }
  }

  private isVehicleQuery(message: string): boolean {
    const vehicleKeywords = [
      'car', 'vehicle', 'motorcycle', 'moto', 'truck', 'bus',
      'toyota', 'honda', 'nissan', 'suzuki', 'hyundai',
      'sell car', 'buy car', 'rent car', 'vehicle for sale',
      'looking for car', 'need vehicle', 'auto', 'automotive'
    ];

    const lowerMessage = message.toLowerCase();
    return vehicleKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
