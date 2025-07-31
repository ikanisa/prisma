import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';

export interface ListingsSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  template_params?: Record<string, string>;
}

export class ListingsSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    console.log(`ListingsSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'property_list':
        return this.handlePropertyList(message, userId, slots);
      case 'property_search':
        return this.handlePropertySearch(message, userId, slots);
      case 'vehicle_list':
        return this.handleVehicleList(message, userId, slots);
      case 'vehicle_search':
        return this.handleVehicleSearch(message, userId, slots);
      case 'create_listing':
        return this.handleCreateListing(message, userId, slots);
      default:
        return this.handleListingsMenu(userId);
    }
  }
  
  private async handlePropertyList(message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    try {
      const location = this.extractLocation(message) || slots.location;
      
      const searchResult = await toolRegistry.executeTool('listing_search', {
        type: 'property',
        location: location?.name || 'Kigali',
        lat: location?.lat || -1.9441,
        lng: location?.lng || 30.0619,
        radius_km: 10,
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.listings?.length > 0) {
        const listings = searchResult.data.listings.slice(0, 3);
        const listingText = listings.map((listing: any, index: number) => 
          `${index + 1}. ${listing.title}\n💰 ${listing.price} RWF\n📍 ${listing.location}\n${listing.description?.substring(0, 100)}...`
        ).join('\n\n');
        
        return {
          success: true,
          response_type: 'text',
          message: `🏠 Available Properties:\n\n${listingText}\n\nReply with a number for details, or describe what you're looking for.`
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: '🏠 No properties found in your area right now.\n\nWould you like to:\n• Expand search area\n• Create a listing\n• Get notified when new properties are available'
        };
      }
      
    } catch (error) {
      console.error('Property list error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching properties. Please try again.'
      };
    }
  }
  
  private async handlePropertySearch(message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    try {
      const searchTerms = this.extractSearchTerms(message) || slots.search_terms;
      const budget = this.extractBudget(message) || slots.budget;
      
      const searchResult = await toolRegistry.executeTool('listing_search', {
        type: 'property',
        query: searchTerms,
        max_price: budget,
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.listings?.length > 0) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'property_results_v1',
          template_params: {
            count: searchResult.data.listings.length.toString(),
            budget: budget?.toString() || 'any',
            location: searchTerms || 'all areas'
          }
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: `🔍 No properties found matching "${searchTerms}"\n\nTry:\n• Different keywords\n• Higher budget\n• Broader location`
        };
      }
      
    } catch (error) {
      console.error('Property search error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching properties. Please try again.'
      };
    }
  }
  
  private async handleVehicleList(message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    try {
      const vehicleType = this.extractVehicleType(message) || slots.vehicle_type || 'any';
      
      const searchResult = await toolRegistry.executeTool('listing_search', {
        type: 'vehicle',
        category: vehicleType,
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.listings?.length > 0) {
        const listings = searchResult.data.listings.slice(0, 3);
        const listingText = listings.map((listing: any, index: number) => 
          `${index + 1}. ${listing.make} ${listing.model} (${listing.year})\n💰 ${listing.price} RWF\n⚙️ ${listing.transmission} | 🛣️ ${listing.mileage}km\n📍 ${listing.location}`
        ).join('\n\n');
        
        return {
          success: true,
          response_type: 'text',
          message: `🚗 Available Vehicles:\n\n${listingText}\n\nReply with a number for details, or describe what you're looking for.`
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: '🚗 No vehicles found right now.\n\nWould you like to:\n• Create a listing to sell\n• Set up alerts for new vehicles\n• Browse different categories'
        };
      }
      
    } catch (error) {
      console.error('Vehicle list error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching vehicles. Please try again.'
      };
    }
  }
  
  private async handleVehicleSearch(message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    try {
      const make = this.extractVehicleMake(message) || slots.make;
      const budget = this.extractBudget(message) || slots.budget;
      
      const searchResult = await toolRegistry.executeTool('listing_search', {
        type: 'vehicle',
        make: make,
        max_price: budget,
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.listings?.length > 0) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'vehicle_results_v1',
          template_params: {
            count: searchResult.data.listings.length.toString(),
            make: make || 'any make',
            budget: budget?.toString() || 'any budget'
          }
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: `🔍 No ${make || 'vehicles'} found in your budget\n\nTry:\n• Different make/model\n• Higher budget\n• Used vs new options`
        };
      }
      
    } catch (error) {
      console.error('Vehicle search error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching vehicles. Please try again.'
      };
    }
  }
  
  private async handleCreateListing(message: string, userId: string, slots: Record<string, any>): Promise<ListingsSkillResult> {
    try {
      const listingType = this.extractListingType(message) || slots.listing_type;
      
      if (!listingType) {
        return {
          success: true,
          response_type: 'text',
          message: '📝 What would you like to list?\n\n🏠 Property (house, apartment, land)\n🚗 Vehicle (car, motorcycle, truck)\n\nReply with your choice.'
        };
      }
      
      const createResult = await toolRegistry.executeTool('listing_create', {
        type: listingType,
        user_id: userId,
        status: 'draft'
      });
      
      if (createResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'listing_create_flow_v1',
          template_params: {
            type: listingType,
            listing_id: createResult.data?.listing_id || ''
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to start listing creation. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Create listing error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error creating listing. Please try again.'
      };
    }
  }
  
  private handleListingsMenu(userId: string): ListingsSkillResult {
    return {
      success: true,
      response_type: 'template',
      template_id: 'listings_menu_v1',
      template_params: {
        user_id: userId
      }
    };
  }
  
  // Helper methods
  private extractLocation(message: string): any {
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
  
  private extractSearchTerms(message: string): string | null {
    const terms = message.toLowerCase();
    if (terms.includes('apartment')) return 'apartment';
    if (terms.includes('house')) return 'house';
    if (terms.includes('land')) return 'land';
    if (terms.includes('studio')) return 'studio';
    return null;
  }
  
  private extractBudget(message: string): number | null {
    const budgetMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    return budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, '')) : null;
  }
  
  private extractVehicleType(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('car') || msg.includes('sedan')) return 'car';
    if (msg.includes('suv')) return 'suv';
    if (msg.includes('truck')) return 'truck';
    if (msg.includes('motorcycle') || msg.includes('moto')) return 'motorcycle';
    return null;
  }
  
  private extractVehicleMake(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('toyota')) return 'Toyota';
    if (msg.includes('honda')) return 'Honda';
    if (msg.includes('nissan')) return 'Nissan';
    if (msg.includes('mazda')) return 'Mazda';
    if (msg.includes('bmw')) return 'BMW';
    return null;
  }
  
  private extractListingType(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('property') || msg.includes('house') || msg.includes('apartment')) return 'property';
    if (msg.includes('vehicle') || msg.includes('car') || msg.includes('motorcycle')) return 'vehicle';
    return null;
  }
}

export const listingsSkill = new ListingsSkill();