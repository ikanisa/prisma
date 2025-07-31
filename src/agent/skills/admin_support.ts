// Admin Support Skill - Customer service and admin operations
import { z } from 'zod';

export interface AdminSupportContext {
  userId: string;
  phone: string;
  userType?: 'customer' | 'driver' | 'vendor' | 'admin';
}

export const AdminSupportSkill = {
  name: 'admin_support',
  description: 'Handle customer support, tickets, and administrative operations',
  
  tools: {
    create_ticket: {
      name: 'create_ticket',
      description: 'Create a support ticket',
      parameters: z.object({
        category: z.enum(['payment', 'ride', 'order', 'technical', 'account', 'other']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
        subject: z.string(),
        description: z.string()
      }),
      execute: async (params: any, context: AdminSupportContext) => {
        return {
          ticket_id: `TKT_${Date.now()}`,
          category: params.category,
          priority: params.priority,
          subject: params.subject,
          status: 'open',
          reference_number: `REF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
        };
      }
    }
  },
  
  intents: [
    { pattern: /help|support|problem|issue|complaint/i, confidence: 0.9 },
    { pattern: /ticket|report|contact.*admin/i, confidence: 0.8 }
  ],
  
  templates: {
    ticket_created: {
      text: "🎫 Support Ticket Created\n\nTicket ID: {ticket_id}\nReference: {reference_number}\nCategory: {category}\n\nOur team will respond soon!",
      buttons: [
        { id: 'check_status', title: 'Check Status' },
        { id: 'add_details', title: 'Add Details' }
      ]
    }
  }
};