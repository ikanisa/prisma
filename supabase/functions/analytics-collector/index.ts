
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { metrics, sessionStats } = await req.json();

    if (!metrics || !Array.isArray(metrics)) {
      return new Response(
        JSON.stringify({ error: 'Invalid metrics data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store individual metrics
    const metricsToInsert = metrics.map((metric: any) => ({
      session_id: metric.session_id,
      metric_name: metric.metric_name,
      value: metric.value,
      metadata: metric.metadata || {},
      timestamp: metric.timestamp
    }));

    const { error: metricsError } = await supabaseClient
      .from('performance_metrics')
      .insert(metricsToInsert);

    if (metricsError) {
      console.error('Error inserting metrics:', metricsError);
    }

    // Store session stats if provided
    if (sessionStats) {
      const { error: statsError } = await supabaseClient
        .from('session_analytics')
        .upsert({
          session_id: metrics[0]?.session_id,
          scan_attempts: sessionStats.scanAttempts,
          successful_scans: sessionStats.successfulScans,
          avg_processing_time: sessionStats.avgProcessingTime,
          failure_reasons: sessionStats.failureReasons,
          lighting_conditions: sessionStats.lightingConditions,
          methods_used: sessionStats.methodsUsed,
          success_rate: sessionStats.scanAttempts > 0 
            ? (sessionStats.successfulScans / sessionStats.scanAttempts) * 100 
            : 0,
          updated_at: new Date().toISOString()
        });

      if (statsError) {
        console.error('Error inserting session stats:', statsError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_metrics: metrics.length,
        session_stats_updated: !!sessionStats 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analytics-collector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
