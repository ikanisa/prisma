import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SystemMetric {
  name: string;
  value: number;
  period: string;
  metadata?: any;
}

class SystemMetricsCollector {
  async collectAllMetrics(): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Database metrics
      const dbMetrics = await this.collectDatabaseMetrics(last24h);
      metrics.push(...dbMetrics);

      // Agent performance metrics
      const agentMetrics = await this.collectAgentMetrics(last24h);
      metrics.push(...agentMetrics);

      // System health metrics
      const healthMetrics = await this.collectHealthMetrics();
      metrics.push(...healthMetrics);

      // User activity metrics
      const userMetrics = await this.collectUserActivityMetrics(last24h);
      metrics.push(...userMetrics);

      // Function performance metrics
      const functionMetrics = await this.collectFunctionMetrics(lastHour);
      metrics.push(...functionMetrics);

      console.log(`Collected ${metrics.length} system metrics`);
      return metrics;

    } catch (error) {
      console.error('Error collecting metrics:', error);
      return [];
    }
  }

  private async collectDatabaseMetrics(since: Date): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Total conversations
      const { count: conversationCount } = await supabase
        .from('agent_conversations')
        .select('*', { count: 'exact', head: true })
        .gte('ts', since.toISOString());

      metrics.push({
        name: 'conversations_24h',
        value: conversationCount || 0,
        period: '24h'
      });

      // Active users
      const { data: activeUsers } = await supabase
        .from('agent_conversations')
        .select('user_id')
        .gte('ts', since.toISOString());

      const uniqueUsers = new Set(activeUsers?.map(u => u.user_id)).size;
      metrics.push({
        name: 'active_users_24h',
        value: uniqueUsers,
        period: '24h'
      });

      // Conversation state distribution
      const { data: states } = await supabase
        .from('conversation_state')
        .select('current_stage');

      const stageDistribution = states?.reduce((acc: any, state) => {
        acc[state.current_stage] = (acc[state.current_stage] || 0) + 1;
        return acc;
      }, {});

      metrics.push({
        name: 'conversation_stages',
        value: Object.keys(stageDistribution || {}).length,
        period: 'current',
        metadata: stageDistribution
      });

    } catch (error) {
      console.error('Error collecting database metrics:', error);
    }

    return metrics;
  }

  private async collectAgentMetrics(since: Date): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Agent execution logs
      const { data: executions } = await supabase
        .from('agent_execution_log')
        .select('*')
        .gte('timestamp', since.toISOString());

      if (executions && executions.length > 0) {
        const successRate = (executions.filter(e => e.success_status).length / executions.length) * 100;
        const avgExecutionTime = executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length;

        metrics.push({
          name: 'agent_success_rate_24h',
          value: successRate,
          period: '24h'
        });

        metrics.push({
          name: 'agent_avg_execution_time_24h',
          value: avgExecutionTime,
          period: '24h'
        });

        // Function distribution
        const functionCounts = executions.reduce((acc: any, exec) => {
          acc[exec.function_name] = (acc[exec.function_name] || 0) + 1;
          return acc;
        }, {});

        metrics.push({
          name: 'agent_function_usage',
          value: Object.keys(functionCounts).length,
          period: '24h',
          metadata: functionCounts
        });
      }

      // Quality feedback metrics
      const { data: feedback } = await supabase
        .from('quality_feedback')
        .select('*')
        .gte('created_at', since.toISOString());

      if (feedback && feedback.length > 0) {
        const avgQualityScore = feedback.reduce((sum, f) => sum + (f.quality_score || 0), 0) / feedback.length;
        
        metrics.push({
          name: 'avg_quality_score_24h',
          value: avgQualityScore,
          period: '24h'
        });
      }

    } catch (error) {
      console.error('Error collecting agent metrics:', error);
    }

    return metrics;
  }

  private async collectHealthMetrics(): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Circuit breaker status
      const { data: breakers } = await supabase
        .from('circuit_breakers')
        .select('*');

      const openBreakers = breakers?.filter(b => b.status === 'open').length || 0;
      
      metrics.push({
        name: 'circuit_breakers_open',
        value: openBreakers,
        period: 'current'
      });

      // Live handoffs
      const { count: openHandoffs } = await supabase
        .from('live_handoffs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      metrics.push({
        name: 'open_handoffs',
        value: openHandoffs || 0,
        period: 'current'
      });

      // System uptime indicator
      metrics.push({
        name: 'system_uptime',
        value: 1, // Simple binary metric
        period: 'current',
        metadata: { timestamp: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Error collecting health metrics:', error);
    }

    return metrics;
  }

  private async collectUserActivityMetrics(since: Date): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Contact activity
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .gte('last_interaction', since.toISOString());

      metrics.push({
        name: 'active_contacts_24h',
        value: contacts?.length || 0,
        period: '24h'
      });

      // New users
      const { count: newContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('first_contact_date', since.toISOString());

      metrics.push({
        name: 'new_contacts_24h',
        value: newContacts || 0,
        period: '24h'
      });

    } catch (error) {
      console.error('Error collecting user activity metrics:', error);
    }

    return metrics;
  }

  private async collectFunctionMetrics(since: Date): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Automated tasks performance
      const { data: tasks } = await supabase
        .from('automated_tasks')
        .select('*')
        .gte('created_at', since.toISOString());

      if (tasks && tasks.length > 0) {
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const taskSuccessRate = (completedTasks / tasks.length) * 100;

        metrics.push({
          name: 'task_success_rate_1h',
          value: taskSuccessRate,
          period: '1h'
        });

        metrics.push({
          name: 'total_tasks_1h',
          value: tasks.length,
          period: '1h'
        });
      }

    } catch (error) {
      console.error('Error collecting function metrics:', error);
    }

    return metrics;
  }

  async storeMetrics(metrics: SystemMetric[]): Promise<void> {
    try {
      const records = metrics.map(metric => ({
        metric_name: metric.name,
        metric_value: metric.value,
        measurement_period: metric.period,
        metadata: metric.metadata || {}
      }));

      const { error } = await supabase
        .from('system_metrics')
        .insert(records);

      if (error) {
        console.error('Error storing metrics:', error);
      } else {
        console.log(`Stored ${records.length} metrics to database`);
      }

    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }

  async getMetricsSummary(hours: number = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data: metrics } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    // Group metrics by name and calculate aggregates
    const summary = metrics?.reduce((acc: any, metric) => {
      const name = metric.metric_name;
      if (!acc[name]) {
        acc[name] = {
          current: metric.metric_value,
          avg: 0,
          min: metric.metric_value,
          max: metric.metric_value,
          count: 0,
          trend: []
        };
      }

      const group = acc[name];
      group.count++;
      group.avg = ((group.avg * (group.count - 1)) + metric.metric_value) / group.count;
      group.min = Math.min(group.min, metric.metric_value);
      group.max = Math.max(group.max, metric.metric_value);
      group.trend.push({
        value: metric.metric_value,
        timestamp: metric.created_at
      });

      return acc;
    }, {});

    return {
      period_hours: hours,
      metrics: summary,
      last_updated: new Date().toISOString()
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'collect';
    const hours = parseInt(url.searchParams.get('hours') || '24');

    const collector = new SystemMetricsCollector();

    switch (action) {
      case 'collect':
        const metrics = await collector.collectAllMetrics();
        await collector.storeMetrics(metrics);
        
        return new Response(JSON.stringify({ 
          collected: metrics.length,
          metrics: metrics.slice(0, 10), // Preview
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'summary':
        const summary = await collector.getMetricsSummary(hours);
        
        return new Response(JSON.stringify(summary), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('System metrics error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});