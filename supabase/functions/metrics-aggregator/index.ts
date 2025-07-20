import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const executionStart = Date.now();
    
    // Aggregate dashboard metrics
    const metrics = await aggregateDashboardMetrics();
    
    // Log execution
    const executionTime = Date.now() - executionStart;
    await supabase.from('agent_execution_log').insert({
      function_name: 'metrics-aggregator',
      success_status: true,
      execution_time_ms: executionTime,
      input_data: { timestamp: new Date().toISOString() }
    });

    return new Response(JSON.stringify({
      success: true,
      data: metrics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Metrics Aggregator Error:', error);
    
    await supabase.from('agent_execution_log').insert({
      function_name: 'metrics-aggregator',
      success_status: false,
      error_details: error.message,
      execution_time_ms: 0
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function aggregateDashboardMetrics() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Core metrics
  const [
    totalUsers,
    activeUsers24h,
    totalConversations,
    conversations24h,
    totalOrders,
    orders24h,
    totalRevenue,
    revenue24h,
    agentExecutions24h,
    qualityMetrics,
    systemHealth
  ] = await Promise.all([
    // Total users
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    
    // Active users (last 24h)
    supabase.from('conversation_messages')
      .select('phone_number', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString())
      .not('phone_number', 'is', null),
    
    // Total conversations
    supabase.from('conversations').select('id', { count: 'exact', head: true }),
    
    // Conversations last 24h
    supabase.from('conversations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString()),
    
    // Total orders
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    
    // Orders last 24h
    supabase.from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString()),
    
    // Total revenue
    supabase.from('orders')
      .select('total')
      .eq('status', 'completed')
      .not('total', 'is', null),
    
    // Revenue last 24h
    supabase.from('orders')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', last24h.toISOString())
      .not('total', 'is', null),
    
    // Agent executions last 24h
    supabase.from('agent_execution_log')
      .select('id, success_status, execution_time_ms')
      .gte('timestamp', last24h.toISOString()),
    
    // Quality metrics
    getQualityMetrics(last24h),
    
    // System health
    getSystemHealth()
  ]);

  // Calculate revenue totals
  const totalRevenueAmount = totalRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const revenue24hAmount = revenue24h.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  // Calculate agent performance
  const agentData = agentExecutions24h.data || [];
  const successfulAgentRuns = agentData.filter(run => run.success_status).length;
  const avgResponseTime = agentData.length > 0 
    ? agentData.reduce((sum, run) => sum + (run.execution_time_ms || 0), 0) / agentData.length 
    : 0;

  // Growth calculations
  const userGrowth = await calculateGrowth('profiles', 'created_at', last7d, last30d);
  const conversationGrowth = await calculateGrowth('conversations', 'created_at', last7d, last30d);
  const orderGrowth = await calculateGrowth('orders', 'created_at', last7d, last30d);

  return {
    overview: {
      totalUsers: totalUsers.count || 0,
      activeUsers24h: activeUsers24h.count || 0,
      totalConversations: totalConversations.count || 0,
      conversations24h: conversations24h.count || 0,
      totalOrders: totalOrders.count || 0,
      orders24h: orders24h.count || 0,
      totalRevenue: totalRevenueAmount,
      revenue24h: revenue24hAmount
    },
    
    growth: {
      userGrowth,
      conversationGrowth,
      orderGrowth,
      revenueGrowth: revenue24hAmount > 0 ? 
        ((revenue24hAmount / Math.max(totalRevenueAmount - revenue24hAmount, 1)) * 100) : 0
    },
    
    performance: {
      agentSuccessRate: agentData.length > 0 ? 
        (successfulAgentRuns / agentData.length) * 100 : 100,
      avgResponseTime: Math.round(avgResponseTime),
      totalAgentExecutions: agentData.length,
      ...qualityMetrics
    },
    
    system: systemHealth,
    
    lastUpdated: now.toISOString()
  };
}

async function getQualityMetrics(since: Date) {
  const [evaluations, conversations] = await Promise.all([
    supabase.from('conversation_evaluations')
      .select('overall_score, clarity_score, helpfulness_score, style_score')
      .gte('created_at', since.toISOString()),
    
    supabase.from('conversation_analytics')
      .select('satisfaction_rating, avg_response_time_ms, flow_completed')
      .gte('created_at', since.toISOString())
  ]);

  const evalData = evaluations.data || [];
  const convData = conversations.data || [];

  return {
    avgQualityScore: evalData.length > 0 
      ? evalData.reduce((sum, eval) => sum + (eval.overall_score || 0), 0) / evalData.length 
      : 0,
    avgSatisfactionRating: convData.length > 0
      ? convData.reduce((sum, conv) => sum + (conv.satisfaction_rating || 0), 0) / convData.length
      : 0,
    flowCompletionRate: convData.length > 0
      ? (convData.filter(conv => conv.flow_completed).length / convData.length) * 100
      : 0
  };
}

async function getSystemHealth() {
  const now = new Date();
  const last5min = new Date(now.getTime() - 5 * 60 * 1000);

  const [recentErrors, edgeFunctionHealth] = await Promise.all([
    supabase.from('agent_execution_log')
      .select('id')
      .eq('success_status', false)
      .gte('timestamp', last5min.toISOString()),
    
    supabase.from('agent_execution_log')
      .select('function_name, success_status, execution_time_ms')
      .gte('timestamp', last5min.toISOString())
  ]);

  const errorCount = recentErrors.data?.length || 0;
  const healthData = edgeFunctionHealth.data || [];
  
  const avgExecutionTime = healthData.length > 0
    ? healthData.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / healthData.length
    : 0;

  const successRate = healthData.length > 0
    ? (healthData.filter(log => log.success_status).length / healthData.length) * 100
    : 100;

  return {
    status: errorCount === 0 ? 'healthy' : errorCount < 5 ? 'warning' : 'critical',
    errorCount,
    avgExecutionTime: Math.round(avgExecutionTime),
    successRate: Math.round(successRate * 100) / 100,
    functionsActive: [...new Set(healthData.map(log => log.function_name))].length
  };
}

async function calculateGrowth(table: string, dateColumn: string, period1: Date, period2: Date) {
  const [current, previous] = await Promise.all([
    supabase.from(table)
      .select('id', { count: 'exact', head: true })
      .gte(dateColumn, period1.toISOString()),
    
    supabase.from(table)
      .select('id', { count: 'exact', head: true })
      .gte(dateColumn, period2.toISOString())
      .lt(dateColumn, period1.toISOString())
  ]);

  const currentCount = current.count || 0;
  const previousCount = previous.count || 0;
  
  if (previousCount === 0) return currentCount > 0 ? 100 : 0;
  
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}