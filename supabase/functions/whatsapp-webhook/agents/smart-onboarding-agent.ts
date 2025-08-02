import { supabaseClient } from "./client.ts";
export class SmartOnboardingAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(message: string, user: any, whatsappNumber: string, context: string[]): Promise<string> {
    try {
      console.log('👋 Processing with Smart Onboarding Agent');

      // Check if user already has a role
      const [driverData, businessData] = await Promise.all([
        this.supabase.from('drivers').select('*').eq('user_id', user?.id).single(),
        this.supabase.from('businesses').select('*').eq('owner_user_id', user?.id).single()
      ]);

      const existingDriver = driverData.data;
      const existingBusiness = businessData.data;

      // AI-powered onboarding conversation
      const systemMessage = `You are an AI onboarding agent for easyMO, a WhatsApp super-app in Rwanda for payments, produce marketplace, and transportation.

Your goal is to help users choose their role and complete registration:
- 👩‍🌾 Farmer: Can list and sell produce
- 🛒 Shopper: Can buy products and make payments  
- 🛵 Driver: Can deliver products and transport passengers

Current user status:
- Has driver profile: ${!!existingDriver}
- Has business profile: ${!!existingBusiness}
- Phone: ${whatsappNumber}

If they have roles already, welcome them back and explain available commands.
If they need to choose a role, ask which one they prefer.
If they choose driver, ask for their vehicle plate number.
If they provide a plate number, create their driver profile.

Keep responses under 200 characters and friendly. Use emojis. Always respond in a conversational, helpful tone.`;

      let response = await this.openAI.generateResponse(message, systemMessage, context);

      // Handle specific onboarding actions
      if (await this.isVehiclePlate(message) && !existingDriver) {
        await this.createDriverProfile(user.id, message, whatsappNumber);
        response = `🛵 Perfect! Driver profile created with plate ${message.toUpperCase()}.\n\nSend 'driver on' to start receiving orders!`;
      } else if (message.toLowerCase().includes('farmer') && !existingBusiness) {
        response = `🌾 Great choice! You're registered as a farmer.\n\nTo list produce, send: 'add [product] [quantity][unit] [price]'\nExample: 'add beans 30kg 1500'`;
      } else if (message.toLowerCase().includes('shopper')) {
        response = `🛒 Welcome shopper!\n\n• Send amount like '5000' for payment QR\n• Send 'browse' to see products\n• Send 'help' for more options`;
      }

      return response;
    } catch (error) {
      console.error('❌ Smart Onboarding Agent error:', error);
      return "Welcome to easyMO! 👋 Are you a 👩‍🌾 Farmer, 🛒 Shopper, or 🛵 Driver? Just tell me which you prefer!";
    }
  }

  private async isVehiclePlate(text: string): Promise<boolean> {
    const cleaned = text.trim().toUpperCase();
    return /^[A-Z0-9\s-]{3,10}$/.test(cleaned) && 
           !cleaned.includes('FARMER') && 
           !cleaned.includes('DRIVER') && 
           !cleaned.includes('SHOPPER');
  }

  private async createDriverProfile(userId: string, plateNumber: string, momoCode: string): Promise<void> {
    try {
      await this.supabase.from('drivers').insert({
        user_id: userId,
        vehicle_plate: plateNumber.toUpperCase(),
        driver_kind: 'moto',
        momo_code: momoCode,
        is_online: false
      });

      console.log(`✅ Created driver profile for user ${userId}`);
    } catch (error) {
      console.error('❌ Error creating driver profile:', error);
      throw error;
    }
  }
}