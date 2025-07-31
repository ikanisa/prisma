import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, requiredFields = ['momo_number'] } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_number', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const missingFields: string[] = [];

    // Check each required field
    for (const field of requiredFields) {
      if (!profile || !profile[field] || profile[field].trim() === '') {
        missingFields.push(field);
      }
    }

    return new Response(
      JSON.stringify({ 
        missingFields,
        currentData: profile || {},
        isComplete: missingFields.length === 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-missing-user-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});