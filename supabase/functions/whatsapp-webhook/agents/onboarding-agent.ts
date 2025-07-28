export class OnboardingAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string, isNewUser: boolean = false): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      // If this is a new user, send welcome message with features
      if (isNewUser) {
        return this.sendWelcomeMessage();
      }

      // Check if user already exists with specific roles
      const { data: existingDriver } = await this.supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingDriver) {
        return "Welcome back! 🛵\n\n💰 Send amount to get paid (e.g., '5000')\n🚗 Send 'driver on' to go online\n📱 Send 'help' for assistance";
      }

      // Handle service requests directly
      if (this.isAmount(msg)) {
        return "💰 For payments, please specify:\n\n🟢 *Get Paid* - Generate QR to receive money\n🔵 *Pay* - Scan QR or send to someone\n\nReply 'get paid' or 'pay'";
      }

      // Handle payment intents
      if (msg.includes('get paid') || msg.includes('receive')) {
        return "💰 *GET PAID SETUP*\n\nSend the amount you want to receive (e.g., '5000') and I'll generate your QR code instantly!";
      }

      if (msg.includes('pay') || msg.includes('send')) {
        return "💸 *PAYMENT OPTIONS*\n\n1️⃣ Send amount + phone (e.g., '5000 0788123456')\n2️⃣ Or reply 'scan qr' to scan QR code";
      }

      // Handle role selection
      if (msg.includes('farmer') || msg.includes('👩‍🌾')) {
        return "Great! 👩‍🌾 You're registered as a farmer.\n\n📱 *Quick Actions:*\n• Add products: 'add maize 50kg 12000'\n• View sales: 'my sales'\n• Get paid: Send amount (e.g., '5000')";
      }

      if (msg.includes('shopper') || msg.includes('🛒')) {
        return "Awesome! 🛒 You're registered as a shopper.\n\n📱 *Quick Actions:*\n• Browse products: 'browse' or 'shop'\n• Make payment: Send amount (e.g., '5000')\n• Get QR to receive: 'get paid 3000'";
      }

      if (msg.includes('driver') || msg.includes('🛵')) {
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

        return "🛵 *Driver Profile Created!*\n\n📱 *Quick Actions:*\n• Go online: 'driver on'\n• Check earnings: 'earnings'\n• Get paid: Send amount (e.g., '5000')";
      }

      // Menu or help
      if (msg.includes('menu') || msg.includes('help') || msg.includes('start')) {
        return this.sendMainMenu();
      }

      // Default response for unclear messages
      return this.sendMainMenu();

    } catch (error) {
      console.error('OnboardingAgent error:', error);
      return "Welcome to easyMO! Send 'menu' for options or an amount like '5000' for payments.";
    }
  }

  private sendWelcomeMessage(): string {
    return `🎉 *Welcome to easyMO!*
Rwanda's #1 WhatsApp Super-App

🚀 *INSTANT SERVICES:*
💰 *Payments* - Send amount (e.g., '5000')
🛒 *Shopping* - Type 'browse' or 'shop'  
🛵 *Transport* - Type 'ride' or location
📦 *Delivery* - Type 'deliver'
🌾 *Farming* - Type 'sell produce'

✨ *QUICK START:*
Just send a number for instant payment QR!
Example: Send '5000' → Get QR instantly

Type 'menu' anytime for all services 📱`;
  }

  private sendMainMenu(): string {
    return `📱 *easyMO Services*

💰 *PAYMENTS*
• Send amount: '5000'
• Get paid: 'get paid 3000'
• Scan QR: 'scan qr'

🛒 *SHOPPING*
• Browse: 'browse' or 'shop'
• Search: 'find rice'

🛵 *TRANSPORT*
• Book ride: 'ride' or send location
• Delivery: 'deliver'

🌾 *FARMING*
• List produce: 'add maize 50kg 12000'
• View sales: 'my sales'

Type any service or amount to get started!`;
  }

  private isAmount(text: string): boolean {
    return /^\d+$/.test(text.trim());
  }

  private isVehiclePlate(text: string): boolean {
    return /^[A-Za-z0-9\s-]{3,10}$/.test(text);
  }
}