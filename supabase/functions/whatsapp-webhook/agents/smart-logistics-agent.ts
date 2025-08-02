import { supabaseClient } from "./client.ts";
export class SmartLogisticsAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[], 
    intentAnalysis?: any
  ): Promise<string> {
    try {
      console.log('🛵 Processing with Smart Logistics Agent');

      // Check if user is a driver
      const { data: driver, error: driverError } = await this.supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (driverError || !driver) {
        const systemMessage = `The user is trying to use driver commands but they're not registered as a driver. 
        Guide them to register as a driver first through the onboarding process. Be helpful and explain they need to restart the conversation. Keep under 200 characters.`;
        
        return await this.openAI.generateResponse(message, systemMessage, context);
      }

      const msg = message.toLowerCase().trim();

      if (msg.includes('driver on') || msg.includes('go online') || msg.includes('start work')) {
        return await this.handleDriverOnlineWithLocation(driver, context);
      }

      if (msg.includes('driver off') || msg.includes('go offline') || msg.includes('stop work')) {
        return await this.handleGoOffline(driver, context);
      }

      if (msg.includes('status') || msg.includes('check status')) {
        return await this.handleStatusCheck(driver, context);
      }

      // AI-powered driver assistance
      const systemMessage = `You are a logistics assistant for drivers in easyMO. The driver (vehicle: ${driver.vehicle_plate}) said: "${message}"

Available commands:
- "driver on" - Go online to receive orders
- "driver off" - Go offline  
- "driver status" - Check current status

Current status: ${driver.is_online ? 'Online' : 'Offline'}

Be helpful and guide them to the right command. Keep response under 200 characters. Use emojis.`;

      return await this.openAI.generateResponse(message, systemMessage, context);

    } catch (error) {
      console.error('❌ Smart Logistics Agent error:', error);
      return "Driver system temporarily unavailable. Please try again! 🛵";
    }
  }

  private async handleDriverOnlineWithLocation(driver: any, context: string[]): Promise<string> {
    try {
      if (driver.is_online) {
        return "You're already online and ready for orders! 🟢";
      }

      // Request real GPS location from user
      return "📍 *Share your current location* to go online!\n\n" +
             "Tap the 📎 attachment button → Location → Send Current Location\n\n" +
             "⚡ This helps passengers find you faster!\n\n" +
             "Once you share location, you'll automatically go online! 🛵";

    } catch (error) {
      console.error('❌ Error handling driver online with location:', error);
      return "❌ Failed to request location. Please try again.";
    }
  }

  private async handleGoOnline(driver: any, context: string[]): Promise<string> {
    try {
      if (driver.is_online) {
        return "You're already online and ready for orders! 🟢";
      }

      // Set default location (in production, would ask for current location)
      const defaultLocation = 'POINT(30.0619 -1.9441)'; // Kigali center

      const { error } = await this.supabase
        .from('drivers')
        .update({
          is_online: true,
          location_gps: defaultLocation
        })
        .eq('id', driver.id);

      if (error) {
        console.error('❌ Error setting driver online:', error);
        return "Couldn't set you online right now. Please try again! 🛵";
      }

      // Check for pending orders
      await this.assignPendingOrders(driver.id);

      const systemMessage = `A driver just went online successfully. Create an enthusiastic confirmation message. 
      Mention they're ready to receive orders and we'll notify them when deliveries are available. 
      Use emojis. Keep under 200 characters.`;

      return await this.openAI.generateResponse(
        "Driver went online successfully", 
        systemMessage, 
        context
      );

    } catch (error) {
      console.error('❌ Error in handleGoOnline:', error);
      return "Error going online. Please try again! 🛵";
    }
  }

  private async handleGoOffline(driver: any, context: string[]): Promise<string> {
    try {
      if (!driver.is_online) {
        return "You're already offline. Send 'driver on' when ready to work! 🔴";
      }

      const { error } = await this.supabase
        .from('drivers')
        .update({ is_online: false })
        .eq('id', driver.id);

      if (error) {
        console.error('❌ Error setting driver offline:', error);
        return "Couldn't set you offline right now. Please try again! 🛵";
      }

      const systemMessage = `A driver just went offline successfully. Create a friendly goodbye message. 
      Mention they can send 'driver on' when ready to work again. 
      Use emojis. Keep under 200 characters.`;

      return await this.openAI.generateResponse(
        "Driver went offline successfully", 
        systemMessage, 
        context
      );

    } catch (error) {
      console.error('❌ Error in handleGoOffline:', error);
      return "Error going offline. Please try again! 🛵";
    }
  }

  private async handleStatusCheck(driver: any, context: string[]): Promise<string> {
    try {
      // Get updated driver info
      const { data: currentDriver, error } = await this.supabase
        .from('drivers')
        .select('is_online, vehicle_plate, driver_kind')
        .eq('id', driver.id)
        .single();

      if (error) {
        return "Error checking status. Please try again! 🛵";
      }

      const status = currentDriver.is_online ? "🟢 Online" : "🔴 Offline";
      
      const systemMessage = `Create a status report for a driver:
      - Status: ${status}
      - Vehicle: ${currentDriver.vehicle_plate}
      - Type: ${currentDriver.driver_kind}
      
      Make it friendly and informative. Include what they can do next. Use emojis. Keep under 200 characters.`;

      return await this.openAI.generateResponse(
        `Driver status: ${status}`, 
        systemMessage, 
        context
      );

    } catch (error) {
      console.error('❌ Error in handleStatusCheck:', error);
      return "Error checking status. Please try again! 🛵";
    }
  }

  private async assignPendingOrders(driverId: string): Promise<void> {
    try {
      // Call assign-driver edge function
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/assign-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          driver_id: driverId
        })
      });

      if (response.ok) {
        console.log('✅ Checked for pending orders to assign');
      } else {
        console.log('⚠️ No pending orders or assignment failed');
      }
    } catch (error) {
      console.error('❌ Error checking for pending orders:', error);
    }
  }
}