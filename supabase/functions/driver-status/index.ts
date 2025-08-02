import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driver_id, status, location, accuracy, battery_level } = await req.json();
    
    if (!driver_id || !status) {
      throw new Error('Driver ID and status are required');
    }

    console.log(`🚗 Driver ${driver_id} status update: ${status}`);

    // Get current session
    const { data: currentSession } = await supabase
      .from('driver_sessions')
      .select('*')
      .eq('driver_id', driver_id)
      .eq('status', 'online')
      .single();

    if (status === 'online') {
      if (currentSession) {
        // Update existing session with location
        const { error } = await supabase
          .from('driver_sessions')
          .update({
            last_location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
            accuracy: accuracy || null,
            battery_level: battery_level || null
          })
          .eq('id', currentSession.id);

        if (error) throw new Error('Failed to update session');
      } else {
        // Create new session
        const { error } = await supabase
          .from('driver_sessions')
          .insert({
            driver_id,
            status: 'online',
            last_location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
            accuracy: accuracy || null,
            battery_level: battery_level || null
          });

        if (error) throw new Error('Failed to create session');
      }

      // Update driver status
      await supabase
        .from('drivers')
        .update({ is_online: true })
        .eq('id', driver_id);

    } else if (status === 'offline') {
      if (currentSession) {
        // End current session
        const { error } = await supabase
          .from('driver_sessions')
          .update({
            status: 'offline',
            ended_at: new Date().toISOString()
          })
          .eq('id', currentSession.id);

        if (error) throw new Error('Failed to end session');
      }

      // Update driver status
      await supabase
        .from('drivers')
        .update({ is_online: false })
        .eq('id', driver_id);
    }

    console.log(`✅ Driver ${driver_id} status updated to ${status}`);

    return new Response(JSON.stringify({
      success: true,
      driver_id,
      status,
      session_id: currentSession?.id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Driver status update error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});