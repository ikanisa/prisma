import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse, withRetry, RateLimiter } from "../_shared/utils.ts";
import { validateRequiredEnvVars, validateRequestBody } from "../_shared/validation.ts";
import { getSupabaseClient, withSupabase } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { PerformanceMonitor } from "../_shared/performance.ts";

// Validate environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

// Rate limiter for marketing messages (max 100 per hour)
const marketingRateLimiter = new RateLimiter(100, 60 * 60 * 1000);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📢 Starting marketing campaign');

    // Get active users who haven't received a message in the last 24 hours
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'customer')
      .or('last_interaction.is.null,last_interaction.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      throw new Error('Failed to fetch contacts');
    }

    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No eligible contacts for marketing',
        sent_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📱 Found ${contacts.length} contacts for marketing`);

    // Get latest products and events for personalized messages
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(3);

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .limit(2);

    let sentCount = 0;

    // Send personalized marketing messages
    for (const contact of contacts) {
      try {
        const marketingMessage = generateMarketingMessage(contact, products, events);
        
        // Store the marketing message
        await supabase.from('conversation_messages').insert({
          phone_number: contact.phone_number,
          channel: contact.preferred_channel || 'whatsapp',
          sender: 'agent',
          message_text: marketingMessage,
          created_at: new Date().toISOString()
        });

        // Update last interaction
        await supabase
          .from('contacts')
          .update({ last_interaction: new Date().toISOString() })
          .eq('id', contact.id);

        sentCount++;
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to send to ${contact.phone_number}:`, error);
      }
    }

    console.log(`✅ Sent ${sentCount} marketing messages`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Marketing campaign completed',
      sent_count: sentCount,
      total_contacts: contacts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Marketing campaign error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateMarketingMessage(contact: any, products: any[], events: any[]): string {
  const timeOfDay = new Date().getHours();
  let greeting = '🌅 Good morning';
  
  if (timeOfDay >= 12 && timeOfDay < 17) {
    greeting = '☀️ Good afternoon';
  } else if (timeOfDay >= 17) {
    greeting = '🌙 Good evening';
  }

  const name = contact.name || 'there';
  let message = `${greeting} ${name}! 👋

🔥 What's hot on easyMO today:

`;

  // Add products
  if (products && products.length > 0) {
    message += `🛒 FRESH ARRIVALS:\n`;
    products.slice(0, 2).forEach(product => {
      message += `• ${product.name} - ${product.price} RWF\n`;
    });
    message += '\n';
  }

  // Add events
  if (events && events.length > 0) {
    message += `🎉 UPCOMING EVENTS:\n`;
    events.slice(0, 1).forEach(event => {
      message += `• ${event.title} at ${event.location}\n`;
    });
    message += '\n';
  }

  message += `💰 Special offer: Get 10% off your next order!

Reply:
• "browse" to shop
• "events" for full event list
• "stop" to unsubscribe

Happy shopping! 🛍️`;

  return message;
}