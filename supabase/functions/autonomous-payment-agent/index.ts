import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse, analyzeIntent } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

class AutonomousPaymentAgent {
  async processPaymentRequest(phone: string, message: string): Promise<string> {
    console.log(`💰 Processing payment request from ${phone}: ${message}`);
    
    const messageText = message.toLowerCase().trim();
    
    // Detect payment intent
    if (messageText.includes('pay') || messageText.includes('payment') || /^\d+$/.test(messageText)) {
      return await this.handlePaymentFlow(phone, message);
    }
    
    // Detect QR code request
    if (messageText.includes('qr') || messageText.includes('code') || messageText.includes('scan')) {
      return await this.handleQRFlow(phone, message);
    }
    
    // Detect receive money intent
    if (messageText.includes('receive') || messageText.includes('get paid') || messageText.includes('collect')) {
      return await this.handleReceiveFlow(phone, message);
    }
    
    // Default payment guidance
    return this.getPaymentGuidance();
  }

  async handlePaymentFlow(phone: string, message: string): Promise<string> {
    // Extract amount from message
    const amount = this.extractAmount(message);
    
    if (!amount) {
      return `💰 *easyMO Payment Assistant*

Please send the amount you want to pay:
• Type amount: *5000* (for 5000 RWF)
• Or say: *pay 2500*

I'll generate USSD code + QR code for instant payment! 🚀`;
    }

    if (amount <= 0) {
      return "❌ Amount must be greater than 0 RWF. Please enter a valid amount.";
    }

    try {
      // Generate payment via edge function
      const paymentResponse = await supabase.functions.invoke('generate-payment', {
        body: {
          amount: amount,
          phone: phone,
          description: `easyMO Payment - ${amount} RWF`
        }
      });

      if (paymentResponse.error) {
        console.error('Payment generation error:', paymentResponse.error);
        return "❌ Sorry, I couldn't generate your payment. Please try again.";
      }

      const payment = paymentResponse.data;
      
      // Generate QR code for this payment
      const qrResponse = await supabase.functions.invoke('qr-render', {
        body: {
          text: payment.ussd_code,
          agent: 'payment',
          entity: 'ussd',
          id: payment.payment_id
        }
      });

      const qrUrl = qrResponse.data?.url || null;

      return `✅ *Payment Ready!*

💵 Amount: *${amount.toLocaleString()} RWF*
📱 USSD: *${payment.ussd_code}*

🔗 *Quick Pay:* ${payment.ussd_link}

${qrUrl ? `📱 *QR Code:* ${qrUrl}\n\n📸 Scan with MTN MoMo app or any banking app` : ''}

*How to pay:*
1️⃣ Tap the link above
2️⃣ Or dial: *${payment.ussd_code}*
3️⃣ Or scan QR code with mobile banking app

✨ Payment will be instant! Need help? Type *help*`;

    } catch (error) {
      console.error('Payment flow error:', error);
      return "❌ Something went wrong. Please try again or contact support.";
    }
  }

  async handleQRFlow(phone: string, message: string): Promise<string> {
    const messageText = message.toLowerCase();
    
    // Check if user wants to generate QR
    if (messageText.includes('generate') || messageText.includes('create') || messageText.includes('new')) {
      return `📱 *QR Code Generator*

To generate a payment QR code:
• Type the amount: *5000*
• Or say: *QR for 2500*

I'll create an instant QR code for MTN MoMo payment! 🚀

Need to scan a QR? Say *scan QR*`;
    }
    
    // Check if user wants to scan QR
    if (messageText.includes('scan')) {
      return await this.handleQRScan(phone);
    }
    
    // Extract amount for QR
    const amount = this.extractAmount(message);
    if (amount && amount > 0) {
      return await this.generateQROnly(phone, amount);
    }
    
    return `📱 *QR Code Assistant*

What would you like to do?

🔸 *Generate QR:* Type amount (e.g. *5000*)
🔸 *Scan QR:* Say *scan QR* and I'll guide you

QR codes work with all mobile banking apps! 📱✨`;
  }

  async handleQRScan(phone: string): Promise<string> {
    // Store scan session for this user
    await supabase.from('payment_sessions').upsert({
      phone_number: phone,
      session_type: 'qr_scan',
      status: 'waiting_for_qr',
      created_at: new Date().toISOString()
    });

    return `📸 *QR Code Scanner*

*How to use QR payment:*

1️⃣ *Open your mobile banking app*
   • MTN MoMo
   • Bank app with QR scanner
   
2️⃣ *Find QR scan option*
   • Usually in "Pay" or "Transfer" section
   
3️⃣ *Scan any easyMO QR code*
   • Restaurant/bar tables
   • Shop payment QRs
   • Driver payment QRs
   
4️⃣ *Confirm payment in your app*

💡 *Found a QR code?*
Take a photo and send it here - I can help decode it!

Need a payment QR instead? Type *generate QR*`;
  }

