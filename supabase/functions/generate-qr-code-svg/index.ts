import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRRequest {
  payload: string;
  format: 'svg' | 'png' | 'jpeg';
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  userPhone?: string;
}

interface QRResponse {
  success: boolean;
  qrCodeUrl: string;
  format: string;
  size: number;
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload, format = 'png', size = 300, errorCorrection = 'M', userPhone } = await req.json() as QRRequest;

    console.log('📱 Generating QR code:', { format, size, payloadLength: payload?.length });

    // Validate input
    if (!payload) {
      throw new Error('Payload is required');
    }

    if (payload.length > 2000) {
      throw new Error('Payload too long (max 2000 characters)');
    }

    const validFormats = ['svg', 'png', 'jpeg'];
    if (!validFormats.includes(format)) {
      throw new Error('Invalid format. Must be svg, png, or jpeg');
    }

    const validSizes = [100, 150, 200, 250, 300, 400, 500];
    const actualSize = validSizes.includes(size) ? size : 300;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate QR code using QR Server API
    let qrCodeUrl: string;

    if (format === 'svg') {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=${actualSize}x${actualSize}&ecc=${errorCorrection}&data=${encodeURIComponent(payload)}`;
    } else {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?format=${format}&size=${actualSize}x${actualSize}&ecc=${errorCorrection}&data=${encodeURIComponent(payload)}`;
    }

    // For enhanced QR codes with custom styling (if needed)
    if (payload.startsWith('http') || payload.includes('payment')) {
      qrCodeUrl += '&color=2563eb&bgcolor=ffffff'; // Blue on white
    }

    // Log QR generation
    const qrId = crypto.randomUUID();
    const { error: logError } = await supabase
      .from('tool_execution_logs')
      .insert({
        user_phone: userPhone,
        tool_name: 'generateQRCodeSVG',
        tool_version: '1.0',
        input_params: { payload: payload.substring(0, 100), format, size: actualSize },
        output_result: { qrCodeUrl, qrId },
        execution_time_ms: Date.now() % 1000,
        success: true,
        context_metadata: {
          payload_type: payload.startsWith('http') ? 'url' : 
                       payload.includes('payment') ? 'payment' :
                       payload.includes('whatsapp') ? 'whatsapp' : 'custom',
          payload_length: payload.length
        }
      });

    if (logError) {
      console.error('Failed to log QR generation:', logError);
    }

    const response: QRResponse = {
      success: true,
      qrCodeUrl,
      format,
      size: actualSize,
      data: {
        id: qrId,
        payload_type: payload.startsWith('http') ? 'url' : 
                     payload.includes('payment') ? 'payment' :
                     payload.includes('whatsapp') ? 'whatsapp' : 'custom',
        created_at: new Date().toISOString(),
        error_correction: errorCorrection
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ QR code generation error:', error);

    const errorResponse: QRResponse = {
      success: false,
      qrCodeUrl: '',
      format: 'png',
      size: 300,
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});