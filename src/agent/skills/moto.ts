import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';

export interface MotoSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  template_params?: Record<string, string>;
}

export class MotoSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<MotoSkillResult> {
    console.log(`MotoSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'driver_create_trip':
        return this.handleDriverCreateTrip(message, userId, slots);
      case 'passenger_create_intent':
        return this.handlePassengerCreateIntent(message, userId, slots);
      case 'view_nearby_drivers':
        return this.handleViewNearbyDrivers(message, userId, slots);
      case 'view_nearby_passengers':
        return this.handleViewNearbyPassengers(message, userId, slots);
      default:
        return this.handleMotoMenu(userId);
    }
  }
  
  private async handleDriverCreateTrip(message: string, userId: string, slots: Record<string, any>): Promise<MotoSkillResult> {
    const location = this.extractLocation(message) || slots.location;
    
    if (!location) {
      return {
        success: true,
        response_type: 'text',
        message: '📍 To go online as a driver, please share your current location.\n\nTap the 📎 button and select Location.'
      };
    }
    
    try {
      const tripResult = await toolRegistry.executeTool('driver_trip_create', {
        driver_id: userId,
        pickup_lat: location.lat || -1.9441,
        pickup_lng: location.lng || 30.0619,
        price_estimate: 2000
      });
      
      if (tripResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'trip_created_v1',
          template_params: {
            location: location.name || 'Your location',
            price: '2000'
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to create trip. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Driver trip creation error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error creating trip. Please try again later.'
      };
    }
  }
  
  private async handlePassengerCreateIntent(message: string, userId: string, slots: Record<string, any>): Promise<MotoSkillResult> {
    const location = this.extractLocation(message) || slots.location;
    
    if (!location) {
      return {
        success: true,
        response_type: 'text',
        message: '📍 To book a ride, please share your pickup location.\n\nTap the 📎 button and select Location.'
      };
    }
    
    try {
      const intentResult = await toolRegistry.executeTool('passenger_intent_create', {
        passenger_id: userId,
        pickup_lat: location.lat || -1.9441,
        pickup_lng: location.lng || 30.0619,
        max_budget: 5000
      });
      
      if (intentResult.success) {
        // Also search for nearby drivers
        const nearbyResult = await toolRegistry.executeTool('geo_search', {
          lat: location.lat || -1.9441,
          lng: location.lng || 30.0619,
          radius_km: 5,
          type: 'drivers'
        });
        
        const driverCount = nearbyResult.data?.drivers?.length || 0;
        
        return {
          success: true,
          response_type: 'text',
          message: `🎯 Ride request created!\n\n📍 Pickup: ${location.name || 'Your location'}\n🏍️ Found ${driverCount} nearby drivers\n💰 Budget: up to 5,000 RWF\n\n⏳ Searching for available drivers...`
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to create ride request. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Passenger intent creation error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error creating ride request. Please try again later.'
      };
    }
  }
  
  private async handleViewNearbyDrivers(message: string, userId: string, slots: Record<string, any>): Promise<MotoSkillResult> {
    try {
      const nearbyResult = await toolRegistry.executeTool('geo_search', {
        lat: -1.9441, // Default to Kigali
        lng: 30.0619,
        radius_km: 10,
        type: 'drivers'
      });
      
      const drivers = nearbyResult.data?.drivers || [];
      
      if (drivers.length === 0) {
        return {
          success: true,
          response_type: 'text',
          message: '😔 No drivers found nearby right now.\n\nTry again in a few minutes or expand your search area.'
        };
      }
      
      const driverList = drivers.slice(0, 5).map((driver: any, index: number) => 
        `${index + 1}. ${driver.distance}km away - ${driver.price_estimate} RWF`
      ).join('\n');
      
      return {
        success: true,
        response_type: 'text',
        message: `🏍️ Found ${drivers.length} nearby drivers:\n\n${driverList}\n\nReply with a number to book, or share your location for better matches.`
      };
      
    } catch (error) {
      console.error('Nearby drivers search error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching for drivers. Please try again.'
      };
    }
  }
  
  private async handleViewNearbyPassengers(message: string, userId: string, slots: Record<string, any>): Promise<MotoSkillResult> {
    try {
      const nearbyResult = await toolRegistry.executeTool('geo_search', {
        lat: -1.9441, // Default to Kigali
        lng: 30.0619,
        radius_km: 10,
        type: 'passengers'
      });
      
      const passengers = nearbyResult.data?.passengers || [];
      
      if (passengers.length === 0) {
        return {
          success: true,
          response_type: 'text',
          message: '😔 No ride requests nearby right now.\n\nKeep your app open - we\'ll notify you when passengers book!'
        };
      }
      
      const passengerList = passengers.slice(0, 5).map((passenger: any, index: number) => 
        `${index + 1}. ${passenger.distance}km away - up to ${passenger.max_budget} RWF`
      ).join('\n');
      
      return {
        success: true,
        response_type: 'text',
        message: `🚗 Found ${passengers.length} ride requests:\n\n${passengerList}\n\nReply with a number to accept the ride.`
      };
      
    } catch (error) {
      console.error('Nearby passengers search error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching for passengers. Please try again.'
      };
    }
  }
  
  private handleMotoMenu(userId: string): MotoSkillResult {
    return {
      success: true,
      response_type: 'text',
      message: '🏍️ easyMO Transport\n\nWhat would you like to do?\n\n🟢 Go Online (drivers)\n🚗 Book Ride (passengers)\n📍 Find Nearby Drivers\n📋 Trip History\n\nJust tell me what you need!'
    };
  }
  
  private extractLocation(message: string): any {
    // Simple location extraction - in production would be more sophisticated
    if (message.toLowerCase().includes('kigali')) {
      return { lat: -1.9441, lng: 30.0619, name: 'Kigali' };
    }
    if (message.toLowerCase().includes('nyamirambo')) {
      return { lat: -1.9706, lng: 30.0661, name: 'Nyamirambo' };
    }
    if (message.toLowerCase().includes('kimisagara')) {
      return { lat: -1.9378, lng: 30.0622, name: 'Kimisagara' };
    }
    
    return null;
  }
}

export const motoSkill = new MotoSkill();