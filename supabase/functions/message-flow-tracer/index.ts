import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(withErrorHandling(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  try {
    const { action, timeRange = 3600 } = await req.json();
    
    console.log(`Flow tracer action: ${action}`);

    switch (action) {
      case 'trace_recent_messages':
        return await traceRecentMessages(timeRange);
      case 'health_check':
        return await performHealthCheck();
      case 'test_flow':
        return await testMessageFlow();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Flow tracer error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function traceRecentMessages(timeRangeSeconds: number) {
  const cutoffTime = new Date(Date.now() - timeRangeSeconds * 1000).toISOString();
  
  // Get recent WhatsApp logs
  const { data: whatsappLogs } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .gte('received_at', cutoffTime)
    .order('received_at', { ascending: false })
    .limit(50);

  // Get recent conversation messages
  const { data: conversationMessages } = await supabase
    .from('conversation_messages')
    .select('*')
    .gte('created_at', cutoffTime)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get agent execution logs
  const { data: executionLogs } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', cutoffTime)
    .order('timestamp', { ascending: false })
    .limit(50);

  const traceData = {
    timeRange: `${timeRangeSeconds}s`,
    summary: {
      whatsapp_messages: whatsappLogs?.length || 0,
      conversation_messages: conversationMessages?.length || 0,
      agent_executions: executionLogs?.length || 0,
      processed_ratio: whatsappLogs ? 
        whatsappLogs.filter(log => log.processed).length / whatsappLogs.length : 0
    },
    details: {
      whatsapp_logs: whatsappLogs?.slice(0, 10),
      conversation_messages: conversationMessages?.slice(0, 10),
      execution_logs: executionLogs?.slice(0, 10)
    },
    flow_health: {
      message_processing: whatsappLogs ? 
        whatsappLogs.filter(log => log.processed).length / whatsappLogs.length : 1,
      agent_response_rate: executionLogs ? 
        executionLogs.filter(log => log.success_status).length / executionLogs.length : 1
    }
  };

  return new Response(JSON.stringify({
    success: true,
    trace_data: traceData,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function performHealthCheck() {
  const checks = {
    database: false,
    whatsapp_logs: false,
    agent_memory: false,
    conversation_flow: false
  };

  try {
    // Test database connection
    const { data } = await supabase.from('whatsapp_logs').select('count').limit(1);
    checks.database = true;
    checks.whatsapp_logs = !!data;

    // Test agent memory
    const { data: memoryData } = await supabase.from('agent_memory').select('count').limit(1);
    checks.agent_memory = !!memoryData;

    // Test conversation messages
    const { data: msgData } = await supabase.from('conversation_messages').select('count').limit(1);
    checks.conversation_flow = !!msgData;

  } catch (error) {
    console.error('Health check error:', error);
  }

  const overallHealth = Object.values(checks).every(check => check);

  return new Response(JSON.stringify({
    success: true,
    health_status: overallHealth ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function testMessageFlow() {
  const testMessage = {
    message_id: `test_${Date.now()}`,
    phone_number: '+256000000000',
    message_content: 'Test message flow',
    message_type: 'text',
    contact_name: 'Test User'
  };

  // Insert test message
  const { error } = await supabase
    .from('whatsapp_logs')
    .insert(testMessage);

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    message: 'Test message inserted successfully',
    test_data: testMessage,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}