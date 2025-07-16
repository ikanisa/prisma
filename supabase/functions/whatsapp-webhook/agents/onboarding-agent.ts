export class OnboardingAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      // Check if user already exists with role
      const { data: existingDriver } = await this.supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingDriver) {
        return "Welcome back! Send 'driver on' to go online, or 'help' for assistance.";
      }

      // Handle role selection
      if (msg.includes('farmer') || msg.includes('👩‍🌾')) {
        return "Great! 👩‍🌾 You're registered as a farmer. Send 'add maize 50kg 12000' to list your produce.";
      }

      if (msg.includes('shopper') || msg.includes('🛒')) {
        return "Awesome! 🛒 You're registered as a shopper. Send an amount like '5000' to make a payment QR, or 'browse' to see products.";
      }

      if (msg.includes('driver') || msg.includes('🛵')) {
        // Ask for vehicle plate
        return "Cool! 🛵 What's your vehicle plate number?";
      }

      // Handle vehicle plate after driver selection
      if (this.isVehiclePlate(msg)) {
        const { error } = await this.supabase
          .from('drivers')
          .insert({
            user_id: user.id,
            vehicle_plate: msg.toUpperCase(),
            driver_kind: 'moto',
            momo_code: whatsappNumber,
            is_online: false
          });

        if (error) {
          console.error('Error creating driver:', error);
          return "Sorry, there was an error setting up your driver profile. Please try again.";
        }

        return "🛵 Driver profile saved! Send 'driver on' to go online and start receiving orders.";
      }

      // Initial greeting
      return "Hi! 👋 Welcome to easyMO! Are you a:\n👩‍🌾 Farmer\n🛒 Shopper\n🛵 Driver\n\nJust reply with your role!";

    } catch (error) {
      console.error('OnboardingAgent error:', error);
      return "Welcome to easyMO! Please try again or send 'help' for assistance.";
    }
  }

  private isVehiclePlate(text: string): boolean {
    // Basic validation for vehicle plate (letters and numbers)
    return /^[A-Za-z0-9\s-]{3,10}$/.test(text);
  }
}