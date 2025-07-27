import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to_number, message_text } = await req.json()
    
    if (!to_number || !message_text) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing to_number or message_text' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneId || !whatsappToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN environment variables are required' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('📤 Sending WhatsApp message to:', to_number)

    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to_number,
        type: 'text',
        text: { body: message_text }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ WhatsApp API error:', result)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `WhatsApp API error: ${result.error?.message || 'Unknown error'}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ WhatsApp message sent successfully:', result)
    
    return new Response(JSON.stringify({ 
      success: true, 
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Send message error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})