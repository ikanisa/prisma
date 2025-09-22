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
    const { 
      trip_id, 
      order_id,
      passenger_id, 
      shopper_id,
      driver_id, 
      stars,
      rating, 
      tip_amount = 0, 
      feedback,
      comment,
      rating_type = 'trip'
    } = await req.json();
    
    const finalRating = rating || stars;
    
    if (!driver_id || !finalRating || (finalRating < 1 || finalRating > 5)) {
      throw new Error('Driver ID and rating (1-5) are required');
    }

    if (rating_type === 'trip' && (!trip_id || !passenger_id)) {
      throw new Error('Trip ID and passenger ID required for trip ratings');
    }

    if (rating_type === 'delivery' && !shopper_id && !order_id) {
      throw new Error('Shopper ID or Order ID required for delivery ratings');
    }

    console.log(`⭐ Processing ${rating_type} rating: ${finalRating} stars for driver ${driver_id}`);

    let ratingRecord;
    let userId = passenger_id || shopper_id;

    if (rating_type === 'trip' && trip_id) {
      // Check if rating already exists for trip
      const { data: existingRating } = await supabase
        .from('trip_ratings')
        .select('id')
        .eq('trip_id', trip_id)
        .eq('passenger_id', passenger_id)
        .single();

      if (existingRating) {
        throw new Error('Rating already exists for this trip');
      }

      // Create trip rating
      const { data, error: ratingError } = await supabase
        .from('trip_ratings')
        .insert({
          trip_id,
          passenger_id,
          driver_id,
          stars: finalRating,
          tip_amount,
          feedback: feedback || comment
        })
        .select()
        .single();

      if (ratingError) {
        console.error('Trip rating error:', ratingError);
        throw new Error('Failed to create trip rating');
      }
      ratingRecord = data;

    } else if (rating_type === 'delivery') {
      // Handle pharmacy delivery rating
      const pharmacy_trip_id = `pharmacy_${order_id || Date.now()}`;
      
      const { data, error: ratingError } = await supabase
        .from('trip_ratings')
        .insert({
          trip_id: pharmacy_trip_id,
          passenger_id: shopper_id,
          driver_id,
          stars: finalRating,
          tip_amount,
          feedback: comment || feedback || 'Pharmacy delivery rating'
        })
        .select()
        .single();

      if (ratingError) {
        console.error('Delivery rating error:', ratingError);
        throw new Error('Failed to create delivery rating');
      }
      ratingRecord = data;
    }

    if (!ratingRecord) {
      throw new Error('Invalid rating type or failed to create rating');
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
    if (finalRating <= 2) {
      console.log(`🚨 Low rating detected: ${finalRating} stars - flagging for review`);
      
      // Create support ticket for low rating
      await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          topic: `Low ${rating_type} Rating: ${finalRating} stars`,
          status: 'open',
          priority: finalRating === 1 ? 'high' : 'medium'
        });

      // You might also want to notify admin or trigger other actions
    }

    // Update user's rating statistics (passenger or shopper)
    if (rating_type === 'trip' && passenger_id) {
      const { data: passengerStats } = await supabase
        .from('trip_ratings')
        .select('stars')
        .eq('passenger_id', passenger_id)
        .like('trip_id', 'trip_%');

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
    }

    console.log(`✅ Rating processed successfully: ${ratingRecord.id}`);

    return new Response(JSON.stringify({
      success: true,
      rating_id: ratingRecord.id,
      rating: finalRating,
      rating_type,
      tip_amount,
      message: tip_amount > 0 
        ? `Thank you for your ${finalRating}-star rating and ${tip_amount} RWF tip!`
        : `Thank you for your ${finalRating}-star rating!`
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