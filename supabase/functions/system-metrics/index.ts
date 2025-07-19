// System Metrics - Prometheus-style metrics endpoint for observability
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'metrics';

  try {
    if (action === 'record') {
      return await recordMetric(req);
    } else if (action === 'metrics') {
      return await getMetrics();
    } else if (action === 'dashboard') {
      return await getDashboardMetrics();
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Metrics error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function recordMetric(req: Request) {
  const { metric_name, metric_value, metric_type = 'counter', tags = {} } = await req.json();

  const { error } = await supabase
    .from('system_metrics')
    .insert({
      metric_name,
      metric_value,
      metric_type,
      tags
    });

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMetrics() {
  // Real-time system health metrics
  const metrics = await Promise.all([
    getConversationMetrics(),
    getQueueMetrics(),
    getQualityMetrics(),
    getHandoffMetrics(),
    getContactMetrics()
  ]);

  const [conversations, queue, quality, handoffs, contacts] = metrics;

  // Format as Prometheus-style metrics
  const prometheusMetrics = `
# HELP easymo_conversations_total Total number of conversations
# TYPE easymo_conversations_total counter
easymo_conversations_total{status="active"} ${conversations.active}
easymo_conversations_total{status="ended"} ${conversations.ended}

# HELP easymo_queue_messages Current outbound queue size
# TYPE easymo_queue_messages gauge
easymo_queue_messages{status="queued"} ${queue.queued}
easymo_queue_messages{status="processing"} ${queue.processing}
easymo_queue_messages{status="failed"} ${queue.failed}

# HELP easymo_quality_score Average conversation quality score
# TYPE easymo_quality_score gauge
easymo_quality_score ${quality.average_score}

# HELP easymo_handoffs_pending Current pending handoffs
# TYPE easymo_handoffs_pending gauge
easymo_handoffs_pending ${handoffs.pending}

# HELP easymo_contacts_total Total contacts in system
# TYPE easymo_contacts_total counter
easymo_contacts_total ${contacts.total}
easymo_contacts_total{status="opted_out"} ${contacts.opted_out}
`.trim();

  return new Response(prometheusMetrics, {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
}

async function getDashboardMetrics() {
  const [conversations, queue, quality, handoffs, contacts, properties, vehicles] = await Promise.all([
    getConversationMetrics(),
    getQueueMetrics(),
    getQualityMetrics(),
    getHandoffMetrics(),
    getContactMetrics(),
    getPropertyMetrics(),
    getVehicleMetrics()
  ]);

  return new Response(JSON.stringify({
    conversations,
    queue,
    quality,
    handoffs,
    contacts,
    listings: {
      properties,
      vehicles
    },
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getConversationMetrics() {
  const { data } = await supabase
    .from('conversations')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    active: data?.filter(c => c.status === 'active').length || 0,
    ended: data?.filter(c => c.status === 'ended').length || 0,
    total_24h: data?.length || 0
  };
}

async function getQueueMetrics() {
  const { data } = await supabase
    .from('outbound_queue')
    .select('status');

  return {
    queued: data?.filter(m => m.status === 'queued').length || 0,
    processing: data?.filter(m => m.status === 'processing').length || 0,
    failed: data?.filter(m => m.status === 'failed').length || 0,
    total: data?.length || 0
  };
}

async function getQualityMetrics() {
  const { data } = await supabase
    .from('conversation_evaluations')
    .select('overall_score')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const scores = data?.map(e => e.overall_score).filter(s => s !== null) || [];
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    average_score: Math.round(average * 100) / 100,
    total_evaluations: scores.length,
    low_quality_count: scores.filter(s => s < 0.6).length
  };
}

async function getHandoffMetrics() {
  const { data } = await supabase
    .from('conversations')
    .select('handoff_requested, resolved_at')
    .eq('handoff_requested', true);

  return {
    pending: data?.filter(c => !c.resolved_at).length || 0,
    resolved_24h: data?.filter(c => c.resolved_at && new Date(c.resolved_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0,
    total: data?.length || 0
  };
}

async function getContactMetrics() {
  const { data } = await supabase
    .from('contact_limits')
    .select('is_opted_out');

  return {
    total: data?.length || 0,
    opted_out: data?.filter(c => c.is_opted_out).length || 0,
    active: data?.filter(c => !c.is_opted_out).length || 0
  };
}

async function getPropertyMetrics() {
  const { data } = await supabase
    .from('properties')
    .select('status');

  return {
    total: data?.length || 0,
    published: data?.filter(p => p.status === 'published').length || 0,
    draft: data?.filter(p => p.status === 'draft').length || 0
  };
}

async function getVehicleMetrics() {
  const { data } = await supabase
    .from('vehicles')
    .select('status');

  return {
    total: data?.length || 0,
    published: data?.filter(v => v.status === 'published').length || 0,
    draft: data?.filter(v => v.status === 'draft').length || 0
  };
}