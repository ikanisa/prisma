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
      const amount = parseFloat(message.trim());
      
      if (isNaN(amount) || amount <= 0) {
        return "Please enter a valid amount (e.g., 5000)";
      }

      if (amount > 1000000) {
        return "Maximum amount is 1,000,000 RWF. Please enter a smaller amount.";
      }

      // Call generate-payment edge function
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
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

      if (!response.ok) {
        console.error('Payment generation failed:', await response.text());
        return "Sorry, I couldn't generate your payment. Please try again.";
      }

      const paymentData = await response.json();
      return this.processor.formatPaymentResponse(paymentData);

    } catch (error) {
      console.error('PaymentAgent error:', error);
      return "Sorry, there was an error processing your payment request. Please try again.";
    }
  }
}