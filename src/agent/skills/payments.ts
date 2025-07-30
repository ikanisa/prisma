// Payments Skill - QR generation, money transfer, payment history
import { z } from 'zod';

export interface PaymentsContext {
  userId: string;
  phone: string;
  amount?: number;
  recipient?: string;
  reference?: string;
}

export const PaymentsSkill = {
  name: 'payments',
  description: 'Handle payment operations, QR generation, and money transfers',
  
  tools: {
    generate_qr: {
      name: 'generate_qr',
      description: 'Generate QR code for payment',
      parameters: z.object({
        amount: z.number().min(100).max(1000000),
        currency: z.string().default('RWF'),
        reference: z.string().optional(),
        description: z.string().optional()
      }),
      execute: async (params: any, context: PaymentsContext) => {
        return {
          qr_code_url: `https://api.qr-server.com/v1/create-qr-code/?size=300x300&data=PAY:${params.amount}:${context.phone}:${params.reference || 'payment'}`,
          payment_reference: params.reference || `PAY_${Date.now()}`,
          amount: params.amount,
          expires_in: 900 // 15 minutes
        };
      }
    },
    
    transfer_money: {
      name: 'transfer_money',
      description: 'Transfer money to another user',
      parameters: z.object({
        recipient_phone: z.string().min(10),
        amount: z.number().min(100).max(500000),
        message: z.string().optional()
      }),
      execute: async (params: any, context: PaymentsContext) => {
        // Simulate transfer processing
        return {
          transaction_id: `TXN_${Date.now()}`,
          status: 'pending',
          recipient: params.recipient_phone,
          amount: params.amount,
          fee: Math.ceil(params.amount * 0.01), // 1% fee
          estimated_completion: new Date(Date.now() + 60000).toISOString()
        };
      }
    },
    
    check_balance: {
      name: 'check_balance',
      description: 'Check user account balance',
      parameters: z.object({}),
      execute: async (params: any, context: PaymentsContext) => {
        // Simulate balance check
        return {
          balance: Math.floor(Math.random() * 100000) + 1000,
          currency: 'RWF',
          last_updated: new Date().toISOString()
        };
      }
    }
  },
  
  // Intent patterns for fast routing
  intents: [
    { pattern: /pay|payment|send money|transfer/i, confidence: 0.9 },
    { pattern: /qr|code|scan/i, confidence: 0.8 },
    { pattern: /balance|check.*money|how much/i, confidence: 0.8 }
  ],
  
  // Response templates
  templates: {
    qr_generated: {
      text: "🔗 Payment QR Code Generated!\n\nAmount: {amount} RWF\nReference: {reference}\n\nScan the QR code or share this link:\n{qr_code_url}\n\n⏰ Expires in 15 minutes",
      buttons: [
        { id: 'share_qr', title: 'Share QR Code' },
        { id: 'cancel_payment', title: 'Cancel' }
      ]
    }
  }
};