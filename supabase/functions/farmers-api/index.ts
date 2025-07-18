import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'list': {
        const q = payload?.search_term || '';
        const { data, error } = await supabase.rpc('list_farmers', { search_term: q });
        if (error) throw error;
        return json({ data });
      }
      case 'get': {
        const { id } = payload;
        const { data, error } = await supabase
          .from('farmers')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return json({ data });
      }
      case 'create': {
        const { data, error } = await supabase
          .from('farmers')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case 'update': {
        const { id, ...rest } = payload;
        const { data, error } = await supabase
          .from('farmers')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (e) {
    console.error('farmers-api:', e);
    return json({ error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}