import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WhatsApp configuration
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!;
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'easymo_verify';

interface WhatsAppMessage {
  from: string;
  text?: {
    body: string;
  };
  type: string;
  timestamp: string;
}

interface PaymentIntentResult {
  intent: string;
  confidence: number;
  amount?: number;
  phone?: string;
  action: string;
}

// Enhanced Payment Agent Class
class EnhancedPaymentAgent {
  constructor(private supabase: any) {}

  async processMessage(message: string, from: string, context: string[] = []): Promise<string> {
    console.log('💰 Enhanced Payment Agent processing:', { message, from });

    try {
      const intent = this.analyzePaymentIntent(message);
      console.log('🔍 Payment intent analysis:', intent);

      switch (intent.action) {
        case 'generate_qr':
          return await this.handleGenerateQR(intent, from);
        case 'confirm_payment':
          return await this.handleConfirmPayment(from);
        case 'pay_someone':
          return await this.handlePaySomeone(intent, from);
        case 'scan_qr':
          return this.handleScanQR();
        case 'payment_history':
          return await this.handlePaymentHistory(from);
        case 'payment_status':
          return await this.handlePaymentStatus(from);
        default:
          return this.getPaymentMenu();
      }
    } catch (error) {
      console.error('❌ Enhanced Payment Agent error:', error);
      return "I'm having trouble processing your payment request. Please try again or contact support.";
    }
  }

  private analyzePaymentIntent(message: string): PaymentIntentResult {
    const msg = message.toLowerCase().trim();
    
    // Direct amount detection for QR generation
    const amountMatch = msg.match(/^(\d+)$/);
    if (amountMatch) {
      return {
        intent: 'amount_for_qr',
        confidence: 0.95,
        amount: parseInt(amountMatch[1]),
        action: 'generate_qr'
      };
    }

    // Get paid patterns
    const getPaidPatterns = [
      /get paid/i,
      /receive money/i,
      /generate qr/i,
      /create qr/i,
      /qr code/i
    ];

    // Confirm payment patterns
    const confirmPatterns = [
      /paid/i,
      /received/i,
      /got.*money/i,
      /payment.*done/i,
      /complete/i
    ];

    // Pay someone patterns with amount and phone
    const payPatterns = /(\d+)\s+(07\d{8}|25\d{10})/;
    const payMatch = msg.match(payPatterns);
    if (payMatch) {
      return {
        intent: 'pay_specific',
        confidence: 0.9,
        amount: parseInt(payMatch[1]),
        phone: payMatch[2],
        action: 'pay_someone'
      };
    }

    // Scan QR patterns
    if (/scan/i.test(msg) || /camera/i.test(msg)) {
      return {
        intent: 'scan_qr',
        confidence: 0.8,
        action: 'scan_qr'
      };
    }

    // History patterns
    if (/history/i.test(msg) || /past.*payment/i.test(msg) || /previous/i.test(msg)) {
      return {
        intent: 'payment_history',
        confidence: 0.8,
        action: 'payment_history'
      };
    }

    // Status patterns
    if (/status/i.test(msg) || /check.*payment/i.test(msg)) {
      return {
        intent: 'payment_status',
        confidence: 0.8,
        action: 'payment_status'
      };
    }

    // Get paid intent
    if (getPaidPatterns.some(pattern => pattern.test(msg))) {
      const amountInText = msg.match(/(\d+)/);
      return {
        intent: 'generate_qr',
        confidence: 0.85,
        amount: amountInText ? parseInt(amountInText[1]) : undefined,
        action: 'generate_qr'
      };
    }

    // Confirm payment intent
    if (confirmPatterns.some(pattern => pattern.test(msg))) {
      return {
        intent: 'confirm_payment',
        confidence: 0.8,
        action: 'confirm_payment'
      };
    }

    return {
      intent: 'unknown',
      confidence: 0.1,
      action: 'menu'
    };
  }

