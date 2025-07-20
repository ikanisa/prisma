
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------- ENV ---------- */
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET        = "qr-codes";

/* ---------- HELPER ---------- */
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

/* ---------- FUNCTION ---------- */
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const { text, agent = "generic", entity = "misc", id } = await req.json();
    if (!text || !id) {
      return new Response(JSON.stringify({ error: "text and id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const png = await generateQRCode(text);
    const path = `${agent}/${entity}/${id}.png`;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

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

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