  async handleReceiveFlow(phone: string, message: string): Promise<string> {
    const amount = this.extractAmount(message);
    
    if (!amount) {
      return `💰 *Receive Payment*

How much do you want to receive?
• Type amount: *8000* (for 8000 RWF)
• Or say: *collect 5000*

I'll create a payment request others can pay instantly! 🚀`;
    }

    try {
      // Generate receive payment request
      const receiveResponse = await supabase.functions.invoke('generate-payment', {
        body: {
          amount: amount,
          phone: phone,
          description: `Collect ${amount} RWF - ${phone}`,
          type: 'receive'
        }
      });

      if (receiveResponse.error) {
        return "❌ Sorry, I couldn't create your payment request. Please try again.";
      }

      const payment = receiveResponse.data;
      
      // Generate QR for receive payment
      const qrResponse = await supabase.functions.invoke('qr-render', {
        body: {
          text: `PAY:${phone}:${amount}:${payment.payment_id}`,
          agent: 'payment',
          entity: 'receive',
          id: payment.payment_id
        }
      });

      const qrUrl = qrResponse.data?.url || null;
      const shareLink = `https://wa.me/?text=Pay%20me%20${amount}%20RWF%20via%20easyMO:%20${payment.ussd_link}`;

      return `✅ *Payment Request Created!*

💵 Amount: *${amount.toLocaleString()} RWF*
🆔 Reference: *${payment.payment_id}*

${qrUrl ? `📱 *Payment QR:* ${qrUrl}` : ''}

*Share this with payer:*
📱 USSD: *${payment.ussd_code}*
🔗 Quick pay: ${payment.ussd_link}

*Or share via WhatsApp:* ${shareLink}

People can pay by:
• Scanning your QR code
• Dialing the USSD code
• Tapping the payment link

💰 Money comes directly to your mobile money account!`;

    } catch (error) {
      console.error('Receive flow error:', error);
      return "❌ Something went wrong creating your payment request. Please try again.";
    }
  }

  async generateQROnly(phone: string, amount: number): Promise<string> {
    try {
      // Generate payment for QR
      const paymentResponse = await supabase.functions.invoke('generate-payment', {
        body: {
          amount: amount,
          phone: phone,
          description: `QR Payment - ${amount} RWF`
        }
      });

      if (paymentResponse.error) {
        return "❌ Sorry, I couldn't generate the QR code. Please try again.";
      }

      const payment = paymentResponse.data;
      
      // Generate QR code
      const qrResponse = await supabase.functions.invoke('qr-render', {
        body: {
          text: payment.ussd_code,
          agent: 'payment',
          entity: 'qr',
          id: payment.payment_id
        }
      });

      const qrUrl = qrResponse.data?.url;

      if (!qrUrl) {
        return `💰 *Payment USSD Generated*

Amount: *${amount.toLocaleString()} RWF*
USSD: *${payment.ussd_code}*
Link: ${payment.ussd_link}

(QR code generation temporarily unavailable)`;
      }

      return `📱 *QR Code Generated!*

💵 Amount: *${amount.toLocaleString()} RWF*
📸 QR Code: ${qrUrl}

*How to use:*
• Show QR to customer
• They scan with mobile banking app
• Payment is instant!

*Alternative:* USSD *${payment.ussd_code}*

Perfect for shops, restaurants, or any business! 🚀`;

    } catch (error) {
      console.error('QR generation error:', error);
      return "❌ Something went wrong generating the QR code. Please try again.";
    }
  }

  private extractAmount(message: string): number | null {
    const text = message.toLowerCase().trim();
    
    // Match pure numbers
    if (/^\d+(\.\d+)?$/.test(text)) {
      return parseFloat(text);
    }
    
    // Match "pay 5000", "qr 2500", "collect 8000", etc.
    const patterns = [
      /(?:pay|payment|qr|collect|receive|get)\s+(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:rwf|frw|francs?)/,
      /(\d+(?:\.\d+)?)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    
    return null;
  }

  private getPaymentGuidance(): string {
    return `💰 *easyMO Payment Assistant*

*What can I help you with?*

🔸 *Make Payment:* Type amount (e.g. *5000*)
🔸 *Receive Money:* Say *collect 3000*
🔸 *Generate QR:* Say *QR 2500*
🔸 *Scan QR:* Say *scan QR*

*Examples:*
• *5000* → Generate payment
• *collect 8000* → Create payment request
• *QR 1500* → Generate QR code
• *scan QR* → QR scanner guide

All payments use MTN MoMo USSD + QR codes! 🚀`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, user } = await req.json();
    
    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    console.log(`📱 Autonomous Payment Agent processing: ${phone} -> ${message}`);

    const agent = new AutonomousPaymentAgent();
    const response = await agent.processPaymentRequest(phone, message);

    // Log conversation
    await supabase.from('conversation_messages').insert({
      phone_number: phone,
      sender: 'agent',
      message_text: response,
      channel: 'whatsapp',
      model_used: 'autonomous_payment_agent',
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      response: response,
      agent: 'autonomous_payment'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Autonomous Payment Agent error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      response: "I'm having trouble right now. Please try again! 💳"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});