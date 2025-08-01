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

interface CronTask {
  name: string;
  schedule: string;
  function_name: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

const CRON_TASKS: CronTask[] = [
  {
    name: 'conversation-summarizer',
    schedule: '0 2 * * *', // Daily at 2 AM
    function_name: 'cron-conversation-summarizer',
    enabled: true
  },
  {
    name: 'vectorize-docs',
    schedule: '0 1 * * *', // Daily at 1 AM
    function_name: 'vectorize-docs',
    enabled: true
  },
  {
    name: 'skills-extract',
    schedule: '0 3 * * *', // Daily at 3 AM
    function_name: 'skills-extract',
    enabled: true
  },
  {
    name: 'memory-consolidator',
    schedule: '0 */6 * * *', // Every 6 hours
    function_name: 'memory-consolidator',
    enabled: true
  },
  {
    name: 'learning-pipeline',
    schedule: '0 4 * * *', // Daily at 4 AM
    function_name: 'cron-learning-pipeline',
    enabled: true
  },
  {
    name: 'quality-gate-monitor',
    schedule: '*/15 * * * *', // Every 15 minutes
    function_name: 'quality-gate-v2',
    enabled: true
  },
  {
    name: 'system-health-check',
    schedule: '*/5 * * * *', // Every 5 minutes
    function_name: 'system-metrics',
    enabled: true
  }
];

class CronScheduler {
  async executeTasks(): Promise<void> {
    console.log('Starting cron scheduler execution...');
    
    for (const task of CRON_TASKS) {
      if (!task.enabled) {
        console.log(`Skipping disabled task: ${task.name}`);
        continue;
      }

      try {
        console.log(`Executing task: ${task.name}`);
        const startTime = Date.now();

        // Call the scheduled function
        const { data, error } = await supabase.functions.invoke(task.function_name, {
          body: { 
            triggered_by: 'cron-scheduler',
            task_name: task.name,
            timestamp: new Date().toISOString()
          }
        });

        const executionTime = Date.now() - startTime;

        if (error) {
          console.error(`Task ${task.name} failed:`, error);
          await this.logTaskExecution(task.name, 'failed', { error: error.message }, executionTime);
        } else {
          console.log(`Task ${task.name} completed successfully in ${executionTime}ms`);
          await this.logTaskExecution(task.name, 'success', data, executionTime);
        }

      } catch (error) {
        console.error(`Error executing task ${task.name}:`, error);
        await this.logTaskExecution(task.name, 'error', { error: error.message }, 0);
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Cron scheduler execution completed');
  }

  private async logTaskExecution(
    taskName: string, 
    status: string, 
    result: any, 
    executionTime: number
  ): Promise<void> {
    try {
      await supabase.from('automated_tasks').insert({
        task_name: taskName,
        task_type: 'cron',
        status: status === 'success' ? 'completed' : 'failed',
        payload: { scheduled: true },
        result,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_message: status === 'failed' ? result?.error : null
      });

      // Also log to system metrics
      await supabase.from('system_metrics').insert({
        metric_name: `cron_task_${taskName}`,
        metric_value: executionTime,
        measurement_period: 'execution',
        metadata: { status, timestamp: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Failed to log task execution:', error);
    }
  }

  async getTaskStatus(): Promise<any[]> {
    const { data: recentTasks } = await supabase
      .from('automated_tasks')
      .select('*')
      .eq('task_type', 'cron')
      .order('created_at', { ascending: false })
      .limit(50);

    return CRON_TASKS.map(task => {
      const recentRuns = recentTasks?.filter(t => t.task_name === task.name) || [];
      const lastRun = recentRuns[0];
      
      return {
        ...task,
        last_run: lastRun?.completed_at,
        last_status: lastRun?.status,
        recent_runs: recentRuns.slice(0, 5)
      };
    });
  }

  async getSystemHealth(): Promise<any> {
    // Get recent system metrics
    const { data: metrics } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Calculate health indicators
    const cronTaskMetrics = metrics?.filter(m => m.metric_name.startsWith('cron_task_')) || [];
    const avgExecutionTime = cronTaskMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / cronTaskMetrics.length;
    const failedTasks = cronTaskMetrics.filter(m => m.metadata?.status === 'failed').length;
    const successRate = ((cronTaskMetrics.length - failedTasks) / cronTaskMetrics.length) * 100;

    return {
      total_tasks: CRON_TASKS.length,
      enabled_tasks: CRON_TASKS.filter(t => t.enabled).length,
      avg_execution_time_ms: avgExecutionTime || 0,
      success_rate_24h: successRate || 0,
      failed_tasks_24h: failedTasks,
      last_check: new Date().toISOString()
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
    const action = url.searchParams.get('action') || 'execute';

    const scheduler = new CronScheduler();

    switch (action) {
      case 'execute':
        await scheduler.executeTasks();
        return new Response(JSON.stringify({ 
          status: 'completed',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'status':
        const taskStatus = await scheduler.getTaskStatus();
        return new Response(JSON.stringify({ 
          tasks: taskStatus,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'health':
        const health = await scheduler.getSystemHealth();
        return new Response(JSON.stringify({
          health,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Cron scheduler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
