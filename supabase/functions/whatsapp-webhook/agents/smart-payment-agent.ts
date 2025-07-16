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

      const amount = this.extractAmount(message);
      
      if (!amount || amount <= 0) {
        const systemMessage = `You are a payment assistant for easyMO. The user sent "${message}" but it's not a valid payment amount. 
        
        Guide them to send a valid amount like:
        - 5000 (for 5000 RWF)
        - 1500 (for 1500 RWF)
        
        Be helpful and explain the format. Keep response under 200 characters.`;

        return await this.openAI.generateResponse(message, systemMessage, context);
      }

      if (amount > 1000000) {
        return "Maximum payment amount is 1,000,000 RWF. Please enter a smaller amount. 💳";
      }

      // Generate payment using edge function
      const paymentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: amount
        })
      });

      if (!paymentResponse.ok) {
        console.error('❌ Payment generation failed:', await paymentResponse.text());
        
        const systemMessage = `The payment system is temporarily unavailable. Apologize to the user and ask them to try again in a few minutes. Be empathetic and helpful. Keep response under 200 characters.`;
        
        return await this.openAI.generateResponse(message, systemMessage, context);
      }

      const paymentData = await paymentResponse.json();
      
      // AI-enhanced payment response
      const systemMessage = `You are confirming a successful payment request generation. The payment details are:
      - Amount: ${amount} RWF
      - USSD Code: ${paymentData.ussd_code}
      - USSD Link: ${paymentData.ussd_link || 'Not available'}
      - QR Code: ${paymentData.qr_code_url || 'Not available'}
      
      Create a friendly confirmation message with payment instructions. Include the USSD code prominently. Use emojis. Keep under 200 characters.`;

      const aiResponse = await this.openAI.generateResponse(
        `Payment request for ${amount} RWF generated successfully`, 
        systemMessage, 
        []
      );

      // Ensure critical payment info is included
      return `✅ ${aiResponse}\n\nUSSD: ${paymentData.ussd_code}${paymentData.qr_code_url ? `\nQR: ${paymentData.qr_code_url}` : ''}`;

    } catch (error) {
      console.error('❌ Smart Payment Agent error:', error);
      return "Sorry, I'm having trouble processing your payment right now. Please try again in a moment! 💳";
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