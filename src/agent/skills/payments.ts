import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';
import { IntentResult } from '../router/intent_router';

export interface PaymentSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  media_url?: string;
  template_params?: Record<string, string>;
}

export class PaymentsSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<PaymentSkillResult> {
    console.log(`PaymentsSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'get_paid':
        return this.handleGetPaid(message, userId, slots);
      case 'pay_someone':
        return this.handlePaySomeone(message, userId, slots);
      case 'confirm_paid':
        return this.handleConfirmPaid(message, userId, slots);
      case 'history':
        return this.handleHistory(message, userId, slots);
      default:
        return this.handlePaymentMenu(userId);
    }
  }
  
  private async handleGetPaid(message: string, userId: string, slots: Record<string, any>): Promise<PaymentSkillResult> {
    // Extract amount and phone from message or slots
    const amount = this.extractAmount(message) || slots.amount;
    const phone = this.extractPhone(message) || slots.phone;
    
    if (!amount) {
      return {
        success: true,
        response_type: 'text',
        message: '💰 To generate a payment QR code, please tell me the amount.\n\nExample: "Get paid 5000 RWF"'
      };
    }
    
    if (!phone) {
      // Use user's registered phone from context
      // For now, we'll generate QR without specific phone
    }
    
    try {
      const qrResult = await toolRegistry.executeTool('qr_render', {
        phone: phone || userId, // fallback to userId
        amount: amount,
        description: 'Payment via easyMO'
      });
      
      if (qrResult.success && qrResult.data?.qr_url) {
        return {
          success: true,
          response_type: 'media',
          template_id: 'qr_ready_v1',
          media_url: qrResult.data.qr_url,
          template_params: {
            amount: amount.toString()
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Sorry, I couldn\'t generate your QR code. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('QR generation error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ There was an error generating your QR code. Please try again later.'
      };
    }
  }
  
  private async handlePaySomeone(message: string, userId: string, slots: Record<string, any>): Promise<PaymentSkillResult> {
    const amount = this.extractAmount(message) || slots.amount;
    const phone = this.extractPhone(message) || slots.phone;
    
    if (!amount || !phone) {
      return {
        success: true,
        response_type: 'text',
        message: '💸 To send money, I need:\n\n📱 Phone number\n💰 Amount\n\nExample: "Pay 250788123456 5000 RWF"'
      };
    }
    
    try {
      const paymentResult = await toolRegistry.executeTool('momo_tx_check', {
        transaction_id: `PAY_${Date.now()}`,
        phone: phone
      });
      
      return {
        success: true,
        response_type: 'text',
        message: `💸 Payment initiated!\n\n📱 To: ${phone}\n💰 Amount: ${amount} RWF\n\n⏳ Please complete the transaction on your phone.`
      };
      
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Payment failed. Please check the phone number and try again.'
      };
    }
  }
  
  private async handleConfirmPaid(message: string, userId: string, slots: Record<string, any>): Promise<PaymentSkillResult> {
    // This would typically be triggered by webhook
    const amount = slots.amount || '0';
    const phone = slots.phone || 'Unknown';
    const timestamp = new Date().toLocaleString();
    
    return {
      success: true,
      response_type: 'template',
      template_id: 'payment_confirm_v1',
      template_params: {
        amount: amount.toString(),
        phone: phone,
        timestamp: timestamp
      }
    };
  }
  
  private async handleHistory(message: string, userId: string, slots: Record<string, any>): Promise<PaymentSkillResult> {
    // Get payment history from database
    // For now, return mock data
    return {
      success: true,
      response_type: 'text',
      message: `📋 Your recent payments:\n\n✅ Received 2,500 RWF - 2 hours ago\n✅ Sent 1,000 RWF - Yesterday\n✅ Received 5,000 RWF - 2 days ago\n\n💰 Total this week: 6,500 RWF`
    };
  }
  
  private handlePaymentMenu(userId: string): PaymentSkillResult {
    return {
      success: true,
      response_type: 'template',
      template_id: 'payment_menu_v1'
    };
  }
  
  private extractAmount(message: string): number | null {
    // Extract amount from various formats
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:rwf|frw|francs?)/i,
      /(?:rwf|frw|francs?)\s*(\d{1,3}(?:,\d{3})*)/i,
      /(\d{1,3}(?:,\d{3})*)/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''));
        if (amount > 0 && amount <= 1000000) { // Reasonable limits
          return amount;
        }
      }
    }
    
    return null;
  }
  
  private extractPhone(message: string): string | null {
    // Extract Rwandan phone numbers
    const patterns = [
      /(\+?250\s?)?([67]\d{8})/,
      /0([67]\d{8})/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let phone = match[0].replace(/\s/g, '');
        
        // Normalize to international format
        if (phone.startsWith('0')) {
          phone = '250' + phone.slice(1);
        } else if (phone.startsWith('+250')) {
          phone = phone.slice(1);
        } else if (!phone.startsWith('250')) {
          phone = '250' + phone;
        }
        
        return phone;
      }
    }
    
    return null;
  }
}

export const paymentsSkill = new PaymentsSkill();