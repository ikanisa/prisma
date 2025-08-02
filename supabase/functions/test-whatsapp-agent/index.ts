import { supabaseClient } from "./client.ts";
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🧪 Testing processor function...')
    
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check environment variables
    const requiredVars = ['OPENAI_API_KEY', 'WHATSAPP_PHONE_ID', 'WHATSAPP_ACCESS_TOKEN']
    const envStatus = {}
    
    for (const varName of requiredVars) {
      const value = Deno.env.get(varName)
      envStatus[varName] = value ? `Set (${value.substring(0, 8)}...)` : 'NOT SET'
      console.log(`📋 ${varName}: ${envStatus[varName]}`)
    }

    // Call the process-incoming-messages function
    console.log('🚀 Calling process-incoming-messages...')
    
    const { data, error } = await supabase.functions.invoke('process-incoming-messages')

    if (error) {
      console.error('❌ Function error:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        envStatus 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Function result:', data)
    
    return new Response(JSON.stringify({ 
      success: true, 
      result: data,
      envStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})