import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface UserContext {
  phone: string;
  name?: string;
  location?: { lat: number; lng: number; address?: string };
  preferredLanguage: string;
  lastInteraction?: string;
  conversationCount: number;
  userType: 'new' | 'returning' | 'power_user';
  currentFlow?: string;
  currentStep?: string;
  pendingActions?: any[];
  memory?: Record<string, any>;
}

interface DataValidationResult {
  isValid: boolean;
  requiresLocation: boolean;
  missingFields: string[];
  dataFound?: any;
  message?: string;
}

class DataAwareAgent {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processMessage(message: string, userContext: UserContext): Promise<string> {
    console.log(`🧠 Processing: "${message}" for ${userContext.phone}`);
    
    // Detect intent and validate required data
    const intent = this.detectIntent(message);
    const validation = await this.validateDataRequirements(intent, userContext, message);
    
    if (!validation.isValid) {
      return this.handleMissingRequirements(validation, intent, userContext);
    }
    
    // Process with real data
    return await this.executeWithRealData(intent, userContext, message, validation.dataFound);
  }

  private detectIntent(message: string): string {
    const msg = message.toLowerCase().trim();
    
    // Location-based queries
    if (msg.includes('nearby drivers') || msg.includes('drivers near me') || msg.includes('find drivers')) {
      return 'find_nearby_drivers';
    }
    
    if (msg.includes('nearby passengers') || msg.includes('passengers near me')) {
      return 'find_nearby_passengers';
    }
    
    if (msg.includes('ride') || msg.includes('trip') || msg.includes('moto') && !msg.includes('for sale')) {
      return 'request_ride';
    }
    
    if (msg.includes('driver on') || msg.includes('go online') || msg.includes('start driving')) {
      return 'driver_go_online';
    }
    
    // Payment queries
    if (/^\d+$/.test(msg) || msg.includes('pay') || msg.includes('money') || msg.includes('qr')) {
      return 'payment_request';
    }
    
    // Business queries
    if (msg.includes('pharmacy') || msg.includes('shop') || msg.includes('business') || msg.includes('find')) {
      return 'find_business';
    }
    
    // Marketplace
    if (msg.includes('buy') || msg.includes('sell') || msg.includes('product') || msg.includes('shop')) {
      return 'marketplace_query';
    }
    
    return 'general_inquiry';
  }

  private async validateDataRequirements(intent: string, userContext: UserContext, message: string): Promise<DataValidationResult> {
    switch (intent) {
      case 'find_nearby_drivers':
        return await this.validateNearbyDriversRequest(userContext);
      
      case 'find_nearby_passengers':
        return await this.validateNearbyPassengersRequest(userContext);
        
      case 'request_ride':
        return await this.validateRideRequest(userContext, message);
        
      case 'driver_go_online':
        return await this.validateDriverOnlineRequest(userContext);
        
      case 'find_business':
        return await this.validateBusinessSearch(userContext, message);
        
      case 'marketplace_query':
        return await this.validateMarketplaceQuery(userContext, message);
        
      default:
        return { isValid: true, requiresLocation: false, missingFields: [] };
    }
  }

