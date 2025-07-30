import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a unique 6-digit referral code
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, contact_name } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`📞 Ensuring user exists for phone: ${phone}`);
    console.log(`🔑 Using service key: ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present' : 'Missing'}`);
    console.log(`🌐 Supabase URL: ${Deno.env.get('SUPABASE_URL')}`);

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, phone, created_at')
      .eq('phone', phone)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.id}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          user_id: existingUser.id,
          is_new_user: false,
          phone: existingUser.phone,
          created_at: existingUser.created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure referral code is unique
    while (attempts < maxAttempts) {
      const { data: existingCode } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!existingCode) break; // Code is unique
      
      referralCode = generateReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique referral code after maximum attempts');
      referralCode = `${generateReferralCode()}${Date.now().toString().slice(-2)}`;
    }

    // Create new user
    const newUser = {
      phone: phone,
      referral_code: referralCode,
      credits: 60, // Default credits for new users
      status: 'active'
    };

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(newUser)
      .select('id, phone, referral_code, credits, created_at')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log(`🆕 Created new user: ${createdUser.id} for phone: ${phone}`);

    // Also create a contact record for better tracking
    await supabase
      .from('contacts')
      .insert({
        phone_number: phone,
        name: contact_name || 'WhatsApp User',
        status: 'active',
        contact_type: 'user',
        first_contact_date: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
        total_conversations: 1
      })
      .then(() => console.log(`📊 Contact record created for ${phone}`))
      .catch((err) => console.error('Failed to create contact record:', err));

    // Log the user creation for analytics
    await supabase
      .from('system_metrics')
      .insert({
        metric_name: 'new_user_created',
        metric_value: 1,
        metadata: {
          phone: phone,
          referral_code: referralCode,
          contact_name: contact_name,
          created_via: 'whatsapp_message'
        }
      })
      .catch((err) => console.error('Failed to log user creation metric:', err));

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: createdUser.id,
        is_new_user: true,
        phone: createdUser.phone,
        referral_code: createdUser.referral_code,
        credits: createdUser.credits,
        created_at: createdUser.created_at,
        message: 'New user created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ensure-user-exists function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});