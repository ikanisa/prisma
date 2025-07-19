import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { 
      trip_id, 
      passenger_id, 
      driver_id, 
      stars, 
      tip_amount = 0, 
      feedback 
    } = await req.json();
    
    if (!trip_id || !passenger_id || !driver_id || !stars) {
      throw new Error('Trip ID, passenger ID, driver ID, and stars are required');
    }

    if (stars < 1 || stars > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }

    console.log(`⭐ Processing rating: ${stars} stars for driver ${driver_id} on trip ${trip_id}`);

    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('trip_ratings')
      .select('id')
      .eq('trip_id', trip_id)
      .eq('passenger_id', passenger_id)
      .single();

    if (existingRating) {
      throw new Error('Rating already exists for this trip');
    }

    // Create the rating
    const { data: rating, error: ratingError } = await supabase
      .from('trip_ratings')
      .insert({
        trip_id,
        passenger_id,
        driver_id,
        stars,
        tip_amount,
        feedback
      })
      .select()
      .single();

    if (ratingError) {
      console.error('Rating creation error:', ratingError);
      throw new Error('Failed to create rating');
    }

    // Process tip if provided
    if (tip_amount > 0) {
      console.log(`💸 Processing tip: ${tip_amount} RWF for driver ${driver_id}`);
      
      // Add tip to driver wallet
      const { error: walletError } = await supabase
        .from('driver_wallet')
        .update({ 
          balance: supabase.raw('balance + ?', [tip_amount])
        })
        .eq('driver_id', driver_id);

      if (walletError) {
        console.error('Tip processing error:', walletError);
      } else {
        console.log(`✅ Tip added to driver wallet`);
      }
    }

    // Flag low ratings for review
    if (stars <= 2) {
      console.log(`🚨 Low rating detected: ${stars} stars - flagging for review`);
      
      // Create support ticket for low rating
      await supabase
        .from('support_tickets')
        .insert({
          user_id: passenger_id,
          topic: `Low Rating: ${stars} stars`,
          status: 'open',
          priority: stars === 1 ? 'high' : 'medium'
        });

      // You might also want to notify admin or trigger other actions
    }

    // Update passenger's rating statistics
    const { data: passengerStats } = await supabase
      .from('trip_ratings')
      .select('stars')
      .eq('passenger_id', passenger_id);

    if (passengerStats) {
      const avgRatingGiven = passengerStats.reduce((sum, r) => sum + r.stars, 0) / passengerStats.length;
      
      await supabase
        .from('passengers')
        .update({ 
          avg_rating_given: Math.round(avgRatingGiven * 100) / 100,
          total_rides: passengerStats.length
        })
        .eq('id', passenger_id);
    }

    console.log(`✅ Rating processed successfully: ${rating.id}`);

    return new Response(JSON.stringify({
      success: true,
      rating_id: rating.id,
      stars,
      tip_amount,
      message: tip_amount > 0 
        ? `Thank you for your ${stars}-star rating and ${tip_amount} RWF tip!`
        : `Thank you for your ${stars}-star rating!`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Rating handler error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});