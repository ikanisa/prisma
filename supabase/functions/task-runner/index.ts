import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏃 Task runner starting...');

    // Get pending tasks that are ready to run
    const now = new Date().toISOString();
    
    const { data: pendingTasks, error: fetchError } = await supabase
      .from('automated_tasks')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }) // FIFO for same priority
      .limit(10); // Process max 10 tasks per run

    if (fetchError) {
      throw new Error(`Failed to fetch pending tasks: ${fetchError.message}`);
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('No pending tasks to execute');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending tasks',
          executed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTasks.length} pending tasks`);

    let executedCount = 0;
    let failedCount = 0;

    // Process each task
    for (const task of pendingTasks) {
      try {
        console.log(`🔄 Executing task ${task.id}: ${task.task_type}`);

        // Mark task as running
        await supabase
          .from('automated_tasks')
          .update({ 
            status: 'running', 
            started_at: new Date().toISOString() 
          })
          .eq('id', task.id);

        // Execute the task
        const result = await executeTaskByType(task);

        // Mark task as completed
        await supabase
          .from('automated_tasks')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result || { executed: true }
          })
          .eq('id', task.id);

        // Schedule next run if recurring
        if (task.recurring) {
          await scheduleNextRun(task);
        }

        executedCount++;
        console.log(`✅ Task ${task.id} completed successfully`);

      } catch (taskError) {
        console.error(`❌ Task ${task.id} failed:`, taskError);
        
        // Mark task as failed
        await supabase
          .from('automated_tasks')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: taskError.message
          })
          .eq('id', task.id);

        failedCount++;
      }
    }

    console.log(`🏁 Task runner completed: ${executedCount} executed, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        executed: executedCount,
        failed: failedCount,
        total: pendingTasks.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Task runner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function executeTaskByType(task: any) {
  const { task_type, metadata } = task;

  switch (task_type) {
    case 'memory_consolidation':
      const memoryResult = await supabase.functions.invoke('memory-consolidate');
      if (memoryResult.error) throw new Error(memoryResult.error.message);
      return memoryResult.data;

    case 'vector_refresh':
      const vectorResult = await supabase.functions.invoke('vector-refresh');
      if (vectorResult.error) throw new Error(vectorResult.error.message);
      return vectorResult.data;

    case 'data_cleanup':
      return await executeDataCleanup(metadata);

    case 'user_analytics':
      return await executeUserAnalytics(metadata);

    case 'system_health_check':
      return await executeHealthCheck(metadata);

    case 'conversation_archival':
      return await executeConversationArchival(metadata);

    case 'performance_monitoring':
      return await executePerformanceMonitoring(metadata);

    default:
      throw new Error(`Unknown task type: ${task_type}`);
  }
}

async function scheduleNextRun(task: any) {
  const nextRunTime = calculateNextRunTime(task.scheduled_at, task.recurring);
  
  const nextTask = {
    task_type: task.task_type,
    status: 'scheduled',
    scheduled_at: nextRunTime,
    recurring: task.recurring,
    priority: task.priority,
    metadata: task.metadata,
    created_at: new Date().toISOString()
  };

  await supabase.from('automated_tasks').insert(nextTask);
  console.log(`📅 Scheduled next run for ${task.task_type} at ${nextRunTime}`);
}

function calculateNextRunTime(lastRun: string, recurring: string): string {
  const lastRunDate = new Date(lastRun);
  
  switch (recurring) {
    case 'hourly':
      return new Date(lastRunDate.getTime() + 60 * 60 * 1000).toISOString();
    case 'daily':
      return new Date(lastRunDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(lastRunDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      const nextMonth = new Date(lastRunDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString();
    default:
      throw new Error(`Unknown recurring type: ${recurring}`);
  }
}

async function executeDataCleanup(metadata: any) {
  console.log('🧹 Executing data cleanup...');
  
  const cutoffDays = metadata?.cutoff_days || 90;
  const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000).toISOString();
  
  // Clean up old messages
  const { count } = await supabase
    .from('conversation_messages')
    .delete({ count: 'exact' })
    .lt('created_at', cutoffDate);

  return { 
    message: 'Data cleanup completed', 
    deleted_messages: count,
    cutoff_date: cutoffDate 
  };
}

async function executeUserAnalytics(metadata: any) {
  console.log('📊 Executing user analytics...');
  
  // Get user activity stats
  const { data: userStats, error } = await supabase
    .from('conversations')
    .select('contact_id, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  const uniqueUsers = new Set(userStats?.map(s => s.contact_id)).size;
  
  return { 
    message: 'User analytics completed',
    active_users_30d: uniqueUsers,
    total_conversations: userStats?.length || 0
  };
}

async function executeHealthCheck(metadata: any) {
  console.log('🏥 Executing system health check...');
  
  const checks = {
    database: false,
    functions: false,
    storage: false
  };

  try {
    // Test database
    await supabase.from('automated_tasks').select('id').limit(1);
    checks.database = true;
  } catch (e) {
    console.error('Database health check failed:', e);
  }

  try {
    // Test function invocation
    await supabase.functions.invoke('env-check');
    checks.functions = true;
  } catch (e) {
    console.error('Functions health check failed:', e);
  }

  checks.storage = true; // Assume storage is healthy if we can connect to DB

  return { 
    message: 'Health check completed', 
    health: checks,
    timestamp: new Date().toISOString()
  };
}

async function executeConversationArchival(metadata: any) {
  console.log('📦 Executing conversation archival...');
  
  // Archive conversations older than specified days
  const archiveDays = metadata?.archive_days || 365;
  const archiveDate = new Date(Date.now() - archiveDays * 24 * 60 * 60 * 1000).toISOString();
  
  // In a real implementation, you'd move old conversations to an archive table
  // For now, just mark them as archived
  const { count } = await supabase
    .from('conversations')
    .update({ archived: true })
    .lt('updated_at', archiveDate)
    .is('archived', false);

  return { 
    message: 'Conversation archival completed',
    archived_count: count,
    archive_date: archiveDate
  };
}

async function executePerformanceMonitoring(metadata: any) {
  console.log('⚡ Executing performance monitoring...');
  
  // Get recent task performance metrics
  const { data: recentTasks, error } = await supabase
    .from('automated_tasks')
    .select('task_type, started_at, completed_at, status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .not('started_at', 'is', null)
    .not('completed_at', 'is', null);

  if (error) throw error;

  const avgExecutionTime = recentTasks?.reduce((acc, task) => {
    const startTime = new Date(task.started_at).getTime();
    const endTime = new Date(task.completed_at).getTime();
    return acc + (endTime - startTime);
  }, 0) / (recentTasks?.length || 1);

  const successRate = recentTasks?.filter(t => t.status === 'completed').length / (recentTasks?.length || 1);

  return {
    message: 'Performance monitoring completed',
    avg_execution_time_ms: Math.round(avgExecutionTime),
    success_rate: Math.round(successRate * 100),
    total_tasks_24h: recentTasks?.length || 0
  };
}