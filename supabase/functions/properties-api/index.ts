import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const { method } = req;
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments[segments.length - 1];

    // GET /properties - List all properties with optional filters
    if (method === 'GET' && !id) {
      const searchQuery = url.searchParams.get('q')?.toLowerCase() || '';
      const statusFilter = url.searchParams.get('status') || '';
      const actionFilter = url.searchParams.get('action') || '';
      const district = url.searchParams.get('district') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tbl_properties')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,district.ilike.%${searchQuery}%`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      if (district) {
        query = query.eq('district', district);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching properties:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data, count, page, limit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /properties/:id - Get single property
    if (method === 'GET' && id) {
      const { data, error } = await supabase
        .from('tbl_properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching property:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: error.code === 'PGRST116' ? 404 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /properties - Create new property
    if (method === 'POST') {
      const body = await req.json();
      
      // Validate required fields
      if (!body.title || !body.owner_phone || !body.action) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: title, owner_phone, action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tbl_properties')
        .insert({
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating property:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /properties/:id - Update property
    if (method === 'PUT' && id) {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('tbl_properties')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating property:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /properties/:id - Delete property
    if (method === 'DELETE' && id) {
      const { error } = await supabase
        .from('tbl_properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting property:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});