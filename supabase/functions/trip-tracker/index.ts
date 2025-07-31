
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trip_id, driver_id, lat, lng, status, event_type } = await req.json();
    
    if (!trip_id || !driver_id) {
      throw new Error('Trip ID and driver ID are required');
    }

    console.log(`📍 Trip tracking update: ${trip_id} - ${event_type || status}`);

    // Update trip location and status
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (lat && lng) {
      updateData.current_location = `POINT(${lng} ${lat})`;
    }

    if (status) {
      updateData.status = status;
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', trip_id)
      .eq('driver_id', driver_id)
      .select('*, passengers:bookings(passenger_id)')
      .single();

    if (tripError) {
      console.error('Trip update error:', tripError);
      throw new Error(`Failed to update trip: ${tripError.message}`);
    }

    // Log trip event
    await supabase.from('trip_events').insert({
      trip_id,
      event_type: event_type || `status_${status}`,
      location: lat && lng ? `POINT(${lng} ${lat})` : null,
      metadata: {
        driver_id,
        status,
        timestamp: new Date().toISOString()
      }
    });

    // Send status updates to passengers via WhatsApp
    if (trip.passengers && event_type) {
      const statusMessages = {
        'driver_arrived': '🚗 Your driver has arrived at the pickup location!',
        'trip_started': '🏁 Your trip has started. Enjoy your ride!',
        'trip_completed': '🎉 Trip completed! Thank you for riding with easyMO!'
      };

      const message = statusMessages[event_type] || `Trip status: ${status}`;

      for (const passenger of trip.passengers) {
        await supabase.functions.invoke('compose-whatsapp-message', {
          body: {
            phone: passenger.passenger_id,
            message,
            message_type: 'text'
          }
        });
      }
    }

    // Update driver location
    if (lat && lng) {
      await supabase
        .from('drivers')
        .update({
          last_location: `POINT(${lng} ${lat})`,
          updated_at: new Date().toISOString()
        })
        .eq('id', driver_id);
    }

    console.log(`✅ Trip tracking updated: ${trip_id}`);

    return new Response(JSON.stringify({
      success: true,
      trip,
      message: `Trip tracking updated successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Trip tracking error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
