import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CronExecutionRequest {
  job_id?: string
  force_run?: boolean
  dry_run?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // Get pending cron jobs
      const now = new Date().toISOString()
      
      const { data: pendingJobs, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('is_active', true)
        .lte('next_execution', now)
        .order('next_execution', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch pending jobs: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          pending_jobs: pendingJobs,
          total_pending: pendingJobs?.length || 0,
          current_time: now
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json() as CronExecutionRequest
      const { job_id, force_run = false, dry_run = false } = body

      console.log('Cron scheduler triggered:', { job_id, force_run, dry_run })

      if (job_id) {
        // Execute specific job
        const result = await executeJob(supabase, job_id, force_run, dry_run)
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Execute all pending jobs
        const results = await executeAllPendingJobs(supabase, dry_run)
        return new Response(
          JSON.stringify(results),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cron scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function executeAllPendingJobs(supabase: any, dryRun: boolean = false) {
  const now = new Date().toISOString()
  
  // Get all pending jobs
  const { data: pendingJobs, error: fetchError } = await supabase
    .from('cron_jobs')
    .select('*')
    .eq('is_active', true)
    .lte('next_execution', now)
    .order('next_execution', { ascending: true })

  if (fetchError) {
    throw new Error(`Failed to fetch pending jobs: ${fetchError.message}`)
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    return {
      success: true,
      message: 'No pending jobs to execute',
      executed_jobs: [],
      total_executed: 0
    }
  }

  console.log(`Found ${pendingJobs.length} pending jobs`)

  const results = []
  
  for (const job of pendingJobs) {
    if (dryRun) {
      results.push({
        job_id: job.id,
        job_name: job.name,
        function_name: job.function_name,
        status: 'dry_run',
        message: 'Would execute this job'
      })
    } else {
      const result = await executeJob(supabase, job.id, false, false)
      results.push(result)
    }
  }

  return {
    success: true,
    executed_jobs: results,
    total_executed: results.length,
    dry_run: dryRun
  }
}

async function executeJob(supabase: any, jobId: string, forceRun: boolean = false, dryRun: boolean = false) {
  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('cron_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError) {
    throw new Error(`Failed to fetch job: ${jobError.message}`)
  }

  if (!job) {
    return {
      success: false,
      job_id: jobId,
      error: 'Job not found'
    }
  }

  // Check if job should run
  const now = new Date()
  const nextExecution = new Date(job.next_execution)
  
  if (!forceRun && now < nextExecution) {
    return {
      success: false,
      job_id: jobId,
      job_name: job.name,
      error: 'Job not due for execution',
      next_execution: job.next_execution
    }
  }

  if (dryRun) {
    return {
      success: true,
      job_id: jobId,
      job_name: job.name,
      function_name: job.function_name,
      status: 'dry_run',
      message: 'Would execute this job',
      parameters: job.parameters
    }
  }

  // Create execution record
  const { data: execution, error: executionError } = await supabase
    .from('cron_executions')
    .insert({
      job_id: jobId,
      status: 'running'
    })
    .select()
    .single()

  if (executionError) {
    console.error('Failed to create execution record:', executionError)
  }

  const startTime = Date.now()
  let executionResult = {
    success: false,
    job_id: jobId,
    job_name: job.name,
    function_name: job.function_name,
    execution_id: execution?.id,
    execution_time_ms: 0,
    error: 'Unknown error'
  }

  try {
    console.log(`Executing job: ${job.name} (${job.function_name})`)

    // Execute the edge function
    const { data: functionResult, error: functionError } = await supabase.functions.invoke(
      job.function_name,
      {
        body: {
          ...job.parameters,
          cron_execution: true,
          job_id: jobId,
          job_name: job.name
        }
      }
    )

    const executionTime = Date.now() - startTime

    if (functionError) {
      throw new Error(`Function execution failed: ${functionError.message}`)
    }

    // Update execution record with success
    if (execution) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          execution_time_ms: executionTime,
          result_data: functionResult
        })
        .eq('id', execution.id)
    }

    // Update job statistics and next execution
    const nextExec = calculateNextExecution(job.schedule_expression)
    await supabase
      .from('cron_jobs')
      .update({
        last_execution: new Date().toISOString(),
        next_execution: nextExec,
        execution_count: job.execution_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    executionResult = {
      success: true,
      job_id: jobId,
      job_name: job.name,
      function_name: job.function_name,
      execution_id: execution?.id,
      execution_time_ms: executionTime,
      result: functionResult,
      next_execution: nextExec
    }

    console.log(`Job ${job.name} completed successfully in ${executionTime}ms`)

  } catch (error) {
    const executionTime = Date.now() - startTime
    
    console.error(`Job ${job.name} failed:`, error)

    // Update execution record with failure
    if (execution) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          execution_time_ms: executionTime,
          error_details: error.message
        })
        .eq('id', execution.id)
    }

    // Update job failure count
    await supabase
      .from('cron_jobs')
      .update({
        failure_count: job.failure_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    executionResult = {
      success: false,
      job_id: jobId,
      job_name: job.name,
      function_name: job.function_name,
      execution_id: execution?.id,
      execution_time_ms: executionTime,
      error: error.message
    }
  }

  return executionResult
}

function calculateNextExecution(cronExpression: string): string {
  const now = new Date()
  let nextTime = new Date(now)

  // Simple cron expression parsing - in production use a proper cron library
  switch (cronExpression) {
    case '*/15 * * * *': // Every 15 minutes
      const minutes = now.getMinutes()
      const nextMinute = Math.ceil(minutes / 15) * 15
      if (nextMinute >= 60) {
        nextTime.setHours(now.getHours() + 1, 0, 0, 0)
      } else {
        nextTime.setMinutes(nextMinute, 0, 0)
      }
      break
      
    case '0 * * * *': // Every hour
      nextTime.setHours(now.getHours() + 1, 0, 0, 0)
      break
      
    case '0 9 * * *': // Daily at 9 AM
      nextTime.setDate(now.getDate() + 1)
      nextTime.setHours(9, 0, 0, 0)
      if (now.getHours() < 9) {
        nextTime.setDate(now.getDate())
      }
      break
      
    case '0 0 * * 0': // Weekly on Sunday
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7
      nextTime.setDate(now.getDate() + daysUntilSunday)
      nextTime.setHours(0, 0, 0, 0)
      break
      
    default: // Default to hourly
      nextTime.setHours(now.getHours() + 1, 0, 0, 0)
  }

  return nextTime.toISOString()
}