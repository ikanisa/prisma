import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waId } = await req.json();

    if (!waId) {
      return new Response(
        JSON.stringify({ error: 'waId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has any previous messages or profile
    const [messageCheck, profileCheck] = await Promise.all([
      supabase
        .from('agent_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', waId),
      supabase
        .from('user_profiles')
        .select('id')
        .eq('phone_number', waId)
        .single()
    ]);

    const isNew = (messageCheck.count === 0) && !profileCheck.data;

    return new Response(
      JSON.stringify({ 
        isNewUser: isNew,
        messageCount: messageCheck.count || 0,
        hasProfile: !!profileCheck.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in is-new-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});