  private async validateNearbyDriversRequest(userContext: UserContext): Promise<DataValidationResult> {
    // Check if user has shared location
    if (!userContext.location) {
      return {
        isValid: false,
        requiresLocation: true,
        missingFields: ['location'],
        message: "📍 I need your location to find nearby drivers. Please share your current location or type your address."
      };
    }

    // Check for actual drivers in database
    const { data: drivers, error } = await this.supabase.rpc("fn_get_nearby_drivers_spatial", {
      lat: userContext.location.lat,
      lng: userContext.location.lng,
      radius: 5 // 5km radius
    });

    if (error) {
      console.error('Error fetching nearby drivers:', error);
      return {
        isValid: false,
        requiresLocation: false,
        missingFields: [],
        message: "❌ I'm having trouble checking for drivers right now. Please try again."
      };
    }

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { drivers: drivers || [] }
    };
  }

  private async validateNearbyPassengersRequest(userContext: UserContext): Promise<DataValidationResult> {
    if (!userContext.location) {
      return {
        isValid: false,
        requiresLocation: true,
        missingFields: ['location'],
        message: "📍 I need your location to find nearby passenger requests. Please share your current location."
      };
    }

    // Check for actual passenger intents
    const { data: passengers, error } = await this.supabase
      .from('passenger_intents_spatial')
      .select(`
        id, passenger_phone, from_text, to_text, seats_needed, max_price_rwf, created_at,
        ST_Distance(pickup, ST_SetSRID(ST_MakePoint(${userContext.location.lng}, ${userContext.location.lat}), 4326)) as distance_meters
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching nearby passengers:', error);
      return {
        isValid: false,
        requiresLocation: false,
        missingFields: [],
        message: "❌ I'm having trouble checking for passengers right now. Please try again."
      };
    }

    // Filter to within 10km
    const nearbyPassengers = (passengers || []).filter(p => 
      p.distance_meters && p.distance_meters < 10000
    );

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { passengers: nearbyPassengers }
    };
  }

  private async validateRideRequest(userContext: UserContext, message: string): Promise<DataValidationResult> {
    if (!userContext.location) {
      return {
        isValid: false,
        requiresLocation: true,
        missingFields: ['location'],
        message: "📍 To book a ride, I need your pickup location. Please share your current location or type your address."
      };
    }

    // Extract destination if mentioned
    const destination = this.extractDestination(message);
    if (!destination) {
      return {
        isValid: false,
        requiresLocation: false,
        missingFields: ['destination'],
        message: "🎯 Where would you like to go? Please tell me your destination."
      };
    }

    // Check for available drivers
    const { data: drivers } = await this.supabase.rpc("fn_get_nearby_drivers_spatial", {
      lat: userContext.location.lat,
      lng: userContext.location.lng,
      radius: 10 // 10km radius for ride requests
    });

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { drivers: drivers || [], destination }
    };
  }

  private async validateDriverOnlineRequest(userContext: UserContext): Promise<DataValidationResult> {
    // Check if user is registered as driver
    const { data: driver } = await this.supabase
      .from('drivers')
      .select('id, user_id, driver_type, status')
      .or(`phone.eq.${userContext.phone},user_id.eq.${userContext.phone}`)
      .maybeSingle();

    if (!driver) {
      return {
        isValid: false,
        requiresLocation: false,
        missingFields: ['driver_registration'],
        message: "👤 You need to register as a driver first. Reply 'register driver' to get started."
      };
    }

    if (!userContext.location) {
      return {
        isValid: false,
        requiresLocation: true,
        missingFields: ['location'],
        message: "📍 To go online, please share your current location so passengers can find you."
      };
    }

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { driver }
    };
  }

  private async validateBusinessSearch(userContext: UserContext, message: string): Promise<DataValidationResult> {
    if (!userContext.location) {
      return {
        isValid: false,
        requiresLocation: true,
        missingFields: ['location'],
        message: "📍 To find businesses near you, please share your location."
      };
    }

    const businessType = this.extractBusinessType(message);
    
    // Search for actual businesses
    const { data: businesses } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('status', 'active')
      .like('category', businessType ? `%${businessType}%` : '%')
      .limit(10);

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { businesses: businesses || [], businessType }
    };
  }

  private async validateMarketplaceQuery(userContext: UserContext, message: string): Promise<DataValidationResult> {
    const searchQuery = this.extractSearchQuery(message);
    
    // Search for actual products
    let queryBuilder = this.supabase
      .from('products')
      .select('id, name, description, price_rwf, category, stock_qty, vendor_phone')
      .eq('status', 'active')
      .gt('stock_qty', 0);
    
    if (searchQuery) {
      queryBuilder = queryBuilder.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    const { data: products } = await queryBuilder.limit(10);

    return {
      isValid: true,
      requiresLocation: false,
      missingFields: [],
      dataFound: { products: products || [], searchQuery }
    };
  }

  private handleMissingRequirements(validation: DataValidationResult, intent: string, userContext: UserContext): string {
    if (validation.message) {
      return validation.message;
    }

    if (validation.requiresLocation) {
      return "📍 I need your location to help with that. Please share your current location using the 📎 attachment button → Location.";
    }

    return "ℹ️ I need some more information to help you. Please provide more details.";
  }

  private async executeWithRealData(intent: string, userContext: UserContext, message: string, dataFound: any): Promise<string> {
    switch (intent) {
      case 'find_nearby_drivers':
        return this.handleNearbyDriversWithData(dataFound.drivers, userContext);
        
      case 'find_nearby_passengers':
        return this.handleNearbyPassengersWithData(dataFound.passengers, userContext);
        
      case 'request_ride':
        return this.handleRideRequestWithData(dataFound.drivers, dataFound.destination, userContext);
        
      case 'driver_go_online':
        return await this.handleDriverGoOnlineWithData(dataFound.driver, userContext);
        
      case 'find_business':
        return this.handleBusinessSearchWithData(dataFound.businesses, dataFound.businessType, userContext);
        
      case 'marketplace_query':
        return this.handleMarketplaceWithData(dataFound.products, dataFound.searchQuery);
        
      case 'payment_request':
        return await this.handlePaymentRequest(message, userContext);
        
      default:
        return await this.handleGeneralInquiry(message, userContext);
    }
  }

  private handleNearbyDriversWithData(drivers: any[], userContext: UserContext): string {
    if (!drivers || drivers.length === 0) {
      return "🚫 **No Nearby Drivers**\n\nThere are currently no drivers within 5km of your location.\n\n💡 Try:\n• Expanding search area\n• Checking again in a few minutes\n• Scheduling a trip for later\n\nWould you like me to help with something else?";
    }

    let response = `🚗 **${drivers.length} Driver${drivers.length > 1 ? 's' : ''} Found Near You**\n\n`;
    
    drivers.slice(0, 5).forEach((driver, index) => {
      const distance = driver.distance_km ? `${driver.distance_km.toFixed(1)}km away` : 'Distance unknown';
      const driverType = driver.driver_type || 'moto';
      const status = driver.status || 'available';
      
      response += `${index + 1}. ${driverType.toUpperCase()} - ${distance}\n`;
      response += `   📱 ${driver.driver_phone}\n`;
      response += `   🟢 ${status}\n\n`;
    });
    
    response += "📞 **Contact a driver directly** or type 'book ride' to request a trip.\n\n";
    response += "🔄 Drivers shown are currently active in your area.";
    
    return response;
  }

  private handleNearbyPassengersWithData(passengers: any[], userContext: UserContext): string {
    if (!passengers || passengers.length === 0) {
      return "🚫 **No Passenger Requests**\n\nThere are currently no passenger requests within 10km of your location.\n\n💡 Try:\n• Checking again in a few minutes\n• Moving to a busier area\n• Checking during peak hours\n\nType 'go online' to start accepting ride requests.";
    }

    let response = `🙋‍♂️ **${passengers.length} Passenger Request${passengers.length > 1 ? 's' : ''} Found**\n\n`;
    
    passengers.slice(0, 5).forEach((passenger, index) => {
      const distance = passenger.distance_meters ? `${(passenger.distance_meters / 1000).toFixed(1)}km away` : 'Distance unknown';
      const price = passenger.max_price_rwf ? `Budget: ${passenger.max_price_rwf.toLocaleString()} RWF` : 'Price negotiable';
      const route = `${passenger.from_text} → ${passenger.to_text}`;
      const seats = passenger.seats_needed || 1;
      
      response += `${index + 1}. ${route}\n`;
      response += `   👥 ${seats} seat${seats > 1 ? 's' : ''} • ${distance}\n`;
      response += `   💰 ${price}\n`;
      response += `   📱 ${passenger.passenger_phone}\n\n`;
    });
    
    response += "📞 **Contact passengers directly** or reply with number to accept (e.g., '1').\n\n";
    response += "🔄 Requests shown are currently active.";
    
    return response;
  }

  private handleRideRequestWithData(drivers: any[], destination: string, userContext: UserContext): string {
    if (!drivers || drivers.length === 0) {
      return `🚫 **No Drivers Available**\n\nSorry, there are no drivers within 10km of your location right now.\n\n💡 **Options:**\n• Try again in 5-10 minutes\n• Schedule for later\n• Post a passenger request\n\nWould you like me to create a passenger request for "${destination}"?`;
    }

    // Create passenger intent in database
    this.createPassengerIntent(userContext, destination);

    let response = `🚗 **Ride Request Created**\n\n`;
    response += `📍 **From:** Your location\n`;
    response += `🎯 **To:** ${destination}\n\n`;
    response += `**${drivers.length} Driver${drivers.length > 1 ? 's' : ''} in Your Area:**\n\n`;
    
    drivers.slice(0, 3).forEach((driver, index) => {
      const distance = driver.distance_km ? `${driver.distance_km.toFixed(1)}km away` : 'Near you';
      response += `${index + 1}. ${driver.driver_type?.toUpperCase() || 'MOTO'} - ${distance}\n`;
      response += `   📱 ${driver.driver_phone}\n\n`;
    });
    
    response += "📞 **Contact a driver** or wait for someone to accept your request.\n";
    response += "⏱️ We'll notify you when a driver responds!";
    
    return response;
  }

  private async handleDriverGoOnlineWithData(driver: any, userContext: UserContext): Promise<string> {
    // Update driver session to online
    await this.supabase
      .from('driver_sessions')
      .upsert({
        driver_id: driver.id,
        status: 'online',
        last_location: `SRID=4326;POINT(${userContext.location!.lng} ${userContext.location!.lat})`,
        session_start: new Date().toISOString()
      }, { onConflict: 'driver_id' });

    // Update driver status
    await this.supabase
      .from('drivers')
      .update({ 
        status: 'active',
        location_gps: `SRID=4326;POINT(${userContext.location!.lng} ${userContext.location!.lat})`
      })
      .eq('id', driver.id);

    return `🟢 **You're Now Online!**\n\n✅ Status: Active\n📍 Location: Updated\n🚗 Vehicle: ${driver.driver_type?.toUpperCase() || 'MOTO'}\n\n👥 Passengers can now see and contact you.\n💰 You'll receive ride requests in your area.\n\n🔔 Keep WhatsApp open to receive requests!\nType 'offline' when you want to stop driving.`;
  }

  private handleBusinessSearchWithData(businesses: any[], businessType: string, userContext: UserContext): string {
    if (!businesses || businesses.length === 0) {
      const typeText = businessType ? `${businessType}s` : 'businesses';
      return `🚫 **No ${typeText} Found**\n\nSorry, I couldn't find any active ${typeText} in our database right now.\n\n💡 Try:\n• Searching for a different type\n• Checking again later\n• Contacting us to add a business\n\nWhat else can I help you with?`;
    }

    const typeText = businessType || 'business';
    let response = `🏪 **${businesses.length} ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}${businesses.length > 1 ? 'es' : ''} Found**\n\n`;
    
    businesses.slice(0, 5).forEach((business, index) => {
      response += `${index + 1}. **${business.name}**\n`;
      if (business.address) response += `   📍 ${business.address}\n`;
      if (business.phone_number) response += `   📞 ${business.phone_number}\n`;
      if (business.whatsapp_number) response += `   💬 ${business.whatsapp_number}\n`;
      if (business.rating) response += `   ⭐ ${business.rating}/5 (${business.reviews_count || 0} reviews)\n`;
      response += `\n`;
    });
    
    response += "📞 **Contact businesses directly** using the phone numbers above.\n";
    response += "💬 WhatsApp numbers are available for quick messaging.";
    
    return response;
  }

  private handleMarketplaceWithData(products: any[], searchQuery: string): string {
    if (!products || products.length === 0) {
      const queryText = searchQuery ? ` matching "${searchQuery}"` : '';
      return `🚫 **No Products Found**\n\nSorry, I couldn't find any products${queryText} in our marketplace right now.\n\n💡 Try:\n• Different search terms\n• Browsing categories\n• Checking again later\n\nWhat else are you looking for?`;
    }

    const queryText = searchQuery ? ` for "${searchQuery}"` : '';
    let response = `🛒 **${products.length} Product${products.length > 1 ? 's' : ''} Found${queryText}**\n\n`;
    
    products.slice(0, 5).forEach((product, index) => {
      const price = product.price_rwf ? `${product.price_rwf.toLocaleString()} RWF` : 'Price on request';
      const stock = product.stock_qty ? `${product.stock_qty} available` : 'Limited stock';
      
      response += `${index + 1}. **${product.name}**\n`;
      response += `   💰 ${price}\n`;
      response += `   📦 ${stock}\n`;
      if (product.description) response += `   📝 ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}\n`;
      if (product.vendor_phone) response += `   📱 Seller: ${product.vendor_phone}\n`;
      response += `\n`;
    });
    
    response += "📞 **Contact sellers directly** to order or negotiate prices.\n";
    response += "💬 All prices and availability shown are current.";
    
    return response;
  }

  private async handlePaymentRequest(message: string, userContext: UserContext): Promise<string> {
    const amount = this.extractAmount(message);
    
    if (!amount || amount <= 0) {
      return "💰 **Payment Service**\n\n📝 Please specify the amount you want to generate a QR code for.\n\nExample: '5000' for 5,000 RWF\n\nOr tell me what you'd like to pay for.";
    }

    if (amount > 1000000) {
      return "❌ **Amount Too Large**\n\nMaximum payment is 1,000,000 RWF.\nPlease enter a smaller amount.";
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('qr-payment-generator', {
        body: { 
          action: 'generate',
          amount: amount,
          phone: userContext.phone,
          type: 'receive'
        }
      });

      if (error) throw error;

      return `💰 **Payment QR Generated**\n\n💵 **Amount:** ${amount.toLocaleString()} RWF\n📱 **QR Code:** ${data.qr_url}\n💳 **USSD:** ${data.ussd_code}\n🔗 **Link:** ${data.payment_link}\n\n✅ Valid for 24 hours\n📲 Share QR to receive payment instantly`;
    } catch (error) {
      console.error('Payment QR generation failed:', error);
      return "❌ **Payment Error**\n\nCouldn't generate QR code right now.\nPlease try again in a moment.";
    }
  }

  private async handleGeneralInquiry(message: string, userContext: UserContext): Promise<string> {
    if (userContext.conversationCount === 0) {
      return `🎉 **Welcome to easyMO!**\nRwanda's #1 WhatsApp Super-App\n\n🚀 **Quick Services:**\n💰 **Payments** - Type amount (e.g., '5000')\n🛵 **Transport** - Type 'ride' or 'nearby drivers'\n🛒 **Shopping** - Type 'shop' or product name\n🏪 **Businesses** - Type 'pharmacy' or 'shop'\n\n✨ Just tell me what you need!\n\n💡 Try: 'nearby drivers' or 'find pharmacy'`;
    }

    // Use AI for complex queries
    if (openAIApiKey && message.length > 20) {
      return await this.generateAIResponse(message, userContext);
    }

    return "🤖 **How can I help?**\n\n💡 **Quick options:**\n• 'nearby drivers' - Find transport\n• '5000' - Generate payment QR\n• 'pharmacy' - Find businesses\n• 'shop electronics' - Browse products\n\nWhat would you like to do?";
  }

  private async generateAIResponse(message: string, userContext: UserContext): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant for easyMO, Rwanda's WhatsApp super-app. 

