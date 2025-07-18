import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceMetrics {
  response_time_ms: number;
  memory_usage_score: number;
  context_accuracy_score: number;
  user_satisfaction_indicator: string;
  conversation_flow_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { operation, ...params } = await req.json();
    
    console.log(`📊 Performance Monitor: ${operation}`);

    let result;
    switch (operation) {
      case 'get_live_metrics':
        result = await getLiveMetrics(supabase);
        break;
      case 'record_performance':
        result = await recordPerformanceMetric(supabase, params);
        break;
      case 'analyze_trends':
        result = await analyzePerformanceTrends(supabase, params);
        break;
      case 'get_alerts':
        result = await getPerformanceAlerts(supabase);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({
      success: true,
      operation,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Performance Monitor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getLiveMetrics(supabase: any) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Get recent execution logs
  const { data: executions } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', oneHourAgo.toISOString())
    .order('timestamp', { ascending: false });

  // Get recent conversations
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('*')
    .gte('created_at', oneHourAgo.toISOString());

  // Calculate live metrics
  const metrics = {
    total_interactions: executions?.length || 0,
    successful_interactions: executions?.filter(e => e.success_status).length || 0,
    average_response_time: calculateAverageResponseTime(executions || []),
    active_conversations: conversations?.filter(c => c.sender === 'agent').length || 0,
    error_rate: calculateErrorRate(executions || []),
    memory_operations: executions?.filter(e => e.function_name?.includes('memory')).length || 0,
    model_distribution: calculateModelDistribution(executions || []),
    performance_score: calculateOverallPerformanceScore(executions || [], conversations || [])
  };

  return {
    metrics,
    timeframe: 'last_hour',
    last_updated: new Date().toISOString()
  };
}

async function recordPerformanceMetric(supabase: any, params: any) {
  const { 
    function_name, 
    execution_time_ms, 
    success_status, 
    user_id, 
    model_used,
    memory_operations_count,
    context_score 
  } = params;

  // Record in execution log
  const { data, error } = await supabase
    .from('agent_execution_log')
    .insert([{
      function_name,
      execution_time_ms,
      success_status,
      user_id,
      model_used,
      input_data: { 
        memory_operations: memory_operations_count,
        context_score: context_score 
      },
      timestamp: new Date().toISOString()
    }]);

  if (error) {
    throw new Error(`Failed to record performance: ${error.message}`);
  }

  // Check if we need to trigger alerts
  const alerts = await checkPerformanceThresholds(supabase, {
    execution_time_ms,
    success_status,
    function_name
  });

  return {
    recorded: true,
    performance_entry_id: data?.[0]?.id,
    alerts_triggered: alerts.length,
    alerts
  };
}

async function analyzePerformanceTrends(supabase: any, params: any) {
  const { timeframe = '24h', function_name } = params;
  
  const hoursBack = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168; // 1 week
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  let query = supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', startTime.toISOString())
    .order('timestamp', { ascending: true });

  if (function_name) {
    query = query.eq('function_name', function_name);
  }

  const { data: logs } = await query;

  if (!logs || logs.length === 0) {
    return {
      trends: {},
      message: 'No data available for the specified timeframe'
    };
  }

  // Group data by hour for trend analysis
  const hourlyData = groupLogsByHour(logs);
  
  const trends = {
    response_time_trend: calculateTrend(hourlyData.map(h => h.avg_response_time)),
    success_rate_trend: calculateTrend(hourlyData.map(h => h.success_rate)),
    volume_trend: calculateTrend(hourlyData.map(h => h.count)),
    error_frequency: calculateErrorFrequency(logs),
    performance_degradation_alerts: identifyPerformanceDegradation(hourlyData)
  };

  return {
    trends,
    timeframe,
    data_points: logs.length,
    analysis_timestamp: new Date().toISOString()
  };
}

async function getPerformanceAlerts(supabase: any) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Get recent poor performance indicators
  const { data: recentLogs } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', oneHourAgo.toISOString())
    .order('timestamp', { ascending: false });

  const alerts = [];

  if (recentLogs && recentLogs.length > 0) {
    // Check for high response times
    const slowResponses = recentLogs.filter(log => 
      log.execution_time_ms && log.execution_time_ms > 5000
    );
    
    if (slowResponses.length > 0) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `${slowResponses.length} slow responses detected (>5s)`,
        details: slowResponses.slice(0, 3).map(log => ({
          function: log.function_name,
          time: log.execution_time_ms,
          timestamp: log.timestamp
        }))
      });
    }

    // Check for high error rates
    const errorRate = (recentLogs.filter(log => !log.success_status).length / recentLogs.length) * 100;
    
    if (errorRate > 10) {
      alerts.push({
        type: 'reliability',
        severity: errorRate > 25 ? 'critical' : 'warning',
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        details: { 
          total_executions: recentLogs.length,
          failed_executions: recentLogs.filter(log => !log.success_status).length
        }
      });
    }

    // Check for memory system issues
    const memoryErrors = recentLogs.filter(log => 
      log.function_name?.includes('memory') && !log.success_status
    );
    
    if (memoryErrors.length > 2) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: `Memory system experiencing issues: ${memoryErrors.length} failures`,
        details: memoryErrors.map(log => ({
          function: log.function_name,
          error: log.error_details,
          timestamp: log.timestamp
        }))
      });
    }
  }

  return {
    alerts,
    alert_count: alerts.length,
    severity_breakdown: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length
    },
    generated_at: new Date().toISOString()
  };
}

