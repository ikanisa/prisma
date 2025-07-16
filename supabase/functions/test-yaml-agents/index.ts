import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Test the YAML agent processor
    const testResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/yaml-agent-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'loadAgents'
      })
    });

    const result = await testResponse.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        yaml_agents_loaded: Object.keys(result.agents || {}),
        total_agents: Object.keys(result.agents || {}).length,
        message: "YAML-based agent system is working!"
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('YAML Agent Test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: "YAML-based agent system test failed" 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});