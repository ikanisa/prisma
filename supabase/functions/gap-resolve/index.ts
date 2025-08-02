import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


interface ResolveGapRequest {
  gap_id: string;
  resolution_note: string;
  assigned_to?: string;
  re_audit_domain?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gap_id, resolution_note, assigned_to, re_audit_domain }: ResolveGapRequest = await req.json();
    console.log(`Resolving gap: ${gap_id}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }


    // Get the gap details first
    const { data: gap, error: fetchError } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('id', gap_id)
      .single();

    if (fetchError || !gap) {
      throw new Error(`Gap not found: ${fetchError?.message || 'Unknown error'}`);
    }

    // Log the resolution action
    await supabase.from('agent_execution_log').insert({
      function_name: 'gap-resolve',
      input_data: { gap_id, resolution_note, assigned_to },
      user_id: assigned_to || 'system',
      timestamp: new Date().toISOString()
    });

    const startTime = Date.now();

    try {
      // Use the RPC function to resolve the gap
      const { data: resolved, error: resolveError } = await supabase
        .rpc('resolve_gap', { gap_id, note: resolution_note });

      if (resolveError) {
        throw new Error(`Failed to resolve gap: ${resolveError.message}`);
      }

      if (!resolved) {
        throw new Error('Gap not found or already resolved');
      }

      // Update with assignment if provided
      if (assigned_to) {
        await supabase
          .from('knowledge_gaps')
          .update({ assigned_to })
          .eq('id', gap_id);
      }

      // Optionally trigger re-audit for the domain
      let reAuditId = null;
      if (re_audit_domain && gap.impacted_area) {
        try {
          const { data: auditId } = await supabase
            .rpc('run_knowledge_audit', { 
              audit_type: `domain_recheck_${gap.impacted_area}`, 
              run_by: assigned_to || 'system' 
            });
          reAuditId = auditId;
        } catch (error) {
          console.warn('Failed to trigger domain re-audit:', error);
        }
      }

      const executionTime = Date.now() - startTime;

      // Log successful completion
      await supabase.from('agent_execution_log').insert({
        function_name: 'gap-resolve',
        input_data: { gap_id, resolution_note, re_audit_triggered: !!reAuditId },
        success_status: true,
        execution_time_ms: executionTime,
        user_id: assigned_to || 'system',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        gap_id,
        resolved_at: new Date().toISOString(),
        resolution_note,
        re_audit_id: reAuditId,
        execution_time_ms: executionTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error resolving gap:', error);
      
      // Log error
      await supabase.from('agent_execution_log').insert({
        function_name: 'gap-resolve',
        input_data: { gap_id, resolution_note },
        success_status: false,
        execution_time_ms: Date.now() - startTime,
        error_details: error.message,
        user_id: assigned_to || 'system',
        timestamp: new Date().toISOString()
      });

      throw error;
    }

  } catch (error) {
    console.error('Error in gap-resolve:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});