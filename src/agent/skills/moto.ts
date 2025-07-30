// Moto Skill - Transport and logistics operations
import { z } from 'zod';

export interface MotoContext {
  userId: string;
  phone: string;
  location?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  rideType?: string;
}

export const MotoSkill = {
  name: 'moto',
  description: 'Handle transport booking, driver matching, and ride management',
  
  tools: {
    book_ride: {
      name: 'book_ride',
      description: 'Book a moto ride',
      parameters: z.object({
        pickup_location: z.string(),
        destination: z.string(),
        ride_type: z.enum(['standard', 'premium', 'delivery']).default('standard'),
        passenger_count: z.number().min(1).max(2).default(1)
      }),
      execute: async (params: any, context: MotoContext) => {
        const estimatedFare = Math.floor(Math.random() * 3000) + 1000;
        const estimatedTime = Math.floor(Math.random() * 15) + 5;
        
        return {
          booking_id: `RIDE_${Date.now()}`,
          pickup: params.pickup_location,
          destination: params.destination,
          estimated_fare: estimatedFare,
          estimated_duration: estimatedTime,
          status: 'searching_driver',
          ride_type: params.ride_type
        };
      }
    }
  },
  
  intents: [
    { pattern: /book|ride|moto|transport|taxi/i, confidence: 0.9 },
    { pattern: /driver|find.*driver|available/i, confidence: 0.8 }
  ],
  
  templates: {
    ride_booked: {
      text: "🏍️ Ride Booked Successfully!\n\nBooking ID: {booking_id}\nFrom: {pickup}\nTo: {destination}\nEstimated Fare: {estimated_fare} RWF",
      buttons: [
        { id: 'track_ride', title: 'Track Ride' },
        { id: 'cancel_ride', title: 'Cancel' }
      ]
    }
  }
};