import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';

export interface CommerceSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  template_params?: Record<string, string>;
}

export class CommerceSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    console.log(`CommerceSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'order_pharmacy':
        return this.handlePharmacyOrder(message, userId, slots);
      case 'order_hardware':
        return this.handleHardwareOrder(message, userId, slots);
      case 'order_bar':
        return this.handleBarOrder(message, userId, slots);
      case 'see_menu':
        return this.handleSeeMenu(message, userId, slots);
      case 'check_order_status':
        return this.handleOrderStatus(message, userId, slots);
      default:
        return this.handleCommerceMenu(userId);
    }
  }
  
  private async handlePharmacyOrder(message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    try {
      const medication = this.extractMedication(message) || slots.medication;
      const location = this.extractLocation(message) || slots.location;
      
      if (!medication) {
        return {
          success: true,
          response_type: 'text',
          message: '💊 What medication do you need?\n\nYou can:\n• Type the medicine name\n• Upload a prescription photo\n• Browse categories (pain relief, vitamins, etc.)'
        };
      }
      
      // Search for pharmacy products
      const searchResult = await toolRegistry.executeTool('product_search', {
        category: 'pharmacy',
        query: medication,
        location: location?.name || 'Kigali',
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.products?.length > 0) {
        const products = searchResult.data.products.slice(0, 3);
        const productText = products.map((product: any, index: number) => 
          `${index + 1}. ${product.name}\n💰 ${product.price} RWF\n🏪 ${product.pharmacy_name}\n📍 ${product.distance}km away`
        ).join('\n\n');
        
        return {
          success: true,
          response_type: 'text',
          message: `💊 Found ${medication}:\n\n${productText}\n\nReply with a number to add to cart, or type another medicine.`
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: `💊 "${medication}" not found nearby.\n\nTry:\n• Different spelling\n• Generic name\n• Browse categories\n• Upload prescription photo`
        };
      }
      
    } catch (error) {
      console.error('Pharmacy order error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching medicines. Please try again.'
      };
    }
  }
  
  private async handleHardwareOrder(message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    try {
      const item = this.extractHardwareItem(message) || slots.item;
      const category = this.extractHardwareCategory(message) || slots.category;
      
      if (!item && !category) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'hardware_categories_v1',
          template_params: {
            user_id: userId
          }
        };
      }
      
      const searchResult = await toolRegistry.executeTool('product_search', {
        category: 'hardware',
        query: item || category,
        limit: 5
      });
      
      if (searchResult.success && searchResult.data?.products?.length > 0) {
        const products = searchResult.data.products.slice(0, 3);
        const productText = products.map((product: any, index: number) => 
          `${index + 1}. ${product.name}\n💰 ${product.price} RWF\n🛠️ ${product.brand || 'Various brands'}\n🏪 ${product.store_name}`
        ).join('\n\n');
        
        return {
          success: true,
          response_type: 'text',
          message: `🛠️ Hardware items found:\n\n${productText}\n\nReply with a number to add to cart, or describe what you need.`
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: `🛠️ "${item || category}" not found.\n\nTry:\n• Different keywords\n• Browse categories\n• Describe your project needs`
        };
      }
      
    } catch (error) {
      console.error('Hardware order error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error searching hardware items. Please try again.'
      };
    }
  }
  
  private async handleBarOrder(message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    try {
      const tableCode = this.extractTableCode(message) || slots.table_code;
      const barName = this.extractBarName(message) || slots.bar_name;
      
      if (!tableCode && !barName) {
        return {
          success: true,
          response_type: 'text',
          message: '🍻 Welcome to easyMO Bar!\n\nTo order:\n• Scan QR code on your table\n• Type table number (e.g. "Table 5")\n• Name the bar/restaurant'
        };
      }
      
      // Get menu for the table/bar
      const menuResult = await toolRegistry.executeTool('menu_fetch', {
        table_code: tableCode,
        bar_name: barName
      });
      
      if (menuResult.success && menuResult.data?.menu?.length > 0) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'bar_menu_v1',
          template_params: {
            bar_name: menuResult.data.bar_name || 'Bar',
            table_code: tableCode || '',
            item_count: menuResult.data.menu.length.toString()
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '🍻 Could not load menu. Please check table code or try again.'
        };
      }
      
    } catch (error) {
      console.error('Bar order error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error accessing bar menu. Please try again.'
      };
    }
  }
  
  private async handleSeeMenu(message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    try {
      const businessType = this.extractBusinessType(message) || slots.business_type;
      const location = this.extractLocation(message) || slots.location;
      
      if (!businessType) {
        return {
          success: true,
          response_type: 'text',
          message: '📋 Which menu would you like to see?\n\n💊 Pharmacy (medicines, health products)\n🛠️ Hardware (tools, materials)\n🍻 Bar/Restaurant (food & drinks)\n\nChoose your option.'
        };
      }
      
      const menuResult = await toolRegistry.executeTool('menu_fetch', {
        business_type: businessType,
        location: location?.name || 'Kigali'
      });
      
      if (menuResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: `${businessType}_menu_v1`,
          template_params: {
            location: location?.name || 'Kigali',
            business_count: menuResult.data?.businesses?.length?.toString() || '0'
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: `❌ No ${businessType} menus available in your area right now.`
        };
      }
      
    } catch (error) {
      console.error('Menu fetch error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error loading menus. Please try again.'
      };
    }
  }
  
  private async handleOrderStatus(message: string, userId: string, slots: Record<string, any>): Promise<CommerceSkillResult> {
    try {
      const orderId = this.extractOrderId(message) || slots.order_id;
      
      if (!orderId) {
        // Get recent orders for user
        const ordersResult = await toolRegistry.executeTool('order_history', {
          user_id: userId,
          limit: 5
        });
        
        if (ordersResult.success && ordersResult.data?.orders?.length > 0) {
          const orders = ordersResult.data.orders.slice(0, 3);
          const orderText = orders.map((order: any, index: number) => 
            `${index + 1}. Order #${order.id.slice(-6)}\n🏪 ${order.business_name}\n📦 ${order.status}\n💰 ${order.total} RWF`
          ).join('\n\n');
          
          return {
            success: true,
            response_type: 'text',
            message: `📦 Your recent orders:\n\n${orderText}\n\nReply with a number for details, or provide order ID.`
          };
        } else {
          return {
            success: true,
            response_type: 'text',
            message: '📦 No recent orders found.\n\nStart shopping:\n💊 Pharmacy\n🛠️ Hardware\n🍻 Bar/Restaurant'
          };
        }
      } else {
        const statusResult = await toolRegistry.executeTool('order_status', {
          order_id: orderId,
          user_id: userId
        });
        
        if (statusResult.success) {
          return {
            success: true,
            response_type: 'template',
            template_id: 'order_status_v1',
            template_params: {
              order_id: orderId,
              status: statusResult.data?.status || 'unknown',
              eta: statusResult.data?.estimated_delivery || 'TBD'
            }
          };
        } else {
          return {
            success: false,
            response_type: 'text',
            message: `❌ Order ${orderId} not found or access denied.`
          };
        }
      }
      
    } catch (error) {
      console.error('Order status error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error checking order status. Please try again.'
      };
    }
  }
  
  private handleCommerceMenu(userId: string): CommerceSkillResult {
    return {
      success: true,
      response_type: 'template',
      template_id: 'commerce_menu_v1',
      template_params: {
        user_id: userId
      }
    };
  }
  
  // Helper methods
  private extractMedication(message: string): string | null {
    const msg = message.toLowerCase();
    // Common medications in Rwanda
    if (msg.includes('paracetamol') || msg.includes('panadol')) return 'paracetamol';
    if (msg.includes('ibuprofen') || msg.includes('brufen')) return 'ibuprofen';
    if (msg.includes('amoxicillin')) return 'amoxicillin';
    if (msg.includes('vitamin')) return 'vitamins';
    if (msg.includes('cough') || msg.includes('syrup')) return 'cough syrup';
    if (msg.includes('malaria')) return 'antimalarial';
    return null;
  }
  
  private extractHardwareItem(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('cement')) return 'cement';
    if (msg.includes('iron') || msg.includes('rebar')) return 'iron bars';
    if (msg.includes('paint')) return 'paint';
    if (msg.includes('nail')) return 'nails';
    if (msg.includes('hammer')) return 'hammer';
    if (msg.includes('drill')) return 'drill';
    return null;
  }
  
  private extractHardwareCategory(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('construction') || msg.includes('building')) return 'construction';
    if (msg.includes('electrical')) return 'electrical';
    if (msg.includes('plumbing')) return 'plumbing';
    if (msg.includes('tools')) return 'tools';
    if (msg.includes('paint')) return 'painting';
    return null;
  }
  
  private extractTableCode(message: string): string | null {
    const tableMatch = message.match(/table\s*(\d+)/i);
    return tableMatch ? tableMatch[1] : null;
  }
  
  private extractBarName(message: string): string | null {
    // Simple bar name extraction - could be enhanced
    if (message.toLowerCase().includes('heaven')) return 'Heaven Restaurant';
    if (message.toLowerCase().includes('kigali')) return 'Kigali Bar';
    return null;
  }
  
  private extractBusinessType(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('pharmacy') || msg.includes('medicine')) return 'pharmacy';
    if (msg.includes('hardware') || msg.includes('construction')) return 'hardware';
    if (msg.includes('bar') || msg.includes('restaurant') || msg.includes('food')) return 'bar';
    return null;
  }
  
  private extractLocation(message: string): any {
    if (message.toLowerCase().includes('kigali')) {
      return { lat: -1.9441, lng: 30.0619, name: 'Kigali' };
    }
    if (message.toLowerCase().includes('nyamirambo')) {
      return { lat: -1.9706, lng: 30.0661, name: 'Nyamirambo' };
    }
    return null;
  }
  
  private extractOrderId(message: string): string | null {
    const orderMatch = message.match(/order\s*#?([a-zA-Z0-9-]+)/i);
    if (orderMatch) return orderMatch[1];
    
    // UUID pattern
    const uuidMatch = message.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    return uuidMatch ? uuidMatch[0] : null;
  }
}

export const commerceSkill = new CommerceSkill();