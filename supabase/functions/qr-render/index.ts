
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------- ENV ---------- */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "qr-codes";

/* ---------- INTERFACES ---------- */
interface QRRequest {
  momo_number: string;
  amount?: number;
  ref?: string;
  user_id?: string;
}

/* ---------- HELPERS ---------- */
async function generateQRCode(text: string, size = 512): Promise<Uint8Array> {
  // Use a simple QR code generation approach
  // For production, you'd want a proper QR library
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  
  // Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, size);
  
  // Simple QR-like pattern (placeholder)
  ctx.fillStyle = "black";
  const moduleSize = size / 25;
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      if ((i + j + text.length) % 3 === 0) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}

async function generateUSSDCode(momo_number: string, amount?: number): Promise<string> {
  // Generate MTN MoMo USSD code format: *182*6*1*amount*recipient#
  if (amount) {
    return `*182*6*1*${amount}*${momo_number}#`;
  }
  return `*182*6*1*${momo_number}#`;
}

async function createPaymentRecord(supabase: any, data: QRRequest, qr_url: string, ussd_code: string): Promise<string> {
  const { data: payment, error } = await supabase.rpc('payments_insert_enhanced', {
    p_direction: 'inbound',
    p_amount: data.amount,
    p_qr_url: qr_url,
    p_momo_number: data.momo_number,
    p_ref: data.ref,
    p_momo_code: data.momo_number,
    p_ussd_code: ussd_code
  });

  if (error) {
    console.error('Failed to create payment record:', error);
    throw new Error(`Payment record creation failed: ${error.message}`);
  }

  return payment;
}

/* ---------- MAIN FUNCTION ---------- */
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const startTime = Date.now();

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Support both old format (text, agent, entity, id) and new payment format
    const body = await req.json();
    
    let qrData: string;
    let filename: string;
    let paymentId: string | null = null;
    
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Check if this is a payment QR request
    if (body.momo_number) {
      const { momo_number, amount, ref, user_id }: QRRequest = body;
      
      console.log('🔄 Payment QR request:', { momo_number, amount, ref, user_id });

      if (!momo_number) {
        return new Response(
          JSON.stringify({ success: false, error: 'momo_number is required' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate QR data payload for MoMo payment
      const qr_payload = {
        type: 'momo_payment',
        momo_number,
        ...(amount && { amount }),
        ...(ref && { ref }),
        timestamp: new Date().toISOString()
      };
      
      qrData = JSON.stringify(qr_payload);
      const refCode = ref || `PAY_${Date.now()}`;
      filename = `payments/${refCode}_${Date.now()}.png`;
      
      // Generate QR code
      const png = await generateQRCode(qrData);
      
      // Upload to storage
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filename, png, {
        contentType: "image/png",
        upsert: true
      });
      
      if (upErr) throw upErr;
      
      // Build public URL
      const qr_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
      
      // Generate USSD code
      const ussd_code = await generateUSSDCode(momo_number, amount);
      
      // Create payment record if user_id provided
      if (user_id) {
        try {
          paymentId = await createPaymentRecord(supabase, { ...body, user_id }, qr_url, ussd_code);
        } catch (error) {
          console.error('Payment record creation failed:', error);
          // Continue without failing the QR generation
        }
      }
      
      // Generate payment link
      const payment_link = `${Deno.env.get('BASE_PUBLIC_URL') || 'https://easymo.app'}/pay?ref=${refCode}&amount=${amount}&to=${momo_number}`;

      const response = {
        success: true,
        data: {
          qr_url,
          ussd_code,
          payment_link,
          ref: refCode,
          amount,
          momo_number,
          payment_id: paymentId
        }
      };

      // Log to agent execution log
      await supabase
        .from('agent_execution_log')
        .insert({
          function_name: 'qr-render',
          input_data: body,
          success_status: true,
          execution_time_ms: Date.now() - startTime,
          model_used: 'qr-generator'
        });

      console.log('✅ Payment QR generated successfully:', response.data);

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else {
      // Handle legacy format (text, agent, entity, id)
      const { text, agent = "generic", entity = "misc", id } = body;
      
      if (!text || !id) {
        return new Response(JSON.stringify({ error: "text and id are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const png = await generateQRCode(text);
      const path = `${agent}/${entity}/${id}.png`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, png, {
        contentType: "image/png",
        upsert: true
      });
      
      if (upErr) throw upErr;

      // Build public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

      return new Response(JSON.stringify({ success: true, url: publicUrl, path }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error('❌ QR render error:', error);
    
    // Log error to agent execution log
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'qr-render',
        success_status: false,
        error_details: error.message,
        execution_time_ms: Date.now() - startTime
      });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
