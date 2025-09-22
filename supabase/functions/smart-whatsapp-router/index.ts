import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline MessageProcessor class
class MessageProcessor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getOrCreateUser(whatsappNumber: string): Promise<{ user: any, isNewUser: boolean }> {
    try {
      const { data: existingUser, error: selectError } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone', whatsappNumber)
        .single();

      if (existingUser && !selectError) {
        return { user: existingUser, isNewUser: false };
      }

      const { data: newUser, error: insertError } = await this.supabase
        .from('users')
        .insert({
          phone: whatsappNumber,
          momo_code: whatsappNumber,
          credits: 100,
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
}

// Inline PaymentAgent class
class PaymentAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      if (msg.includes('scan') || msg.includes('scanner')) {
        return `📱 *QR CODE SCANNER*\n\n🎯 Send me a photo of the QR code and I'll process it.\n\n💡 I can process:\n• Payment QR codes\n• USSD codes\n• Bank payment links`;
      }

      if (msg.includes('get paid') || msg.includes('receive')) {
        const amount = this.extractAmount(message);
        if (amount) {
          return await this.generateQRForReceiving(amount, user, whatsappNumber);
        }
        return "💰 *GET PAID*\n\nSend amount to generate QR:\nExample: 'get paid 5000'";
      }

      const amount = parseFloat(message.trim());
      if (!isNaN(amount) && amount > 0) {
        if (amount > 1000000) {
          return "💸 Maximum amount is 1,000,000 RWF. Please enter a smaller amount.";
        }
        return await this.generateQRForReceiving(amount, user, whatsappNumber);
      }

      const sendMatch = message.match(/(\d+)\s+(07\d{8})/);
      if (sendMatch) {
        const [, amount, phone] = sendMatch;
        return `💸 *SENDING ${amount} RWF to ${phone}*\n\nConfirm by replying 'yes'`;
      }

      return `💰 *PAYMENT OPTIONS*\n\n🟢 *GET PAID*: Send "5000"\n🔵 *PAY SOMEONE*: Send "5000 0788123456"\n📱 *SCAN QR*: Send "scan qr"`;
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

      return `💰 *RECEIVE ${amount.toLocaleString()} RWF*\n\n📱 QR Code: ${data.qr_url}\n💳 USSD: ${data.ussd_code}\n🔗 Link: ${data.payment_link}\n\n✅ Valid for 24 hours`;
    } catch (error) {
      return "Sorry, couldn't generate payment QR. Please try again.";
    }
  }

  private extractAmount(message: string): number | null {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}

// Inline OnboardingAgent class  
class OnboardingAgent {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async process(message: string, user: any, whatsappNumber: string, isNewUser: boolean = false): Promise<string> {
    if (isNewUser) {
      return `🎉 *Welcome to easyMO!*\nRwanda's #1 WhatsApp Super-App\n\n🚀 *INSTANT SERVICES:*\n💰 *Payments* - Send amount (e.g., '5000')\n🛒 *Shopping* - Type 'browse'\n🛵 *Transport* - Type 'ride'\n📦 *Delivery* - Type 'deliver'\n\n✨ Just send a number for instant payment QR!`;
    }

    const msg = message.toLowerCase().trim();
    
    if (msg.includes('menu') || msg.includes('help')) {
      return `📱 *easyMO Services*\n\n💰 *PAYMENTS*\n• Send amount: '5000'\n• Get paid: 'get paid 3000'\n• Scan QR: 'scan qr'\n\n🛒 *SHOPPING*\n• Browse: 'browse'\n\n🛵 *TRANSPORT*\n• Book ride: 'ride'\n\nType any service or amount to get started!`;
    }

    return "💰 Send amount for instant QR (e.g., '5000') or 'menu' for all services";
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from, text, message_id, contact_name, timestamp } = await req.json();
    
    console.log(`🎯 Smart routing message from ${from}: ${text}`);

      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const messageProcessor = new MessageProcessor(supabase);
    const onboardingAgent = new OnboardingAgent(supabase);
    const paymentAgent = new PaymentAgent(supabase);

    const { user, isNewUser } = await messageProcessor.getOrCreateUser(from);
    
    await supabase.from('agent_conversations').insert({
      user_id: from,
      role: 'user',
      message: text,
      metadata: { whatsapp_id: message_id, timestamp, is_new_user: isNewUser }
    });

    let response = '';
    let agentUsed = '';
    const msg = text.toLowerCase().trim();
    
    try {
      if (isNewUser) {
        response = await onboardingAgent.process(text, user, from, true);
        agentUsed = 'onboarding';
      } else if (text.match(/^\d+$/) || msg.includes('pay') || msg.includes('money') || msg.includes('qr') || msg.includes('scan')) {
        response = await paymentAgent.process(text, user, from);
        agentUsed = 'payment';
      } else {
        response = await onboardingAgent.process(text, user, from, false);
        agentUsed = 'onboarding';
      }

      await supabase.from('agent_conversations').insert({
        user_id: from,
        role: 'assistant',
        message: response,
        metadata: { agent: agentUsed, timestamp: new Date().toISOString() }
      });

      const whatsappResponse = await fetch('https://graph.facebook.com/v21.0/544788625370996/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: { body: response }
        })
      });

      if (!whatsappResponse.ok) {
        throw new Error('Failed to send WhatsApp message');
      }

      return new Response(JSON.stringify({
        success: true,
        agent_used: agentUsed,
        is_new_user: isNewUser
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (agentError) {
      const fallbackResponse = "Welcome to easyMO! 💰 Send amount for instant QR (e.g., '5000') or 'menu' for options.";
      
      await fetch('https://graph.facebook.com/v21.0/544788625370996/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: { body: fallbackResponse }
        })
      });

      return new Response(JSON.stringify({
        success: true,
        agent_used: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Smart router error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function determineRoutingReason(text: string, isNewUser: boolean): string {
  if (isNewUser) return 'new_user';
  if (text.match(/^\d+$/)) return 'direct_amount';
  if (text.match(/\d+\s+07\d{8}/)) return 'amount_with_phone';
  
  const msg = text.toLowerCase();
  if (msg.includes('pay') || msg.includes('money') || msg.includes('qr')) return 'payment_keywords';
  if (msg.includes('add ') && text.match(/\d+kg|\d+units/)) return 'product_listing';
  if (msg.includes('driver') || msg.includes('ride')) return 'transport_keywords';
  if (msg.includes('shop') || msg.includes('browse')) return 'shopping_keywords';
  
  return 'general_query';
}