import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRRequestData {
  momo_number?: string;
  amount?: number;
  ref?: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { momo_number, amount, ref, user_id }: QRRequestData = await req.json();

    // Log execution start
    await supabase.from('agent_execution_log').insert({
      function_name: 'qr-render',
      input_data: { momo_number, amount, ref, user_id },
      timestamp: new Date().toISOString(),
    });

    const start_time = Date.now();

    // Generate payment reference if not provided
    const payment_ref = ref || await generatePaymentRef();

    // Create USSD QR code data with proper format
    const ussd_code = momo_number && momo_number.startsWith('078') ? 
      `*182*1*1*${momo_number}*${amount}#` : // MTN MoMo number
      `*182*8*1*${momo_number || payment_ref}*${amount}#`; // MoMo code
    const qr_data = {
      type: 'ussd_payment',
      ussd_code: ussd_code,
      momo_number: momo_number || '',
      amount: amount || null,
      ref: payment_ref,
      timestamp: new Date().toISOString(),
    };

    // Generate QR code using external service or library
    const qrResult = await generateQRCode(JSON.stringify(qr_data), payment_ref);

    // Create payment record if user_id provided
    let payment_id = null;
    if (user_id) {
      const { data, error } = await supabase.rpc('payments_insert', {
        p_user_id: user_id,
        p_amount: amount || null,
        p_momo_number: momo_number || null,
        p_qr_url: qrResult.url,
        p_ref: payment_ref,
        p_ussd_code: ussd_code,
        p_purpose: 'qr_payment'
      });

      if (error) {
        console.error('Error creating payment record:', error);
        throw new Error('Failed to create payment record');
      }
      payment_id = data;
    }

    const execution_time = Date.now() - start_time;

    // Log successful execution
    await supabase.from('agent_execution_log').insert({
      function_name: 'qr-render',
      input_data: { momo_number, amount, ref, user_id },
      success_status: true,
      execution_time_ms: execution_time,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        qr_url: qrResult.url,
        qr_base64: qrResult.base64,
        payment_ref,
        payment_id,
        qr_data,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in qr-render function:', error);

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('agent_execution_log').insert({
      function_name: 'qr-render',
      success_status: false,
      error_details: error.message,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generatePaymentRef(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EM${dateStr}${randomNum}`;
}

async function generateQRCode(data: string, filename: string): Promise<{ url: string, base64: string }> {
  try {
    // Use QR code generation service
    const qrResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`);

    if (!qrResponse.ok) {
      throw new Error('Failed to generate QR code');
    }

    const qrBuffer = await qrResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const filePath = `${filename}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-codes')
      .upload(filePath, qrBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading QR code:', uploadError);
      throw new Error('Failed to upload QR code');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      base64: `data:image/png;base64,${base64Image}`
    };

  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}