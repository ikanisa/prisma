import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';

export interface DataSyncSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  template_params?: Record<string, string>;
}

export class DataSyncSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    console.log(`DataSyncSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'import_google_places':
        return this.handleGooglePlacesImport(message, userId, slots);
      case 'sync_airbnb':
        return this.handleAirbnbSync(message, userId, slots);
      case 'upload_csv':
        return this.handleCsvUpload(message, userId, slots);
      case 'sync_contacts':
        return this.handleContactsSync(message, userId, slots);
      case 'import_products':
        return this.handleProductsImport(message, userId, slots);
      default:
        return this.handleDataSyncMenu(userId);
    }
  }
  
  private async handleGooglePlacesImport(message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    try {
      const category = this.extractCategory(message) || slots.category;
      const location = this.extractLocation(message) || slots.location || 'Kigali, Rwanda';
      
      if (!category) {
        return {
          success: true,
          response_type: 'text',
          message: '📍 Import Google Places data:\n\nChoose category:\n🏥 Pharmacies\n🛠️ Hardware stores\n🍻 Restaurants & bars\n🏪 All businesses\n\nReply with your choice.'
        };
      }
      
      const importResult = await toolRegistry.executeTool('google_places_import', {
        category: category,
        location: location,
        radius: 50000, // 50km around location
        user_id: userId
      });
      
      if (importResult.success) {
        return {
          success: true,
          response_type: 'text',
          message: `✅ Google Places import started!\n\n📍 Location: ${location}\n🏪 Category: ${category}\n⏳ Processing ${importResult.data?.estimated_count || 'unknown'} places\n\nYou'll get notified when complete.`
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to start Google Places import. Please check your settings and try again.'
        };
      }
      
    } catch (error) {
      console.error('Google Places import error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error starting import. Please try again later.'
      };
    }
  }
  
  private async handleAirbnbSync(message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    try {
      const url = this.extractUrl(message) || slots.url;
      
      if (!url) {
        return {
          success: true,
          response_type: 'text',
          message: '🏠 Sync Airbnb listings:\n\nSend me:\n• Airbnb listing URL\n• Your host profile URL\n• Search results URL for your area\n\nI\'ll import property details automatically.'
        };
      }
      
      const syncResult = await toolRegistry.executeTool('airbnb_scraper', {
        url: url,
        user_id: userId
      });
      
      if (syncResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'airbnb_sync_success_v1',
          template_params: {
            listings_count: syncResult.data?.listings_imported?.toString() || '0',
            url: url
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to sync Airbnb data. Please check the URL and try again.'
        };
      }
      
    } catch (error) {
      console.error('Airbnb sync error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error syncing Airbnb. Please try again.'
      };
    }
  }
  
  private async handleCsvUpload(message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    try {
      const dataType = this.extractDataType(message) || slots.data_type;
      
      if (!dataType) {
        return {
          success: true,
          response_type: 'text',
          message: '📊 Upload CSV data:\n\nSupported formats:\n• 🏪 Businesses (name, address, phone, category)\n• 📦 Products (name, price, description, category)\n• 👥 Contacts (name, phone, location)\n• 🚗 Vehicles (make, model, year, price)\n\nWhat type of data?'
        };
      }
      
      return {
        success: true,
        response_type: 'template',
        template_id: 'csv_upload_flow_v1',
        template_params: {
          data_type: dataType,
          user_id: userId
        }
      };
      
    } catch (error) {
      console.error('CSV upload error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error preparing CSV upload. Please try again.'
      };
    }
  }
  
  private async handleContactsSync(message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    try {
      const source = this.extractContactSource(message) || slots.source;
      
      if (!source) {
        return {
          success: true,
          response_type: 'text',
          message: '📱 Sync contacts:\n\nChoose source:\n• WhatsApp (export from phone)\n• Google Contacts\n• Phone contacts\n• CSV file\n\nWhich would you like to sync?'
        };
      }
      
      const syncResult = await toolRegistry.executeTool('contacts_import', {
        source: source,
        user_id: userId
      });
      
      if (syncResult.success) {
        return {
          success: true,
          response_type: 'text',
          message: `✅ Contacts sync started!\n\n📱 Source: ${source}\n⏳ Processing contacts...\n\nYou'll be notified when complete with import summary.`
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to start contacts sync. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Contacts sync error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error syncing contacts. Please try again.'
      };
    }
  }
  
  private async handleProductsImport(message: string, userId: string, slots: Record<string, any>): Promise<DataSyncSkillResult> {
    try {
      const source = this.extractProductSource(message) || slots.source;
      const category = this.extractCategory(message) || slots.category;
      
      if (!source) {
        return {
          success: true,
          response_type: 'text',
          message: '📦 Import products:\n\nChoose source:\n• POS system export\n• Supplier catalog\n• E-commerce platform\n• Manual CSV\n\nWhich source?'
        };
      }
      
      const importResult = await toolRegistry.executeTool('products_import', {
        source: source,
        category: category,
        user_id: userId
      });
      
      if (importResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'products_import_success_v1',
          template_params: {
            source: source,
            category: category || 'all categories',
            count: importResult.data?.products_imported?.toString() || '0'
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to import products. Please check your data and try again.'
        };
      }
      
    } catch (error) {
      console.error('Products import error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error importing products. Please try again.'
      };
    }
  }
  
  private handleDataSyncMenu(userId: string): DataSyncSkillResult {
    return {
      success: true,
      response_type: 'template',
      template_id: 'data_sync_menu_v1',
      template_params: {
        user_id: userId
      }
    };
  }
  
  // Helper methods
  private extractCategory(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('pharmacy') || msg.includes('medicine')) return 'pharmacy';
    if (msg.includes('hardware') || msg.includes('construction')) return 'hardware_store';
    if (msg.includes('restaurant') || msg.includes('bar') || msg.includes('food')) return 'restaurant';
    if (msg.includes('hotel') || msg.includes('lodging')) return 'lodging';
    if (msg.includes('all') || msg.includes('everything')) return 'all';
    return null;
  }
  
  private extractLocation(message: string): string | null {
    if (message.toLowerCase().includes('kigali')) return 'Kigali, Rwanda';
    if (message.toLowerCase().includes('butare')) return 'Butare, Rwanda';
    if (message.toLowerCase().includes('musanze')) return 'Musanze, Rwanda';
    if (message.toLowerCase().includes('rwanda')) return 'Rwanda';
    return null;
  }
  
  private extractUrl(message: string): string | null {
    const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[1] : null;
  }
  
  private extractDataType(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('business') || msg.includes('company')) return 'businesses';
    if (msg.includes('product') || msg.includes('inventory')) return 'products';
    if (msg.includes('contact') || msg.includes('customer')) return 'contacts';
    if (msg.includes('vehicle') || msg.includes('car')) return 'vehicles';
    if (msg.includes('property') || msg.includes('real estate')) return 'properties';
    return null;
  }
  
  private extractContactSource(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('whatsapp')) return 'whatsapp';
    if (msg.includes('google')) return 'google_contacts';
    if (msg.includes('phone')) return 'phone_contacts';
    if (msg.includes('csv') || msg.includes('file')) return 'csv';
    return null;
  }
  
  private extractProductSource(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('pos') || msg.includes('point of sale')) return 'pos_system';
    if (msg.includes('supplier') || msg.includes('vendor')) return 'supplier_catalog';
    if (msg.includes('shopify') || msg.includes('woocommerce') || msg.includes('ecommerce')) return 'ecommerce_platform';
    if (msg.includes('csv') || msg.includes('manual')) return 'csv';
    return null;
  }
}

export const dataSyncSkill = new DataSyncSkill();