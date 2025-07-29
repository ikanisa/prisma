import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ussd, txId, amount } = await req.json();
    
    if (!ussd || !txId) {
      throw new Error('USSD code and transaction ID are required');
    }

    console.log('Generating QR code for:', { ussd, txId, amount });

    // Create QR code using a simple approach (since external QR libraries might not work in Deno)
    // Using Google Charts API as a fallback for QR generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ussd)}`;
    
    const response = await fetch(qrUrl);
    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }

    const imageBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to Supabase Storage
    const fileName = `qr_${txId}.png`;
    const filePath = `payments/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr_codes')
      .upload(filePath, uint8Array, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('qr_codes')
      .getPublicUrl(filePath);

    console.log('QR code generated and uploaded:', { fileName, publicUrl: urlData.publicUrl });

    return new Response(JSON.stringify({
      success: true,
      fileName,
      publicUrl: urlData.publicUrl,
      txId,
      amount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-qr-code-svg function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});