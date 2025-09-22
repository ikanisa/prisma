import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, payload } = await req.json();

    if (!action || !userId) {
      return new Response(
        JSON.stringify({ error: 'action and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'start_driver_onboarding':
        result = await handleDriverOnboarding(supabase, userId, payload);
        break;
      
      case 'start_business_onboarding':
        result = await handleBusinessOnboarding(supabase, userId, payload);
        break;
      
      case 'confirm_data':
        result = await confirmOnboardingData(supabase, userId, payload);
        break;
      
      case 'update_onboarding_stage':
        result = await updateOnboardingStage(supabase, userId, payload.stage);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in onboarding-handler function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleDriverOnboarding(supabase: any, userId: string, payload: any) {
  const { numberPlate, logbookPhotoUrl, momoNumber, ocrData } = payload;

  const { data, error } = await supabase
    .from('pending_drivers')
    .insert([
      {
        user_id: userId,
        phone_number: userId,
        number_plate: numberPlate,
        logbook_photo_url: logbookPhotoUrl,
        momo_number: momoNumber,
        ocr_data: ocrData || {},
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;

  // Update user profile onboarding stage
  await updateOnboardingStage(supabase, userId, 'driver_pending');

  return { pendingDriver: data };
}

async function handleBusinessOnboarding(supabase: any, userId: string, payload: any) {
  const { businessName, category, address, momoCode, lat, lng, ocrData } = payload;

  const { data, error } = await supabase
    .from('pending_businesses')
    .insert([
      {
        user_id: userId,
        phone_number: userId,
        business_name: businessName,
        category,
        address,
        momo_code: momoCode,
        lat,
        lng,
        ocr_data: ocrData || {},
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;

  // Update user profile onboarding stage
  await updateOnboardingStage(supabase, userId, 'business_pending');

  return { pendingBusiness: data };
}

async function confirmOnboardingData(supabase: any, userId: string, payload: any) {
  const { type, data } = payload;

  if (type === 'driver') {
    // Move from pending to actual drivers table
    const { data: pendingDriver } = await supabase
      .from('pending_drivers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (pendingDriver) {
      // Create driver record
      const { data: newDriver, error: driverError } = await supabase
        .from('drivers')
        .insert([
          {
            user_id: userId,
            phone_number: userId,
            number_plate: pendingDriver.number_plate,
            momo_number: pendingDriver.momo_number,
            status: 'active',
            document_verified: true
          }
        ])
        .select()
        .single();

      if (driverError) throw driverError;

      // Mark pending as approved
      await supabase
        .from('pending_drivers')
        .update({ status: 'approved' })
        .eq('id', pendingDriver.id);

      await updateOnboardingStage(supabase, userId, 'driver_completed');

      return { driver: newDriver, type: 'driver' };
    }
  } else if (type === 'business') {
    // Move from pending to actual businesses table
    const { data: pendingBusiness } = await supabase
      .from('pending_businesses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (pendingBusiness) {
      // Create business record
      const { data: newBusiness, error: businessError } = await supabase
        .from('businesses')
        .insert([
          {
            name: pendingBusiness.business_name,
            category: pendingBusiness.category,
            address: pendingBusiness.address,
            phone_number: userId,
            momo_code: pendingBusiness.momo_code,
            owner_user_id: userId,
            status: 'active',
            subscription_status: 'trial'
          }
        ])
        .select()
        .single();

      if (businessError) throw businessError;

      // Mark pending as approved
      await supabase
        .from('pending_businesses')
        .update({ status: 'approved' })
        .eq('id', pendingBusiness.id);

      await updateOnboardingStage(supabase, userId, 'business_completed');

      return { business: newBusiness, type: 'business' };
    }
  }

  throw new Error('No pending onboarding data found');
}

async function updateOnboardingStage(supabase: any, userId: string, stage: string) {
  await supabase
    .from('user_profiles')
    .upsert([
      {
        phone_number: userId,
        onboarding_stage: stage,
        onboarding_completed_at: stage.includes('completed') ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }
    ]);

  return { stage };
}