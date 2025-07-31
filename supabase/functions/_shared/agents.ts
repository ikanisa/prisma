/**
 * REFACTOR: Modular agent system
 * Breaks down monolithic whatsapp-webhook into focused agents
 */

import { getOpenAIClient } from './openai.ts';
import { getSupabaseClient, db } from './supabase.ts';
import type { AgentResponse, User, Driver } from './types.ts';

// Base Agent Class
export abstract class BaseAgent {
  protected openai = getOpenAIClient();
  protected supabase = getSupabaseClient();

  abstract canHandle(message: string, user: User): boolean;
  abstract process(message: string, user: User): Promise<AgentResponse>;

  protected async logConversation(userId: string, role: 'user' | 'assistant', message: string) {
    await db.logConversation({ user_id: userId, role, message });
  }
}

// Payment Agent - Handles payment requests
export class PaymentAgent extends BaseAgent {
  canHandle(message: string): boolean {
    // Detect numeric amounts or payment keywords
    const amountMatch = message.match(/\b(\d{3,})\b/);
    const paymentKeywords = ['pay', 'payment', 'momo', 'money', 'send'];
    return !!amountMatch || paymentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async process(message: string, user: User): Promise<AgentResponse> {
    const amountMatch = message.match(/\b(\d{3,})\b/);
    
    if (!amountMatch) {
      return {
        message: "💰 Please specify an amount to pay (e.g., '5000')",
        action: 'collect_payment'
      };
    }

    const amount = parseInt(amountMatch[1]);
    
    if (amount < 100) {
      return {
        message: "💰 Minimum payment is 100 RWF. Please try again."
      };
    }

    if (amount > user.credits) {
      return {
        message: `💰 Insufficient credits! You have ${user.credits} RWF, but need ${amount} RWF.`,
        action: 'collect_payment',
        data: { requiredAmount: amount, currentBalance: user.credits }
      };
    }

    // Process payment
    const newBalance = user.credits - amount;
    const { error } = await this.supabase
      .from('users')
      .update({ credits: newBalance })
      .eq('id', user.id);

    if (error) {
      console.error('Payment processing error:', error);
      return {
        message: "❌ Payment failed. Please try again later.",
        requiresHuman: true
      };
    }

    return {
      message: `✅ Payment successful! 
💰 Amount: ${amount} RWF
💳 New balance: ${newBalance} RWF
📝 Reference: #${Date.now().toString().slice(-6)}

Thank you for using easyMO! 🚀`,
      action: 'redirect',
      data: { paymentAmount: amount, newBalance }
    };
  }
}

// Ride Agent - Handles transportation requests
export class RideAgent extends BaseAgent {
  canHandle(message: string): boolean {
    const rideKeywords = ['taxi', 'ride', 'transport', 'go to', 'from', 'to', 'trip'];
    return rideKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async process(message: string, user: User): Promise<AgentResponse> {
    // Extract origin and destination
    const routeMatch = message.match(/(?:from\s+)?([\w\s]+?)(?:\s+to\s+)([\w\s]+)/i) ||
                     message.match(/([\w\s]+?)(?:\s*[→->]\s*)([\w\s]+)/);

    if (!routeMatch) {
      return {
        message: `🚗 Where would you like to go? 

Please specify your route like:
• "Taxi from Kigali to Huye"
• "Kigali → Musanze"
• "Need ride to Nyanza"`
      };
    }

    const [, origin, destination] = routeMatch;
    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();

    // Search for available trips
    const { data: trips, error } = await this.supabase
      .from('driver_trips')
      .select(`
        *,
        drivers:driver_id (
          full_name,
          momo_number,
          vehicle_plate
        )
      `)
      .eq('status', 'active')
      .ilike('from_text', `%${cleanOrigin}%`)
      .ilike('to_text', `%${cleanDestination}%`)
      .limit(3);

    if (error) {
      console.error('Trip search error:', error);
      return {
        message: "❌ Unable to search for rides. Please try again.",
        requiresHuman: true
      };
    }

    if (!trips || trips.length === 0) {
      return {
        message: `🚗 No direct rides found from ${cleanOrigin} to ${cleanDestination}.

🔍 Try searching nearby cities or check back later.
📞 For urgent trips, contact: +250 788 000 000`
      };
    }

    let response = `🚗 Found ${trips.length} ride(s) from ${cleanOrigin} to ${cleanDestination}:\n\n`;
    
    trips.forEach((trip: any, index: number) => {
      const driver = trip.drivers || {};
      response += `${index + 1}. ${trip.from_text} → ${trip.to_text}\n`;
      response += `   💰 ${trip.price_rwf} RWF\n`;
      response += `   🪑 ${trip.seats} seat(s) available\n`;
      if (driver.full_name) response += `   👨‍💼 Driver: ${driver.full_name}\n`;
      if (driver.vehicle_plate) response += `   🚗 Vehicle: ${driver.vehicle_plate}\n`;
      if (trip.departure_time) {
        const dept = new Date(trip.departure_time);
        response += `   ⏰ Departure: ${dept.toLocaleTimeString()}\n`;
      }
      response += `\n`;
    });

    response += "💬 Reply with the trip number to book (e.g., '1' for the first trip)";

    return {
      message: response,
      action: 'show_products',
      data: { trips, searchOrigin: cleanOrigin, searchDestination: cleanDestination }
    };
  }
}

// Shopping Agent - Handles product browsing
export class ShoppingAgent extends BaseAgent {
  canHandle(message: string): boolean {
    const shoppingKeywords = ['browse', 'shop', 'buy', 'product', 'store', 'market'];
    return shoppingKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async process(message: string, user: User): Promise<AgentResponse> {
    const { data: products, error } = await this.supabase
      .from('products')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Products fetch error:', error);
      return {
        message: "❌ Unable to load products. Please try again.",
        requiresHuman: true
      };
    }

    if (!products || products.length === 0) {
      return {
        message: "🛒 No products available right now. Check back soon!"
      };
    }

    let response = "🛒 Featured Products:\n\n";
    products.forEach((product: any, index: number) => {
      response += `${index + 1}. ${product.name}\n`;
      response += `   💰 ${product.price} RWF\n`;
      if (product.description) response += `   📝 ${product.description}\n`;
      response += '\n';
    });

    response += "💬 Reply with product number to learn more (e.g., '1')";

    return {
      message: response,
      action: 'show_products',
      data: { products }
    };
  }
}

// Driver Agent - Handles driver signup and trip posting
export class DriverAgent extends BaseAgent {
  canHandle(message: string): boolean {
    const driverKeywords = ['driver', 'earn', 'make money', 'post trip', 'trip:'];
    return driverKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async process(message: string, user: User): Promise<AgentResponse> {
    // Check if user is already a driver
    const { data: existingDriver } = await this.supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (message.toLowerCase().includes('trip:')) {
      // Parse trip posting
      if (!existingDriver) {
        return {
          message: "🚗 You need to register as a driver first. Reply 'driver' to sign up!"
        };
      }

      return await this.handleTripPosting(message, existingDriver);
    }

    if (existingDriver) {
      return {
        message: `🚗 Welcome back, Driver ${existingDriver.full_name || 'Partner'}!

Post a trip: "Trip: Kigali → Huye 2 seats 3000"
Check earnings: "earnings"
Go online: "online"

What would you like to do?`
      };
    }

    return {
      message: `🚗 Join easyMO as a Driver! 

✅ Earn money with your vehicle
✅ Flexible schedule
✅ Weekly payouts via Mobile Money

Requirements:
• Valid vehicle
• Rwanda driving license  
• Mobile Money account

Ready to start earning? Reply 'YES' to continue!`
    };
  }

  private async handleTripPosting(message: string, driver: Driver): Promise<AgentResponse> {
    // Parse trip format: "Trip: Origin → Destination seats price"
    const tripMatch = message.match(/trip:\s*(.+?)\s*[→->]\s*(.+?)\s+(\d+)\s+seats?\s+(\d+)/i);
    
    if (!tripMatch) {
      return {
        message: `🚗 Trip format: "Trip: [Origin] → [Destination] [seats] [price]"

Example: "Trip: Kigali → Huye 2 seats 3000"

Please try again!`
      };
    }

    const [, origin, destination, seats, price] = tripMatch;
    
    // Create trip
    const { data: trip, error } = await this.supabase
      .from('driver_trips')
      .insert({
        driver_id: driver.id,
        from_text: origin.trim(),
        to_text: destination.trim(),
        seats: parseInt(seats),
        price_rwf: parseInt(price),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Trip creation error:', error);
      return {
        message: "❌ Failed to post trip. Please try again.",
        requiresHuman: true
      };
    }

    return {
      message: `✅ Trip posted successfully!

🛣️ Route: ${origin.trim()} → ${destination.trim()}
🪑 Seats: ${seats}
💰 Price: ${price} RWF

Your trip is now live and passengers can book it! 🚀`,
      action: 'create_trip',
      data: { trip }
    };
  }
}

// Support Agent - Handles help and escalations
export class SupportAgent extends BaseAgent {
  canHandle(message: string): boolean {
    const supportKeywords = ['help', 'support', 'problem', 'issue', 'error', 'complain'];
    return supportKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async process(message: string, user: User): Promise<AgentResponse> {
    if (message.toLowerCase().includes('human') || message.toLowerCase().includes('agent')) {
      return {
        message: `🎧 Connecting you to human support...

A team member will contact you within 2 hours.

For urgent issues:
📞 Call: +250 788 000 000
📧 Email: help@easymo.rw

Your ticket ID: #${Date.now().toString().slice(-6)}`,
        requiresHuman: true
      };
    }

    return {
      message: `🆘 easyMO Help Center

💰 PAYMENTS: Send amount (e.g., "5000")
🛒 SHOPPING: Send "browse"
🎉 EVENTS: Send "events"  
🚗 DRIVER: Send "driver" to earn money
🚗 TAXI: Send "taxi from [location] to [location]"

Examples:
• "2000" → Pay 2000 RWF
• "browse" → Browse products
• "driver" → Become a driver
• "events" → See events

Need human help? Reply "human support"`
    };
  }
}

// Agent Router - Determines which agent should handle the message
export class AgentRouter {
  private agents: BaseAgent[] = [
    new PaymentAgent(),
    new RideAgent(),
    new ShoppingAgent(),
    new DriverAgent(),
    new SupportAgent()
  ];

  async routeMessage(message: string, user: User): Promise<AgentResponse> {
    // Try each agent in order of specificity
    for (const agent of this.agents) {
      if (agent.canHandle(message, user)) {
        try {
          return await agent.process(message, user);
        } catch (error) {
          console.error(`Agent ${agent.constructor.name} failed:`, error);
          // Continue to next agent or fallback
        }
      }
    }

    // Default fallback response
    return {
      message: `🤖 I didn't understand "${message}"

Try:
• A number for payments (e.g., "5000")
• "browse" to shop
• "driver" to become a driver
• "taxi from [location] to [location]" for rides
• "events" for events
• "help" for more options

What would you like to do?`
    };
  }
}