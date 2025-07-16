import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    if (req.method !== 'POST') {
      return new Response('Only POST method allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, amount } = await req.json();
    
    if (!user_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing user_id or amount' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('momo_code, phone, credits')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has enough credits
    if (user.credits < 1) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const momo = user.momo_code || user.phone;
    const ussd = `*182*1*1*${momo}*${amount}#`;
    const ussdLink = `tel:${encodeURIComponent(ussd)}`;

    // Generate QR code using a simple text-based approach (since qr package may not be available)
    // For production, you'd want to use a proper QR code library
    const qrText = `QR Code for: ${ussd}`;
    const qrData = new TextEncoder().encode(qrText);
    
    // Upload QR data as text file (simplified for demo)
    const fileName = `qr/${crypto.randomUUID()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(fileName, qrData, { 
        contentType: 'text/plain',
        upsert: false 
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('public')
      .getPublicUrl(fileName);

    // Insert payment record (this will trigger the credit deduction)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        momo_code: momo,
        amount,
        ussd_code: ussd,
        ussd_link: ussdLink,
        qr_code_url: urlData.publicUrl
      });

    if (paymentError) {
      console.error('Payment error:', paymentError);
      return new Response(JSON.stringify({ error: paymentError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ 
        ussd, 
        ussdLink, 
        qr_url: urlData.publicUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});