// Helper functions
function calculateAverageResponseTime(executions: any[]): number {
  if (executions.length === 0) return 0;
  
  const times = executions
    .filter(e => e.execution_time_ms)
    .map(e => e.execution_time_ms);
  
  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

function calculateErrorRate(executions: any[]): number {
  if (executions.length === 0) return 0;
  
  const failures = executions.filter(e => !e.success_status).length;
  return (failures / executions.length) * 100;
}

function calculateModelDistribution(executions: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  executions.forEach(execution => {
    const model = execution.model_used || 'unknown';
    distribution[model] = (distribution[model] || 0) + 1;
  });
  
  return distribution;
}

function calculateOverallPerformanceScore(executions: any[], conversations: any[]): number {
  if (executions.length === 0) return 0;
  
  const successRate = (executions.filter(e => e.success_status).length / executions.length) * 100;
  const avgResponseTime = calculateAverageResponseTime(executions);
  const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 50)); // 50ms = 98 points
  
  // Combine success rate (60%) and response time (40%)
  return (successRate * 0.6) + (responseTimeScore * 0.4);
}

function groupLogsByHour(logs: any[]): any[] {
  const hourlyMap = new Map();
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    const key = `${new Date(log.timestamp).toDateString()}-${hour}`;
    
    if (!hourlyMap.has(key)) {
      hourlyMap.set(key, {
        hour: key,
        logs: [],
        count: 0,
        success_count: 0,
        total_response_time: 0
      });
    }
    
    const hourData = hourlyMap.get(key);
    hourData.logs.push(log);
    hourData.count++;
    if (log.success_status) hourData.success_count++;
    if (log.execution_time_ms) hourData.total_response_time += log.execution_time_ms;
  });
  
  return Array.from(hourlyMap.values()).map(hourData => ({
    ...hourData,
    success_rate: (hourData.success_count / hourData.count) * 100,
    avg_response_time: hourData.total_response_time / hourData.count
  }));
}

function calculateTrend(values: number[]): string {
  if (values.length < 2) return 'insufficient_data';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 10) return 'improving';
  if (changePercent < -10) return 'degrading';
  return 'stable';
}

function calculateErrorFrequency(logs: any[]): any {
  const errors = logs.filter(log => !log.success_status);
  const errorsByFunction = errors.reduce((acc, log) => {
    acc[log.function_name] = (acc[log.function_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total_errors: errors.length,
    error_rate: (errors.length / logs.length) * 100,
    errors_by_function: errorsByFunction,
    most_problematic_function: Object.entries(errorsByFunction)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
  };
}

function identifyPerformanceDegradation(hourlyData: any[]): any[] {
  const alerts = [];
  
  // Check for consistent performance degradation
  const recentHours = hourlyData.slice(-6); // Last 6 hours
  
  if (recentHours.length >= 3) {
    const avgRecentResponseTime = recentHours.reduce((acc, hour) => acc + hour.avg_response_time, 0) / recentHours.length;
    const avgRecentSuccessRate = recentHours.reduce((acc, hour) => acc + hour.success_rate, 0) / recentHours.length;
    
    if (avgRecentResponseTime > 3000) {
      alerts.push({
        type: 'response_time_degradation',
        message: `Average response time elevated: ${avgRecentResponseTime.toFixed(0)}ms`,
        severity: 'warning'
      });
    }
    
    if (avgRecentSuccessRate < 90) {
      alerts.push({
        type: 'success_rate_degradation',
        message: `Success rate below threshold: ${avgRecentSuccessRate.toFixed(1)}%`,
        severity: 'warning'
      });
    }
  }
  
  return alerts;
}

async function checkPerformanceThresholds(supabase: any, metrics: any): Promise<any[]> {
  const alerts = [];
  
  // Check response time threshold
  if (metrics.execution_time_ms > 10000) {
    alerts.push({
      type: 'slow_response',
      severity: 'critical',
      message: `Extremely slow response: ${metrics.execution_time_ms}ms`,
      function: metrics.function_name
    });
  }
  
  // Check for function-specific failures
  if (!metrics.success_status) {
    alerts.push({
      type: 'function_failure',
      severity: 'warning',
      message: `Function failure detected: ${metrics.function_name}`,
      function: metrics.function_name
    });
  }
  
  return alerts;
}