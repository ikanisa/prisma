import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patron_whatsapp, bar_id, rating, feedback_text, tab_id } = await req.json();
    
    if (!patron_whatsapp || !bar_id || !rating) {
      throw new Error('patron_whatsapp, bar_id, and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get patron
    const { data: patron } = await supabase
      .from('bar_patrons')
      .select('id')
      .eq('whatsapp', patron_whatsapp)
      .single();

    if (!patron) {
      throw new Error('Patron not found');
    }

    // If tab_id not provided, get the most recent tab
    let targetTabId = tab_id;
    if (!targetTabId) {
      const { data: recentTab } = await supabase
        .from('bar_tabs')
        .select('id')
        .eq('patron_id', patron.id)
        .eq('bar_id', bar_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      targetTabId = recentTab?.id;
    }

    if (!targetTabId) {
      throw new Error('No tab found to rate');
    }

    // Check if feedback already exists for this tab
    const { data: existingFeedback } = await supabase
      .from('bar_feedback')
      .select('id')
      .eq('tab_id', targetTabId)
      .eq('patron_id', patron.id)
      .single();

    let feedback;
    
    if (existingFeedback) {
      // Update existing feedback
      const { data: updatedFeedback, error } = await supabase
        .from('bar_feedback')
        .update({
          rating: rating,
          feedback_text: feedback_text || null
        })
        .eq('id', existingFeedback.id)
        .select('*')
        .single();

      if (error) throw error;
      feedback = updatedFeedback;
    } else {
      // Create new feedback
      const { data: newFeedback, error } = await supabase
        .from('bar_feedback')
        .insert({
          tab_id: targetTabId,
          patron_id: patron.id,
          rating: rating,
          feedback_text: feedback_text || null
        })
        .select('*')
        .single();

      if (error) throw error;
      feedback = newFeedback;
    }

    // Calculate average rating for this bar
    const { data: avgRating } = await supabase
      .from('bar_feedback')
      .select('rating')
      .eq('tab_id', targetTabId)
      .not('rating', 'is', null);

    const averageRating = avgRating?.length > 0 
      ? avgRating.reduce((sum, f) => sum + f.rating, 0) / avgRating.length 
      : rating;

    // Update business rating (if businesses table has rating field)
    await supabase
      .from('businesses')
      .update({ 
        extras: { 
          avg_rating: Math.round(averageRating * 10) / 10,
          total_ratings: avgRating?.length || 1
        }
      })
      .eq('id', bar_id);

    // Generate response based on rating
    let responseMessage = '';
    if (rating >= 4) {
      responseMessage = `🌟 Thank you for the ${rating}-star review! We're thrilled you enjoyed your experience. See you again soon! 🍻`;
    } else if (rating === 3) {
      responseMessage = `Thank you for your ${rating}-star feedback. We appreciate your honesty and will work to improve your next visit! 🙏`;
    } else {
      responseMessage = `We're sorry your experience wasn't great (${rating} stars). Your feedback helps us improve. Our manager will reach out soon. 🤝`;
      
      // TODO: Alert management for low ratings
      console.log(`Low rating alert: ${rating} stars at bar ${bar_id} from ${patron_whatsapp}`);
    }

    console.log(`Saved ${rating}-star rating for tab ${targetTabId} from patron ${patron_whatsapp}`);

    return new Response(JSON.stringify({
      success: true,
      feedback: feedback,
      average_rating: averageRating,
      message: responseMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Rating receiver error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: "Sorry, we couldn't save your rating. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});