  private async handleGenerateQR(intent: PaymentIntentResult, from: string): Promise<string> {
    try {
      // Get user's MoMo number (use phone as default)
      const momoNumber = from.replace('whatsapp:', '').replace('+', '');
      
      // Generate QR code
      const qrResponse = await fetch(`${supabaseUrl}/functions/v1/qr-render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          momo_number: momoNumber,
          amount: intent.amount,
          ref: `PAY_${Date.now()}`,
          user_id: from
        })
      });

      if (!qrResponse.ok) {
        throw new Error('Failed to generate QR code');
      }

      const qrData = await qrResponse.json();
      
      if (!qrData.success) {
        throw new Error(qrData.error || 'QR generation failed');
      }

      const { qr_url, ussd_code, ref, amount } = qrData.data;

      // Send QR code via WhatsApp
      await this.sendQRMessage(from, qr_url, ussd_code, amount, ref);

      return `✅ QR code generated successfully!\n\n💰 Amount: ${amount ? `${amount} RWF` : 'Any amount'}\n📱 USSD: ${ussd_code}\n🔗 Ref: ${ref}\n\nShow this QR to the payer or share the USSD code.`;

    } catch (error) {
      console.error('QR generation error:', error);
      return "❌ Sorry, I couldn't generate your QR code right now. Please try again in a moment.";
    }
  }

  private async handleConfirmPayment(from: string): Promise<string> {
    try {
      // Get the latest pending payment for this user
      const { data: payments, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('momo_number', from.replace('whatsapp:', '').replace('+', ''))
        .eq('status', 'pending')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !payments || payments.length === 0) {
        return "❌ No pending payments found. Generate a QR code first to receive money.";
      }

      const payment = payments[0];

      // Mark as paid
      const { error: updateError } = await this.supabase.rpc('payments_mark_paid', {
        p_payment_id: payment.id,
        p_confirmation_note: 'Confirmed by user via WhatsApp'
      });

      if (updateError) {
        throw updateError;
      }

      return `✅ Payment confirmed!\n\n💰 Amount: ${payment.amount} RWF\n📱 Ref: ${payment.ref}\n🎉 Thank you for using easyMO!`;

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return "❌ Sorry, I couldn't confirm your payment. Please try again or contact support.";
    }
  }

  private async handlePaySomeone(intent: PaymentIntentResult, from: string): Promise<string> {
    if (!intent.amount || !intent.phone) {
      return "💸 To pay someone, send: amount phone\nExample: 5000 0788123456\n\nOr use 'scan qr' to scan their QR code.";
    }

    try {
      // Create outbound payment record
      const { data: paymentId, error } = await this.supabase.rpc('payments_insert_enhanced', {
        p_direction: 'outbound',
        p_amount: intent.amount,
        p_momo_number: intent.phone,
        p_ref: `SEND_${Date.now()}`
      });

      if (error) {
        throw error;
      }

      // Generate USSD code for sending
      const ussdCode = `*182*6*1*${intent.amount}*${intent.phone}#`;

      return `💸 Payment setup complete!\n\n💰 Amount: ${intent.amount} RWF\n📱 To: ${intent.phone}\n📞 Dial: ${ussdCode}\n\nOr tap here to dial: tel:${ussdCode}\n\nSend "paid" when done to confirm.`;

    } catch (error) {
      console.error('Pay someone error:', error);
      return "❌ Sorry, I couldn't setup your payment. Please try again.";
    }
  }

  private handleScanQR(): string {
    const scanUrl = `${Deno.env.get('BASE_PUBLIC_URL') || 'https://easymo.app'}/scan`;
    return `📱 To scan a QR code:\n\n1. Open your camera app\n2. Point at the QR code\n3. Tap the link that appears\n\nOr visit: ${scanUrl}\n\n📋 You can also paste QR data here directly.`;
  }

  private async handlePaymentHistory(from: string): Promise<string> {
    try {
      const momoNumber = from.replace('whatsapp:', '').replace('+', '');
      
      const { data: payments, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('momo_number', momoNumber)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !payments || payments.length === 0) {
        return "📋 No payment history found.";
      }

      let history = "📋 Recent Payments:\n\n";
      
      payments.forEach((payment: any, index: number) => {
        const icon = payment.direction === 'inbound' ? '💰' : '💸';
        const status = payment.status === 'paid' ? '✅' : '⏳';
        const date = new Date(payment.created_at).toLocaleDateString();
        
        history += `${icon} ${status} ${payment.amount} RWF ${payment.direction}\n`;
        history += `   ${date} - ${payment.ref}\n\n`;
      });

      return history;

    } catch (error) {
      console.error('Payment history error:', error);
      return "❌ Sorry, I couldn't fetch your payment history. Please try again.";
    }
  }

  private async handlePaymentStatus(from: string): Promise<string> {
    try {
      const momoNumber = from.replace('whatsapp:', '').replace('+', '');
      
      const { data: payments, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('momo_number', momoNumber)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error || !payments || payments.length === 0) {
        return "✅ No pending payments found. All transactions are complete!";
      }

      let status = "⏳ Pending Payments:\n\n";
      
      payments.forEach((payment: any) => {
        const icon = payment.direction === 'inbound' ? '💰' : '💸';
        const time = new Date(payment.created_at).toLocaleTimeString();
        
        status += `${icon} ${payment.amount} RWF ${payment.direction}\n`;
        status += `   ${time} - ${payment.ref}\n\n`;
      });

      status += "💡 Send 'paid' to confirm received payments.";

      return status;

    } catch (error) {
      console.error('Payment status error:', error);
      return "❌ Sorry, I couldn't check your payment status. Please try again.";
    }
  }

  private getPaymentMenu(): string {
    return `💰 easyMO Payments\n\nWhat would you like to do?\n\n🔹 Send amount (e.g., "5000") to generate QR\n🔹 Send "get paid" for QR options\n🔹 Send "amount phone" to pay someone\n🔹 Send "scan qr" for scanner\n🔹 Send "history" for past payments\n🔹 Send "status" to check pending\n\n💡 Quick Examples:\n• "5000" → Generate QR for 5000 RWF\n• "2000 0788123456" → Pay 2000 to phone\n• "paid" → Confirm received payment`;
  }

  private async sendQRMessage(to: string, qrUrl: string, ussdCode: string, amount?: number, ref?: string): Promise<void> {
    try {
      const messageData = {
        messaging_product: 'whatsapp',
        to: to.replace('whatsapp:', ''),
        type: 'image',
        image: {
          link: qrUrl,
          caption: `💰 Payment QR Code\n\n${amount ? `Amount: ${amount} RWF\n` : ''}USSD: ${ussdCode}\n${ref ? `Ref: ${ref}\n` : ''}\nScan to pay instantly!`
        }
      };

      await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

    } catch (error) {
      console.error('Error sending QR message:', error);
    }
  }
}

// Main webhook handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      return new Response(challenge);
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      return new Response('Verification failed', { status: 403 });
    }
  }

  // Handle incoming messages
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('📨 Incoming webhook:', JSON.stringify(body, null, 2));

      // Process webhook data
      if (body.entry && body.entry[0] && body.entry[0].changes) {
        for (const change of body.entry[0].changes) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              await processIncomingMessage(message);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

async function processIncomingMessage(message: WhatsAppMessage) {
  try {
    console.log('🔄 Processing message:', message);

    // Only process text messages for now
    if (message.type !== 'text' || !message.text?.body) {
      return;
    }

    const messageText = message.text.body;
    const from = `whatsapp:${message.from}`;

    // Log incoming message
    await supabase
      .from('conversation_messages')
      .insert({
        phone_number: from,
        message_text: messageText,
        sender: 'user',
        message_type: 'text',
        channel: 'whatsapp'
      });

    // Initialize payment agent
    const paymentAgent = new EnhancedPaymentAgent(supabase);
    
    // Process with payment agent
    const response = await paymentAgent.processMessage(messageText, from);
    
    // Send response
    await sendWhatsAppMessage(message.from, response);
    
    // Log outgoing message
    await supabase
      .from('conversation_messages')
      .insert({
        phone_number: from,
        message_text: response,
        sender: 'assistant',
        message_type: 'text',
        channel: 'whatsapp'
      });

    console.log('✅ Message processed successfully');

  } catch (error) {
    console.error('❌ Error processing message:', error);
    
    // Send error message to user
    await sendWhatsAppMessage(message.from, "Sorry, I'm experiencing technical difficulties. Please try again in a moment.");
  }
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  try {
    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    console.log('📤 Message sent successfully');

  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}