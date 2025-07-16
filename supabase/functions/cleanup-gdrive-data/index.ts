import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Cleaning up incorrect Google Drive data...');

    // Delete entries with full URLs instead of just IDs
    const { error: deleteError } = await supabase
      .from('agent_learning')
      .delete()
      .eq('source_type', 'gdrive')
      .like('source_detail', 'https://drive.google.com%');

    if (deleteError) {
      console.error('Error deleting old data:', deleteError);
      throw deleteError;
    }

    // Add the correct folder ID
    const folderId = '1HxKc7YFnEAiEj3pmuhVgkofoZO1ZQjC1';
    const { error: insertError } = await supabase
      .from('agent_learning')
      .insert({
        agent_id: null,
        source_type: 'gdrive',
        source_detail: folderId,
        vectorize: true
      });

    if (insertError) {
      console.error('Error inserting correct data:', insertError);
      throw insertError;
    }

    console.log('Successfully cleaned up and added correct folder ID');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Data cleaned up successfully',
        folderId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in cleanup:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});