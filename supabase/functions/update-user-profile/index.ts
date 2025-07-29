import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateProfileRequest {
  userId: string;
  updates: {
    language?: string;
    default_wallet?: string;
    name?: string;
    preferences?: Record<string, any>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, updates }: UpdateProfileRequest = await req.json();

    console.log(`👤 Updating user profile for user: ${userId}`, updates);

    // First, try to get existing profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...updates
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    }

    // If preferences were updated, merge with existing preferences
    if (updates.preferences && existingProfile?.preferences) {
      const mergedPreferences = {
        ...existingProfile.preferences,
        ...updates.preferences
      };

      const { data: updatedProfile, error: mergeError } = await supabase
        .from('user_profiles')
        .update({
          preferences: mergedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (mergeError) {
        console.error('Error merging preferences:', mergeError);
      } else {
        result = updatedProfile;
      }
    }

    console.log(`✅ Updated user profile for ${userId}:`, result);

    return new Response(JSON.stringify({ 
      success: true, 
      profile: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-user-profile:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});