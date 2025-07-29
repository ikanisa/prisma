import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  orderId?: string;
  description?: string;
  userPhone?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  ussdCode: string;
  qrCodeUrl: string;
  paymentLink: string;
  expiresAt: string;
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'RWF', phoneNumber, orderId, description, userPhone } = await req.json() as PaymentRequest;

    console.log('💰 Creating MoMo payment link:', { amount, currency, phoneNumber, orderId });

    // Validate input
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Validate amount limits
    if (amount > 1000000) {
      throw new Error('Amount exceeds maximum limit of 1,000,000 RWF');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate unique payment ID
    const paymentId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Generate USSD code for MTN MoMo Rwanda
    const ussdCode = `*182*8*1*${amount}*${phoneNumber.replace(/[^\d]/g, '')}#`;

    // Generate QR code URL with payment data
    const qrData = JSON.stringify({
      type: 'payment',
      amount: amount,
      currency: currency,
      phone: phoneNumber,
      id: paymentId,
      expires: expiresAt
    });

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    // Create deep link for WhatsApp
    const paymentLink = `https://wa.me/250788123456?text=${encodeURIComponent(`Pay ${amount} ${currency} - Code: ${paymentId}`)}`;

    // Log payment session
    const { error: logError } = await supabase
      .from('payment_sessions')
      .insert({
        id: paymentId,
        user_phone: userPhone || phoneNumber,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'momo',
        ussd_code: ussdCode,
        qr_code_url: qrCodeUrl,
        expires_at: expiresAt,
        metadata: {
          order_id: orderId,
          description: description,
          created_via: 'api'
        }
      });

    if (logError) {
      console.error('Failed to log payment session:', logError);
    }

    // Log tool execution
    await supabase
      .from('tool_execution_logs')
      .insert({
        user_phone: userPhone || phoneNumber,
        tool_name: 'createMoMoPaymentLink',
        tool_version: '1.0',
        input_params: { amount, currency, phoneNumber, orderId },
        output_result: { paymentId, ussdCode, qrCodeUrl },
        execution_time_ms: Date.now() % 1000,
        success: true
      });

    const response: PaymentResponse = {
      success: true,
      paymentId,
      ussdCode,
      qrCodeUrl,
      paymentLink,
      expiresAt,
      data: {
        amount,
        currency,
        phone: phoneNumber,
        description: description || `Payment of ${amount} ${currency}`
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ MoMo payment creation error:', error);

    const errorResponse: PaymentResponse = {
      success: false,
      paymentId: '',
      ussdCode: '',
      qrCodeUrl: '',
      paymentLink: '',
      expiresAt: '',
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});