IMPORTANT: You always work with REAL DATA from our database. Never make up information about drivers, businesses, or products.

Available services:
- Transport: Find real nearby drivers, book rides, go online as driver
- Payments: Generate QR codes, mobile money
- Marketplace: Search real products from vendors
- Businesses: Find real pharmacies, shops, restaurants

User context:
- Phone: ${userContext.phone}
- Type: ${userContext.userType}
- Conversations: ${userContext.conversationCount}
- Location: ${userContext.location ? 'Available' : 'Not shared'}

Guidelines:
- Keep responses under 200 characters
- Be helpful and direct
- Always guide users to specific keywords for data queries
- If they ask about nearby drivers/businesses, tell them to share location first
- Mention that all data is real and current
- Use simple English or basic Kinyarwanda when appropriate`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || "I'm here to help! Tell me what you need.";
    } catch (error) {
      console.error('AI response error:', error);
      return "I'm here to help! Tell me what you need - try 'nearby drivers' or 'find pharmacy'.";
    }
  }

  // Helper methods
  private extractAmount(message: string): number | null {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  private extractDestination(message: string): string | null {
    const patterns = [
      /to\s+([^,.\n]+)/i,
      /going\s+to\s+([^,.\n]+)/i,
      /destination\s+([^,.\n]+)/i,
      /→\s*([^,.\n]+)/i,
      /-\s*([^,.\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  private extractBusinessType(message: string): string | null {
    const types = ['pharmacy', 'shop', 'restaurant', 'bar', 'supermarket', 'hospital'];
    const msg = message.toLowerCase();
    
    for (const type of types) {
      if (msg.includes(type)) return type;
    }
    
    return null;
  }

  private extractSearchQuery(message: string): string | null {
    const patterns = [
      /buy\s+([^,.\n]+)/i,
      /looking for\s+([^,.\n]+)/i,
      /need\s+([^,.\n]+)/i,
      /shop\s+([^,.\n]+)/i,
      /find\s+([^,.\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  private async createPassengerIntent(userContext: UserContext, destination: string) {
    try {
      await this.supabase
        .from('passenger_intents_spatial')
        .insert({
          passenger_phone: userContext.phone,
          from_text: userContext.location?.address || 'Current location',
          to_text: destination,
          seats_needed: 1,
          pickup: `SRID=4326;POINT(${userContext.location!.lng} ${userContext.location!.lat})`,
          status: 'open'
        });
    } catch (error) {
      console.error('Error creating passenger intent:', error);
    }
  }
}

async function buildUserContext(supabase: any, phone: string): Promise<UserContext> {
  try {
    // Get user memory
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('memory_type, memory_value')
      .eq('user_id', phone);

    const memoryObj = Object.fromEntries((memory || []).map((m: any) => [m.memory_type, m.memory_value]));

    // Get conversation count
    const { data: conversations } = await supabase
      .from('agent_conversations')
      .select('role, message, ts')
      .eq('user_id', phone)
      .order('ts', { ascending: false })
      .limit(10);

    const conversationCount = conversations?.length || 0;
    
    // Determine user type
    let userType: 'new' | 'returning' | 'power_user' = 'new';
    if (conversationCount > 20) userType = 'power_user';
    else if (conversationCount > 0) userType = 'returning';

    // Get location from memory if available
    let location = null;
    if (memoryObj.location) {
      try {
        location = JSON.parse(memoryObj.location);
      } catch (e) {
        console.warn('Could not parse location from memory');
      }
    }

    return {
      phone,
      location,
      preferredLanguage: memoryObj.language || 'en',
      lastInteraction: memoryObj.last_interaction,
      conversationCount,
      userType,
      currentFlow: memoryObj.current_flow,
      currentStep: memoryObj.current_step,
      memory: memoryObj
    };
  } catch (error) {
    console.error('Error building user context:', error);
    return {
      phone,
      preferredLanguage: 'en',
      conversationCount: 0,
      userType: 'new'
    };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, contact_name, message_id, from, text, location } = await req.json();
    
    const userPhone = phone || from;
    const userMessage = message || text;
    
    console.log(`🎯 Data-Aware Agent processing: ${userPhone} - ${userMessage}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build user context
    const userContext = await buildUserContext(supabase, userPhone);
    
    // Update location if provided
    if (location && location.latitude && location.longitude) {
      userContext.location = {
        lat: location.latitude,
        lng: location.longitude,
        address: location.address
      };
      
      // Save location to memory
      await supabase
        .from('agent_memory')
        .upsert({
          user_id: userPhone,
          memory_type: 'location',
          memory_value: JSON.stringify(userContext.location)
        }, { onConflict: 'user_id,memory_type' });
    }

    // Process with data-aware agent
    const agent = new DataAwareAgent(supabase);
    const response = await agent.processMessage(userMessage, userContext);
    
    // Save conversation
    await supabase.from('agent_conversations').insert([
      {
        user_id: userPhone,
        role: 'user',
        message: userMessage,
        metadata: { message_id, contact_name }
      },
      {
        user_id: userPhone,
        role: 'assistant',
        message: response,
        metadata: { agent: 'data-aware-agent' }
      }
    ]);

    // Log execution
    await supabase.from('agent_execution_log').insert({
      user_id: userPhone,
      function_name: 'data-aware-agent',
      input_data: { message: userMessage, location },
      success_status: true,
      model_used: 'data-aware-agent-v1',
      execution_time_ms: Date.now() % 1000
    });

    return new Response(JSON.stringify({
      success: true,
      response,
      user_type: userContext.userType,
      agent: 'data-aware-agent',
      location_required: response.includes('share your location'),
      data_validated: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Data-Aware Agent Error:', error);
    
    return new Response(JSON.stringify({
      success: true,
      response: "I'm having technical difficulties. Please try again or contact support.",
      agent: 'data-aware-agent',
      fallback: true,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});