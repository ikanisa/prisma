export interface WhatsAppTemplate {
  id: string;
  name: string;
  domain: string;
  intent: string;
  version: string;
  template_type: 'interactive' | 'text' | 'flow' | 'media';
  content: any;
  params?: string[];
}

export interface FlowTemplate extends WhatsAppTemplate {
  flow_id: string;
  flow_token: string;
}

// Payment Templates
const PAYMENT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'payment_menu_v1',
    name: 'Payment Menu',
    domain: 'payments',
    intent: 'menu',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '💰 easyMO Payments\n\nHow can I help you today?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'get_paid',
              title: '📱 Get Paid'
            }
          },
          {
            type: 'reply', 
            reply: {
              id: 'pay_someone',
              title: '💸 Pay Someone'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'payment_history',
              title: '📋 History'
            }
          }
        ]
      }
    }
  },
  {
    id: 'qr_ready_v1',
    name: 'QR Code Ready',
    domain: 'payments',
    intent: 'get_paid',
    version: '1.0',
    template_type: 'media',
    content: {
      type: 'image',
      caption: '🎯 Your payment QR is ready!\n\n💰 Amount: {{amount}} RWF\n📱 Show this to the payer\n\n⚡ Payment will be instant!'
    },
    params: ['amount']
  },
  {
    id: 'payment_confirm_v1',
    name: 'Payment Confirmation',
    domain: 'payments', 
    intent: 'confirm_paid',
    version: '1.0',
    template_type: 'text',
    content: {
      text: '✅ Payment received!\n\n💰 {{amount}} RWF\n📱 From: {{phone}}\n🕐 {{timestamp}}\n\nThank you for using easyMO! 🙏'
    },
    params: ['amount', 'phone', 'timestamp']
  }
];

// Transport Templates  
const MOTO_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'driver_menu_v1',
    name: 'Driver Menu',
    domain: 'moto',
    intent: 'menu',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '🏍️ easyMO Driver\n\nReady to earn today?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'driver_online',
              title: '🟢 Go Online'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'driver_offline', 
              title: '🔴 Go Offline'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'trip_history',
              title: '📋 Trip History'
            }
          }
        ]
      }
    }
  },
  {
    id: 'passenger_menu_v1',
    name: 'Passenger Menu',
    domain: 'moto',
    intent: 'menu',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '🚗 easyMO Ride\n\nWhere would you like to go?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'book_ride',
              title: '🏍️ Book Ride'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'nearby_drivers',
              title: '📍 Nearby Drivers'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'ride_history',
              title: '📋 My Rides'
            }
          }
        ]
      }
    }
  },
  {
    id: 'trip_created_v1',
    name: 'Trip Created',
    domain: 'moto',
    intent: 'driver_create_trip',
    version: '1.0',
    template_type: 'text',
    content: {
      text: '🎯 You\'re now online!\n\n📍 Pickup: {{location}}\n💰 Estimate: {{price}} RWF\n\n🔔 I\'ll notify you when passengers book!'
    },
    params: ['location', 'price']
  }
];

// Listings Templates
const LISTINGS_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'listings_menu_v1',
    name: 'Listings Menu',
    domain: 'listings',
    intent: 'menu',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '🏠 easyMO Listings\n\nWhat are you looking for?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'find_property',
              title: '🏠 Find Property'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'find_vehicle',
              title: '🚗 Find Vehicle'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'list_item',
              title: '📝 List Item'
            }
          }
        ]
      }
    }
  }
];

// Commerce Templates
const COMMERCE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'commerce_menu_v1',
    name: 'Commerce Menu',
    domain: 'commerce',
    intent: 'menu',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '🛒 easyMO Shop\n\nWhat do you need today?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'order_pharmacy',
              title: '💊 Pharmacy'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'order_hardware',
              title: '🔧 Hardware'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'order_bar',
              title: '🍺 Bar & Restaurant'
            }
          }
        ]
      }
    }
  }
];

// Support Templates
const SUPPORT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'help_menu_v1',
    name: 'Help Menu',
    domain: 'admin_support',
    intent: 'help',
    version: '1.0',
    template_type: 'interactive',
    content: {
      type: 'button',
      body: {
        text: '❓ easyMO Support\n\nHow can we help you?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'tech_support',
              title: '🔧 Technical Issue'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'billing_support',
              title: '💰 Billing Question'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'human_agent',
              title: '👤 Talk to Human'
            }
          }
        ]
      }
    }
  },
  {
    id: 'handoff_created_v1',
    name: 'Handoff Created',
    domain: 'admin_support',
    intent: 'handoff_request',
    version: '1.0',
    template_type: 'text',
    content: {
      text: '👤 Connecting you to a human agent...\n\n🎫 Ticket: {{ticket_id}}\n⏱️ Expected wait: {{wait_time}}\n\nPlease wait while we find someone to help you.'
    },
    params: ['ticket_id', 'wait_time']
  }
];

// Combine all templates
export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  ...PAYMENT_TEMPLATES,
  ...MOTO_TEMPLATES,
  ...LISTINGS_TEMPLATES,
  ...COMMERCE_TEMPLATES,
  ...SUPPORT_TEMPLATES
];

export class TemplateRegistry {
  private templates: Map<string, WhatsAppTemplate> = new Map();
  
  constructor() {
    // Load templates into registry
    WHATSAPP_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }
  
  getTemplate(templateId: string): WhatsAppTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  getTemplatesByDomain(domain: string): WhatsAppTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.domain === domain);
  }
  
  getTemplatesByIntent(domain: string, intent: string): WhatsAppTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.domain === domain && t.intent === intent
    );
  }
  
  renderTemplate(templateId: string, params: Record<string, string> = {}): any {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    let content = JSON.stringify(template.content);
    
    // Replace template parameters
    Object.entries(params).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    return JSON.parse(content);
  }
  
  addTemplate(template: WhatsAppTemplate): void {
    this.templates.set(template.id, template);
  }
  
  updateTemplate(templateId: string, updates: Partial<WhatsAppTemplate>): void {
    const existing = this.templates.get(templateId);
    if (existing) {
      this.templates.set(templateId, { ...existing, ...updates });
    }
  }
  
  listTemplates(): WhatsAppTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Get appropriate template for domain/intent combination
   */
  getBestTemplate(domain: string, intent: string, templateType?: string): WhatsAppTemplate | undefined {
    const candidates = this.getTemplatesByIntent(domain, intent);
    
    if (templateType) {
      const filtered = candidates.filter(t => t.template_type === templateType);
      if (filtered.length > 0) return filtered[0];
    }
    
    return candidates[0];
  }
}

export const templateRegistry = new TemplateRegistry();