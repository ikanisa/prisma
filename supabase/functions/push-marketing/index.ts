import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      return new Response(JSON.stringify({ 
        error: 'WhatsApp credentials not configured',
        sent: 0 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get contacts for marketing (limit to small batch)
    const { data: contacts, error: contactsError } = await supabase
      .from('user_contacts')
      .select('phone, name')
      .not('phone', 'is', null)
      .limit(50);

    if (contactsError) {
      console.error('Contacts error:', contactsError);
      return new Response(JSON.stringify({ error: contactsError.message, sent: 0 }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let sentCount = 0;

    for (const contact of contacts || []) {
      if (!contact.phone) continue;

      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: contact.phone,
            type: 'text',
            text: {
              body: `Hi ${contact.name || 'there'}! 🌟 New deals available on easyMO - your AI-powered MoMo super app! Reply STOP to unsubscribe.`
            }
          })
        });

        if (response.ok) {
          sentCount++;
        } else {
          console.error('WhatsApp API error for', contact.phone, await response.text());
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Error sending to', contact.phone, error);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in push-marketing:', error);
    return new Response(JSON.stringify({ error: error.message, sent: 0 }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});