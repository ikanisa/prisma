import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchButtonsRequest {
  domain: string;
  limit?: number;
  offset?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      // Handle GET requests with query parameters
      const url = new URL(req.url);
      const domain = url.searchParams.get('domain');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      if (!domain) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Domain parameter is required'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      console.log(`Fetching buttons for domain: ${domain}, limit: ${limit}, offset: ${offset}`);

      const { data, error } = await supabase
        .from('action_buttons')
        .select('id, label, payload, description')
        .eq('domain', domain)
        .range(offset, offset + limit - 1)
        .order('label');

      if (error) {
        console.error('Error fetching action buttons:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          buttons: data || [],
          count: data?.length || 0,
          domain,
          limit,
          offset
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    if (req.method === 'POST') {
      // Handle POST requests with JSON body
      const { domain, limit = 10, offset = 0 }: FetchButtonsRequest = await req.json();

      if (!domain) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Domain is required'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      console.log(`Fetching buttons for domain: ${domain}, limit: ${limit}, offset: ${offset}`);

      const { data, error } = await supabase
        .from('action_buttons')
        .select('id, label, payload, description')
        .eq('domain', domain)
        .range(offset, offset + limit - 1)
        .order('label');

      if (error) {
        console.error('Error fetching action buttons:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          buttons: data || [],
          count: data?.length || 0,
          domain,
          limit,
          offset
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle unsupported methods
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    );

  } catch (error) {
    console.error('Error in action-buttons-helper function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});