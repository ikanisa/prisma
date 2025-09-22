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
    const { order_id, delivery_id, trigger_type } = await req.json();
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let response: any = {};

    if (trigger_type === 'delivery_completed') {
      // Mark delivery as completed
      await supabaseClient
        .from('deliveries')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', delivery_id);

      // Update order status
      await supabaseClient
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order_id);

      // Get order details for personalized follow-up
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select(`
          *,
          carts(
            *,
            businesses(name, category)
          )
        `)
        .eq('id', order_id)
        .single();

      if (orderError) throw orderError;

      const business = order.carts.businesses;
      const category = business.category;

      // Generate category-specific follow-up messages
      let followUpMessage = "✅ Delivered! ";
      let ratingMessage = "⭐ Rate your experience:";
      let crossSellMessage = "";

      switch (category) {
        case 'pharmacy':
          followUpMessage += "Your medication has been delivered safely. Take as prescribed! 💊";
          crossSellMessage = "🩺 Need health products regularly? Set up auto-delivery!";
          break;

        case 'bar':
          followUpMessage += "Enjoy your drinks! 🍺";
          crossSellMessage = "🎉 Next time try our happy hour (4-7 PM) for 20% off!";
          break;

        case 'hardware':
          followUpMessage += "Your hardware items have been delivered. 🪚";
          crossSellMessage = "🔧 Need installation services? We can connect you with certified technicians!";
          break;

        case 'produce':
          followUpMessage += "Fresh produce delivered! 🍎";
          crossSellMessage = "🌱 Subscribe to weekly fresh produce boxes for 10% off!";
          break;

        default:
          followUpMessage += "Your order has been delivered successfully!";
          crossSellMessage = "🛒 Thank you for shopping with us!";
          break;
      }

      response = {
        type: 'follow_up',
        messages: [
          {
            type: 'text',
            content: followUpMessage
          },
          {
            type: 'rating_request',
            content: ratingMessage,
            quick_replies: [
              { id: 'rate_5', title: '⭐⭐⭐⭐⭐ Excellent' },
              { id: 'rate_4', title: '⭐⭐⭐⭐ Good' },
              { id: 'rate_3', title: '⭐⭐⭐ Average' },
              { id: 'rate_2', title: '⭐⭐ Poor' },
              { id: 'rate_1', title: '⭐ Very Poor' }
            ]
          },
          {
            type: 'cross_sell',
            content: crossSellMessage,
            delay_minutes: 5 // Send after rating
          }
        ],
        schedule_follow_up: true
      };

    } else if (trigger_type === 'rating_received') {
      // Handle rating submission
      const { rating, feedback } = await req.json();

      // Store rating (assuming we have a ratings table)
      await supabaseClient
        .from('order_ratings')
        .insert({
          order_id,
          rating: parseInt(rating),
          feedback,
          created_at: new Date().toISOString()
        });

      // Thank user for rating
      let thankYouMessage = "Thank you for your rating! 🙏";
      
      if (rating >= 4) {
        thankYouMessage += " We're glad you had a great experience!";
      } else if (rating === 3) {
        thankYouMessage += " We'll work to improve your experience next time.";
      } else {
        thankYouMessage += " We're sorry about your experience. Our team will follow up to make it right.";
        
        // Escalate poor ratings to support
        await supabaseClient
          .from('support_tickets')
          .insert({
            order_id,
            priority: 'high',
            type: 'poor_rating',
            description: `Customer gave ${rating} stars: ${feedback}`,
            status: 'open'
          });
      }

      response = {
        type: 'rating_response',
        message: thankYouMessage
      };

    } else if (trigger_type === 'schedule_marketing') {
      // Schedule future marketing messages
      const { data: order } = await supabaseClient
        .from('orders')
        .select(`
          carts(
            buyer_phone,
            businesses(category)
          )
        `)
        .eq('id', order_id)
        .single();

      const category = order?.carts.businesses.category;
      const buyerPhone = order?.carts.buyer_phone;

      // Schedule category-specific marketing messages
      const marketingSchedule = {
        'pharmacy': [
          { days: 7, message: "🩺 Time for your weekly health check-in! Any medications needed?" },
          { days: 30, message: "💊 Monthly medication reminder - reorder your prescriptions easily!" }
        ],
        'bar': [
          { days: 3, message: "🍺 Weekend plans? Check out our new craft beer selection!" },
          { days: 14, message: "🎉 It's been 2 weeks - time to celebrate at our happy hour!" }
        ],
        'hardware': [
          { days: 14, message: "🪚 How's your project going? Need any additional tools?" },
          { days: 90, message: "🔧 Quarterly hardware maintenance reminder - check your tools!" }
        ],
        'produce': [
          { days: 5, message: "🍎 Fresh produce is here! Restock your kitchen with today's harvest." },
          { days: 7, message: "🌱 Weekly fresh produce box - 10% off for returning customers!" }
        ]
      };

      response = {
        type: 'marketing_scheduled',
        phone: buyerPhone,
        schedule: marketingSchedule[category] || [],
        message: "Marketing drip campaign scheduled"
      };
    }

    // Log the post-sale interaction
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'post-sale-drip',
        input_data: { order_id, delivery_id, trigger_type },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'marketing-api'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in post-sale-drip:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});