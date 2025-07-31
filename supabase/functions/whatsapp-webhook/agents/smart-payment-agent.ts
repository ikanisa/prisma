export class SmartPaymentAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[], 
    intentAnalysis?: any
  ): Promise<string> {
    try {
      console.log('💰 Processing with Smart Payment Agent');

      const lowercaseMessage = message.toLowerCase().trim();

      // Handle "want to pay" intent - send QR scanner button
      if (lowercaseMessage.includes('pay') && !lowercaseMessage.includes('get paid') && !lowercaseMessage.includes('receive')) {
        return this.handlePaySomeone(message, user);
      }

      // Handle "get paid" or "receive money" intent
      if (lowercaseMessage.includes('get paid') || lowercaseMessage.includes('receive money') || lowercaseMessage.includes('receive payment')) {
        const amount = this.extractAmount(message);
        if (amount) {
          return await this.generatePaymentQR(amount, user, whatsappNumber);
        } else {
          return "💰 I can help you get paid! Please tell me the amount you want to receive. For example: 'I want to get paid 1000 RWF'";
        }
      }

      // Handle direct amount for receiving payments (default behavior)
      const amount = this.extractAmount(message);
      if (amount && amount > 0) {
        if (amount > 1000000) {
          return "⚠️ Amount too high. Maximum payment is 1,000,000 RWF per transaction.";
        }
        return await this.generatePaymentQR(amount, user, whatsappNumber);
      }

      // No amount detected - provide payment menu
      const systemMessage = `You are a payment assistant for easyMO. The user sent "${message}" but it's not clear what they want. 
      
      Guide them with these options:
      - "Get paid [amount]" - to receive money
      - "Pay someone" - to scan QR or send money
      - Just send an amount number for payment QR
      
      Be helpful and explain the options clearly. Keep response under 200 characters.`;

      return await this.openAI.generateResponse(message, systemMessage, context);

    } catch (error) {
      console.error('❌ Smart Payment Agent error:', error);
      return "Sorry, I'm having trouble processing your payment right now. Please try again in a moment! 💳";
    }
  }

  private handlePaySomeone(message: string, user: any): string {
    // Send QR scanner button for mobile users
    const scannerUrl = `https://2b2aaaed-6798-4998-b11a-17cc8aad5935.lovableproject.com/scan-to-pay`;
    
    return `📱 **Ready to Pay?**

You can pay in two ways:

1️⃣ **Scan QR Code** - Tap the link below to open camera scanner
2️⃣ **Send Money** - Tell me: amount and phone number (e.g., "Send 5000 to 0788123456")

🔗 *Tap here to scan QR code:*
${scannerUrl}

*This will open your camera to scan any payment QR code*

Or just tell me the amount and phone number to send money directly!`;
  }

  private async generatePaymentQR(amount: number, user: any, phone: string): Promise<string> {
    try {
      // Generate payment using edge function
      const paymentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: amount,
          phone: phone
        })
      });

      if (!paymentResponse.ok) {
        console.error('❌ Payment generation failed:', await paymentResponse.text());
        return "Sorry, I couldn't generate your payment QR code right now. Please try again in a moment! 💳";
      }

      const paymentData = await paymentResponse.json();
      
      // AI-enhanced payment response
      const systemMessage = `You are confirming a successful payment QR generation for receiving money. The payment details are:
      - Amount: ${amount} RWF
      - USSD Code: ${paymentData.ussd_code}
      - QR Code: ${paymentData.qr_code_url || 'Generated'}
      
      Create a friendly confirmation message explaining they can share the QR or USSD code with the payer. Use emojis. Keep under 200 characters.`;

      const aiResponse = await this.openAI.generateResponse(
        `Payment QR for ${amount} RWF generated successfully`, 
        systemMessage, 
        []
      );

      // Ensure critical payment info is included
      return `✅ ${aiResponse}\n\n💰 Amount: ${amount} RWF\n📱 USSD: ${paymentData.ussd_code}${paymentData.qr_code_url ? `\n📄 QR Code: ${paymentData.qr_code_url}` : ''}`;

    } catch (error) {
      console.error('❌ Payment QR generation error:', error);
      return "Sorry, I'm having trouble generating your payment QR code right now. Please try again in a moment! 💳";
    }
  }

  private extractAmount(message: string): number | null {
    const trimmed = message.trim();
    
    // Direct number
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Extract number from text like "pay 5000" or "5000 rwf"
    const match = trimmed.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }

    return null;
  }
}