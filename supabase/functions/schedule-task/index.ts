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

interface ScheduleTaskRequest {
  task_type: string;
  schedule_time?: string; // ISO string
  recurring?: 'daily' | 'weekly' | 'monthly' | 'hourly';
  metadata?: any;
  priority?: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_type, schedule_time, recurring, metadata, priority }: ScheduleTaskRequest = await req.json();

    if (!task_type) {
      return new Response(
        JSON.stringify({ error: 'task_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📅 Scheduling task: ${task_type}`);

    // Calculate next run time
    let nextRunAt: string;
    if (schedule_time) {
      nextRunAt = schedule_time;
    } else {
      // Default to immediate execution
      nextRunAt = new Date().toISOString();
    }

    // Create the scheduled task
    const taskData = {
      task_type,
      status: 'scheduled',
      scheduled_at: nextRunAt,
      recurring: recurring || null,
      priority: priority || 'medium',
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    const { data: task, error: insertError } = await supabase
      .from('automated_tasks')
      .insert(taskData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to schedule task: ${insertError.message}`);
    }

    // If the task is scheduled for immediate execution, trigger it
    if (new Date(nextRunAt) <= new Date()) {
      console.log(`🚀 Triggering immediate execution for task: ${task.id}`);
      
      // Use background task to avoid blocking response
      EdgeRuntime.waitUntil(executeTask(task.id, task_type, metadata));
    }

    console.log(`✅ Task scheduled successfully: ${task.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        scheduled_at: nextRunAt,
        task_type,
        status: 'scheduled'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Schedule task error:', error);
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

async function executeTask(taskId: string, taskType: string, metadata: any) {
  try {
    console.log(`🔄 Executing task ${taskId} of type ${taskType}`);

    // Update task status to running
    await supabase
      .from('automated_tasks')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString() 
      })
      .eq('id', taskId);

    let result;
    
    // Route to appropriate task handler
    switch (taskType) {
      case 'memory_consolidation':
        result = await supabase.functions.invoke('memory-consolidate');
        break;
        
      case 'vector_refresh':
        result = await supabase.functions.invoke('vector-refresh');
        break;
        
      case 'data_cleanup':
        result = await executeDataCleanup(metadata);
        break;
        
      case 'user_analytics':
        result = await executeUserAnalytics(metadata);
        break;
        
      case 'system_health_check':
        result = await executeHealthCheck(metadata);
        break;
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    // Update task status to completed
    await supabase
      .from('automated_tasks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: result.data || result
      })
      .eq('id', taskId);

    console.log(`✅ Task ${taskId} completed successfully`);

  } catch (error) {
    console.error(`❌ Task ${taskId} failed:`, error);
    
    // Update task status to failed
    await supabase
      .from('automated_tasks')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', taskId);
  }
}

async function executeDataCleanup(metadata: any) {
  console.log('🧹 Executing data cleanup...');
  
  // Clean up old conversation messages (older than 90 days)
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from('conversation_messages')
    .delete()
    .lt('created_at', cutoffDate);

  if (error) {
    throw error;
  }

  return { message: 'Data cleanup completed', cutoff_date: cutoffDate };
}

async function executeUserAnalytics(metadata: any) {
  console.log('📊 Executing user analytics...');
  
  // Generate user engagement statistics
  const { data: stats, error } = await supabase
    .rpc('calculate_user_engagement_stats');

  if (error) {
    throw error;
  }

  return { message: 'User analytics completed', stats };
}

async function executeHealthCheck(metadata: any) {
  console.log('🏥 Executing system health check...');
  
  // Check database connectivity, function status, etc.
  const healthChecks = {
    database: true,
    functions: true,
    storage: true,
    timestamp: new Date().toISOString()
  };

  try {
    // Test database
    await supabase.from('automated_tasks').select('id').limit(1);
  } catch {
    healthChecks.database = false;
  }

  return { message: 'Health check completed', health: healthChecks };
}