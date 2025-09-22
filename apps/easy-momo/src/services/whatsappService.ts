import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  webhookUrl: string;
}

export const whatsappService = {
  async sendTemplate(to: string, template: any) {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
        body: {
          action: 'send_message',
          to,
          template
        }
      });

      if (error) {
        console.error('WhatsApp send error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('WhatsApp service error:', error);
      throw error;
    }
  },

  async sendGetPaidOptions(to: string) {
    const template = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "How would you like to get paid? 💰"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "add_money",
                title: "💵 Add Amount"
              }
            },
            {
              type: "reply",
              reply: {
                id: "generate_qr",
                title: "📱 Generate QR"
              }
            }
          ]
        }
      }
    };

    return this.sendTemplate(to, template);
  },

  async sendAmountOptions(to: string, amount: number) {
    const template = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `I see you mentioned ${amount.toLocaleString()} RWF 💰\n\nWhat would you like to do?`
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `pay_${amount}`,
                title: `💸 Pay ${amount}`
              }
            },
            {
              type: "reply",
              reply: {
                id: `get_paid_${amount}`,
                title: `💳 Get Paid ${amount}`
              }
            }
          ]
        }
      }
    };

    return this.sendTemplate(to, template);
  },

  async sendQRCode(to: string, qrCodeUrl: string, amount: string) {
    const template = {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: qrCodeUrl,
        caption: `💳 Your QR code for ${parseInt(amount).toLocaleString()} RWF is ready!\n\nShow this to the payer to complete the transaction.`
      }
    };

    return this.sendTemplate(to, template);
  },

  detectIntent(message: string): { intent: string; amount?: number; confidence: number } {
    const text = message.toLowerCase().trim();
    
    // Get paid intent
    if (text.includes('get paid') || text.includes('request money') || text.includes('payment request')) {
      return { intent: 'get_paid', confidence: 0.9 };
    }

    // Amount detection
    const amountMatch = text.match(/(\d{1,10})/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[1]);
      if (amount >= 100 && amount <= 1000000) {
        return { intent: 'amount_mentioned', amount, confidence: 0.8 };
      }
    }

    // Pay intent
    if (text.includes('pay') || text.includes('send money')) {
      return { intent: 'pay', confidence: 0.7 };
    }

    // Greeting
    if (text.includes('hello') || text.includes('hi') || text.includes('start')) {
      return { intent: 'greeting', confidence: 0.6 };
    }

    return { intent: 'unknown', confidence: 0.1 };
  }
};