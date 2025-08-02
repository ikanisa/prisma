import { supabaseClient } from "./client.ts";
export class MessageProcessor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getOrCreateUser(whatsappNumber: string): Promise<{ user: any, isNewUser: boolean }> {
    try {
      // Try to find existing user
      const { data: existingUser, error: selectError } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone', whatsappNumber)
        .single();

      if (existingUser && !selectError) {
        return { user: existingUser, isNewUser: false };
      }

      // Create new user if not found
      const { data: newUser, error: insertError } = await this.supabase
        .from('users')
        .insert({
          phone: whatsappNumber,
          momo_code: whatsappNumber, // Default momo code is same as WhatsApp number
          credits: 100, // Default welcome credits
          created_at: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        throw new Error('Failed to create user');
      }

      console.log(`🆕 New user created: ${whatsappNumber}`);
      return { user: newUser, isNewUser: true };
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  }

  parseProductMessage(message: string): { name: string; stock: number; price: number; unit?: string } | null {
    // Parse "add beans 30kg 1500" format
    const match = message.match(/^add\s+(\w+)\s+(\d+)(\w+)?\s+(\d+)$/i);
    if (!match) return null;

    return {
      name: match[1],
      stock: parseInt(match[2]),
      unit: match[3] || 'units',
      price: parseInt(match[4])
    };
  }

  formatProductCard(product: any): string {
    return `📦 ${product.name}\n💰 ${product.price} RWF${product.unit ? ` per ${product.unit}` : ''}\n📊 Stock: ${product.stock || 'Available'}`;
  }

  formatPaymentResponse(paymentData: any): string {
    return `✅ Payment request ${paymentData.amount} RWF
USSD: ${paymentData.ussd_code}
${paymentData.ussd_link ? `Link: ${paymentData.ussd_link}` : ''}
${paymentData.qr_code_url ? `QR: ${paymentData.qr_code_url}` : ''}`;
  }

  truncateMessage(message: string, maxLength: number = 200): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }
}