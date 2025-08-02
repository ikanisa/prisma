import { supabaseClient } from "./client.ts";
export class LogisticsAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      // Check if user is a driver
      const { data: driver, error: driverError } = await this.supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (driverError || !driver) {
        return "You need to register as a driver first. Send a new message to start registration.";
      }

      if (msg === 'driver on') {
        return await this.setDriverOnline(driver);
      }

      if (msg === 'driver off') {
        return await this.setDriverOffline(driver);
      }

      if (msg === 'driver status') {
        return await this.getDriverStatus(driver);
      }

      return "Driver commands:\n• 'driver on' - Go online\n• 'driver off' - Go offline\n• 'driver status' - Check status";

    } catch (error) {
      console.error('LogisticsAgent error:', error);
      return "Sorry, there was an error with the driver system. Please try again.";
    }
  }

  private async setDriverOnline(driver: any): Promise<string> {
    try {
      // For now, we'll set a default location (Kigali center)
      // In a real implementation, you'd ask for current location
      const defaultLocation = 'POINT(30.0619 -1.9441)'; // Kigali coordinates

      const { error } = await this.supabase
        .from('drivers')
        .update({
          is_online: true,
          location_gps: defaultLocation
        })
        .eq('id', driver.id);

      if (error) {
        console.error('Error setting driver online:', error);
        return "Sorry, couldn't set you online. Please try again.";
      }

      // Check for pending orders that need drivers
      await this.assignPendingOrders(driver.id);

      return "🛵 You're now online and ready to receive orders!\n\nWe'll notify you when there are deliveries available.";

    } catch (error) {
      console.error('Error in setDriverOnline:', error);
      return "Error going online. Please try again.";
    }
  }

  private async setDriverOffline(driver: any): Promise<string> {
    try {
      const { error } = await this.supabase
        .from('drivers')
        .update({ is_online: false })
        .eq('id', driver.id);

      if (error) {
        console.error('Error setting driver offline:', error);
        return "Sorry, couldn't set you offline. Please try again.";
      }

      return "🛑 You're now offline. Send 'driver on' when you're ready to work again.";

    } catch (error) {
      console.error('Error in setDriverOffline:', error);
      return "Error going offline. Please try again.";
    }
  }

  private async getDriverStatus(driver: any): Promise<string> {
    try {
      const { data: currentDriver, error } = await this.supabase
        .from('drivers')
        .select('is_online, vehicle_plate')
        .eq('id', driver.id)
        .single();

      if (error) {
        return "Error checking status.";
      }

      const status = currentDriver.is_online ? "🟢 Online" : "🔴 Offline";
      return `Driver Status: ${status}\nVehicle: ${currentDriver.vehicle_plate}`;

    } catch (error) {
      console.error('Error in getDriverStatus:', error);
      return "Error checking status.";
    }
  }

  private async assignPendingOrders(driverId: string): Promise<void> {
    try {
      // Call assign-driver edge function for any pending paid orders
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
        console.log('Driver assignment check completed');
      }
    } catch (error) {
      console.error('Error checking for pending orders:', error);
    }
  }
}