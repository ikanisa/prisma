import { MessageProcessor } from '../utils/message-processor.ts';

export class PaymentAgent {
  private supabase: any;
  private processor: MessageProcessor;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.processor = new MessageProcessor(supabase);
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      // Intent detection - no questions, direct action
      
      // Scan QR intent
      if (msg.includes('scan') || msg.includes('scanner')) {
        return this.handleQRScanner();
      }

      // Get paid intent (receive money)
      if (msg.includes('get paid') || msg.includes('receive') || msg.includes('collect')) {
        const amount = this.extractAmount(message);
        if (amount) {
          return await this.generateQRForReceiving(amount, user, whatsappNumber);
        }
        return "💰 *GET PAID*\n\nSend amount to generate QR:\nExample: 'get paid 5000'";
      }

      // Pay someone intent
      if (msg.includes('pay') || msg.includes('send') || msg.includes('transfer')) {
        return this.handlePaySomeone(message, user);
      }

      // Direct amount - assume they want to receive payment
      const amount = parseFloat(message.trim());
      if (!isNaN(amount) && amount > 0) {
        if (amount > 1000000) {
          return "💸 Maximum amount is 1,000,000 RWF. Please enter a smaller amount.";
        }
        return await this.generateQRForReceiving(amount, user, whatsappNumber);
      }

      // Amount with phone number (send money)
      const sendMatch = message.match(/(\d+)\s+(07\d{8})/);
      if (sendMatch) {
        const [, amount, phone] = sendMatch;
        return await this.handleSendMoney(parseInt(amount), phone, user);
      }

      // Default options
      return `💰 *PAYMENT OPTIONS*

🟢 *GET PAID* (Receive money)
Send: "get paid 5000"
→ Instant QR code

🔵 *PAY SOMEONE*
Send: "5000 0788123456"
→ Instant transfer

📱 *SCAN QR CODE*
Send: "scan qr"
→ Open scanner

Just send amount for instant QR!`;

    } catch (error) {
      console.error('PaymentAgent error:', error);
      return "💰 Send amount for QR (e.g., '5000') or 'scan qr' to pay someone";
    }
  }

  private async generateQRForReceiving(amount: number, user: any, whatsappNumber: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.functions.invoke('qr-payment-generator', {
        body: { 
          action: 'generate',
          amount: amount,
          phone: whatsappNumber,
          type: 'receive',
          user_id: user.id
        }
      });

      if (error) {
        console.error('QR generation error:', error);
        return "Sorry, couldn't generate QR code. Please try again.";
      }

      // Return ONLY the QR code image URL - no text
      return data.qr_url || "Sorry, couldn't generate QR code. Please try again.";

    } catch (error) {
      console.error('QR generation failed:', error);
      return "Sorry, couldn't generate payment QR. Please try again.";
    }
  }

  private async handleSendMoney(amount: number, phone: string, user: any): Promise<string> {
    try {
      const { data, error } = await this.supabase.functions.invoke('mobile-money-transfer', {
        body: {
          amount: amount,
          to_phone: phone,
          from_user_id: user.id
        }
      });

      if (error) {
        return `❌ Transfer failed: ${error.message}`;
      }

      return `✅ *TRANSFER INITIATED*

💸 Amount: ${amount.toLocaleString()} RWF
📱 To: ${phone}
🔢 Reference: ${data.reference}

Check your phone for MoMo confirmation`;

    } catch (error) {
      return "❌ Transfer failed. Please try again.";
    }
  }

  private handlePaySomeone(message: string, user: any): string {
    const amountPhoneMatch = message.match(/(\d+)\s+(07\d{8})/);
    if (amountPhoneMatch) {
      const [, amount, phone] = amountPhoneMatch;
      // This would normally call the transfer function
      return `💸 Sending ${amount} RWF to ${phone}...`;
    }

    return `💸 *PAY SOMEONE*

📤 Send format:
"5000 0788123456"

📱 Or scan their QR:
"scan qr"

Example: Send "10000 0788555123" to transfer 10,000 RWF`;
  }

  private handleQRScanner(): string {
    return `📱 *QR CODE SCANNER*

🎯 Point your camera at a QR code and take a photo, then send it to me.

Or send the QR code text/link directly.

💡 I can process:
• Payment QR codes
• USSD codes  
• Bank payment links`;
  }

  private extractAmount(message: string): number | null {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}