import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------- ENV ---------- */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "qr-codes";

/* ---------- CORS HEADERS ---------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ---------- QR CODE GENERATOR ---------- */
async function generateQRCode(text: string, size = 512): Promise<Uint8Array> {
  // Simple QR code generation using a minimal approach
  // Create a basic data URL for the QR code
  const qrText = encodeURIComponent(text);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${qrText}&format=PNG`;
  
  const response = await fetch(qrUrl);
  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/* ---------- MAIN FUNCTION ---------- */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, agent = "generic", entity = "misc", id } = await req.json();
    
    if (!text || !id) {
      return new Response(
        JSON.stringify({ error: "text and id are required" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Generating QR code for: ${text}`);

    // Generate QR code PNG
    const pngBuffer = await generateQRCode(text);
    const path = `${agent}/${entity}/${id}.png`;

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { 
      auth: { persistSession: false } 
    });

    // First, ensure the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET);
    
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        allowedMimeTypes: ['image/png'],
        fileSizeLimit: 1024 * 1024 // 1MB
      });
      
      if (bucketError) {
        console.error('Failed to create bucket:', bucketError);
      }
    }

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, pngBuffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    console.log(`QR code generated successfully: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl, 
        path: path 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('QR generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});