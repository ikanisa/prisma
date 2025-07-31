import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  labels?: Record<string, any>;
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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'monitor'

    switch (action) {
      case 'monitor':
        return await performSystemHealthCheck(supabase)
      case 'metrics':
        return await getPerformanceMetrics(supabase)
      case 'benchmark':
        return await runPerformanceBenchmarks(supabase)
      case 'alert':
        return await checkAlertThresholds(supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('QA Performance Monitor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function performSystemHealthCheck(supabase: any) {
  console.log('🔍 Performing comprehensive system health check...')
  
  const healthCheck = {
    timestamp: new Date().toISOString(),
    overall_status: 'healthy',
    checks: [] as any[],
    metrics: [] as PerformanceMetric[]
  }

  // 1. Database connectivity check
  const dbStart = performance.now()
  try {
    const { data, error } = await supabase.from('agents').select('count').limit(1)
    const dbTime = performance.now() - dbStart
    
    healthCheck.checks.push({
      name: 'Database Connectivity',
      status: error ? 'failed' : 'passed',
      response_time_ms: Math.round(dbTime),
      error: error?.message
    })

    healthCheck.metrics.push({
      name: 'database_response_time',
      value: dbTime,
      unit: 'milliseconds',
      timestamp: new Date().toISOString(),
      source: 'qa-performance-monitor'
    })
  } catch (error) {
    healthCheck.checks.push({
      name: 'Database Connectivity',
      status: 'failed',
      error: error.message
    })
    healthCheck.overall_status = 'unhealthy'
  }

  // 2. AI Agent response time check
  const aiStart = performance.now()
  try {
    const { data, error } = await supabase.functions.invoke('whatsapp-unified-handler', {
      body: { 
        phone: '+250788123456', 
        message: 'health check test',
        test_mode: true 
      }
    })
    const aiTime = performance.now() - aiStart

    healthCheck.checks.push({
      name: 'AI Agent Response',
      status: error ? 'failed' : 'passed',
      response_time_ms: Math.round(aiTime),
      error: error?.message
    })

    healthCheck.metrics.push({
      name: 'ai_agent_response_time',
      value: aiTime,
      unit: 'milliseconds',
      timestamp: new Date().toISOString(),
      source: 'qa-performance-monitor'
    })
  } catch (error) {
    healthCheck.checks.push({
      name: 'AI Agent Response',
      status: 'failed',
      error: error.message
    })
    if (healthCheck.overall_status === 'healthy') healthCheck.overall_status = 'degraded'
  }

  // 3. WhatsApp webhook simulation
  const waStart = performance.now()
  try {
    const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
      body: {
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+250788123456',
                text: { body: 'health check' },
                timestamp: Date.now()
              }]
            }
          }]
        }]
      }
    })
    const waTime = performance.now() - waStart

    healthCheck.checks.push({
      name: 'WhatsApp Webhook',
      status: error ? 'failed' : 'passed',
      response_time_ms: Math.round(waTime),
      error: error?.message
    })

    healthCheck.metrics.push({
      name: 'whatsapp_webhook_response_time',
      value: waTime,
      unit: 'milliseconds',
      timestamp: new Date().toISOString(),
      source: 'qa-performance-monitor'
    })
  } catch (error) {
    healthCheck.checks.push({
      name: 'WhatsApp Webhook',
      status: 'failed',
      error: error.message
    })
    if (healthCheck.overall_status === 'healthy') healthCheck.overall_status = 'degraded'
  }

  // 4. System resource metrics
  try {
    const memoryUsage = Deno.memoryUsage()
    
    healthCheck.metrics.push(
      {
        name: 'memory_usage_rss',
        value: memoryUsage.rss,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        source: 'qa-performance-monitor'
      },
      {
        name: 'memory_usage_heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        source: 'qa-performance-monitor'
      }
    )

    healthCheck.checks.push({
      name: 'Memory Usage',
      status: 'passed',
      memory_rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      memory_heap_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    })
  } catch (error) {
    healthCheck.checks.push({
      name: 'Memory Usage',
      status: 'failed',
      error: error.message
    })
  }

  // 5. Recent test run success rate
  try {
    const { data: recentRuns } = await supabase
      .from('qa_test_runs')
      .select('status')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100)

    if (recentRuns && recentRuns.length > 0) {
      const passedRuns = recentRuns.filter(r => r.status === 'passed').length
      const successRate = (passedRuns / recentRuns.length) * 100

      healthCheck.checks.push({
        name: 'Test Success Rate (24h)',
        status: successRate >= 80 ? 'passed' : 'warning',
        success_rate: Math.round(successRate),
        total_runs: recentRuns.length
      })

      healthCheck.metrics.push({
        name: 'test_success_rate_24h',
        value: successRate,
        unit: 'percentage',
        timestamp: new Date().toISOString(),
        source: 'qa-performance-monitor'
      })

      if (successRate < 80 && healthCheck.overall_status === 'healthy') {
        healthCheck.overall_status = 'degraded'
      }
    }
  } catch (error) {
    console.error('Error checking test success rate:', error)
  }

  // Store metrics in database
  try {
    const metricsToStore = healthCheck.metrics.map(metric => ({
      metric_name: metric.name,
      metric_type: 'gauge',
      value: metric.value,
      labels: { unit: metric.unit, source: metric.source },
      recorded_at: metric.timestamp,
      source: metric.source
    }))

    await supabase
      .from('system_metrics')
      .insert(metricsToStore)
  } catch (error) {
    console.error('Error storing metrics:', error)
  }

  console.log(`✅ Health check completed - Status: ${healthCheck.overall_status}`)

  return new Response(
    JSON.stringify(healthCheck),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPerformanceMetrics(supabase: any) {
  const { data: metrics, error } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1000)

  if (error) throw error

  // Group metrics by name and calculate aggregates
  const grouped = metrics.reduce((acc: any, metric: any) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = []
    }
    acc[metric.metric_name].push(metric)
    return acc
  }, {})

  const aggregated = Object.entries(grouped).map(([name, values]: [string, any]) => {
    const numericValues = values.map((v: any) => v.value).filter((v: any) => typeof v === 'number')
    
    return {
      metric_name: name,
      count: values.length,
      latest_value: values[0]?.value,
      average: numericValues.length > 0 ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length : 0,
      min: numericValues.length > 0 ? Math.min(...numericValues) : 0,
      max: numericValues.length > 0 ? Math.max(...numericValues) : 0,
      latest_timestamp: values[0]?.recorded_at
    }
  })

  return new Response(
    JSON.stringify({
      success: true,
      metrics: aggregated,
      raw_count: metrics.length,
      time_range: '24 hours'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function runPerformanceBenchmarks(supabase: any) {
  console.log('📊 Running performance benchmarks...')

  const benchmarks = []

  // 1. Database query performance
  const queries = [
    { name: 'Simple Select', query: () => supabase.from('agents').select('id').limit(10) },
    { name: 'Complex Join', query: () => supabase.from('agent_logs').select('*, agents(name)').limit(10) },
    { name: 'Aggregate Query', query: () => supabase.from('qa_test_runs').select('status').limit(100) }
  ]

  for (const { name, query } of queries) {
    const start = performance.now()
    try {
      await query()
      const duration = performance.now() - start
      benchmarks.push({
        name: `DB: ${name}`,
        duration_ms: Math.round(duration),
        status: 'passed'
      })
    } catch (error) {
      benchmarks.push({
        name: `DB: ${name}`,
        duration_ms: 0,
        status: 'failed',
        error: error.message
      })
    }
  }

  // 2. Function call performance
  const functions = [
    { name: 'QA Test Manager', function: 'qa-test-manager' },
    { name: 'System Health Monitor', function: 'system-health-monitor' }
  ]

  for (const { name, function: funcName } of functions) {
    const start = performance.now()
    try {
      await supabase.functions.invoke(funcName, { body: { action: 'status' } })
      const duration = performance.now() - start
      benchmarks.push({
        name: `Function: ${name}`,
        duration_ms: Math.round(duration),
        status: 'passed'
      })
    } catch (error) {
      benchmarks.push({
        name: `Function: ${name}`,
        duration_ms: 0,
        status: 'failed',
        error: error.message
      })
    }
  }

  // 3. Concurrent load test
  const concurrentStart = performance.now()
  try {
    const promises = Array(10).fill(null).map(() => 
      supabase.from('agents').select('id').limit(1)
    )
    await Promise.all(promises)
    const concurrentDuration = performance.now() - concurrentStart
    
    benchmarks.push({
      name: 'Concurrent Load (10 requests)',
      duration_ms: Math.round(concurrentDuration),
      status: 'passed',
      requests_per_second: Math.round(10 / (concurrentDuration / 1000))
    })
  } catch (error) {
    benchmarks.push({
      name: 'Concurrent Load (10 requests)',
      duration_ms: 0,
      status: 'failed',
      error: error.message
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      benchmarks,
      executed_at: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkAlertThresholds(supabase: any) {
  const alerts = []
  
  // Check recent metrics against thresholds
  const { data: metrics } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
    .order('recorded_at', { ascending: false })

  if (metrics) {
    // Response time alerts
    const responseTimes = metrics.filter(m => m.metric_name.includes('response_time'))
    for (const metric of responseTimes) {
      if (metric.value > 5000) { // 5 seconds threshold
        alerts.push({
          type: 'performance',
          severity: 'warning',
          message: `High response time detected: ${metric.metric_name} = ${metric.value}ms`,
          metric_name: metric.metric_name,
          current_value: metric.value,
          threshold: 5000,
          timestamp: metric.recorded_at
        })
      }
    }

    // Memory usage alerts
    const memoryMetrics = metrics.filter(m => m.metric_name.includes('memory'))
    for (const metric of memoryMetrics) {
      if (metric.value > 500 * 1024 * 1024) { // 500MB threshold
        alerts.push({
          type: 'memory',
          severity: 'warning',
          message: `High memory usage: ${Math.round(metric.value / 1024 / 1024)}MB`,
          metric_name: metric.metric_name,
          current_value: metric.value,
          threshold: 500 * 1024 * 1024,
          timestamp: metric.recorded_at
        })
      }
    }
  }

  // Check test failure rate
  const { data: recentRuns } = await supabase
    .from('qa_test_runs')
    .select('status')
    .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
    .limit(50)

  if (recentRuns && recentRuns.length > 0) {
    const failureRate = (recentRuns.filter(r => r.status === 'failed').length / recentRuns.length) * 100
    if (failureRate > 20) {
      alerts.push({
        type: 'reliability',
        severity: 'critical',
        message: `High test failure rate: ${Math.round(failureRate)}%`,
        metric_name: 'test_failure_rate',
        current_value: failureRate,
        threshold: 20,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Store alerts in database if any found
  if (alerts.length > 0) {
    const alertsToStore = alerts.map(alert => ({
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.message,
      description: `Threshold exceeded for ${alert.metric_name}`,
      metric_name: alert.metric_name,
      current_value: alert.current_value,
      threshold_value: alert.threshold,
      source_function: 'qa-performance-monitor',
      triggered_at: alert.timestamp
    }))

    await supabase
      .from('system_alerts')
      .insert(alertsToStore)
  }

  return new Response(
    JSON.stringify({
      success: true,
      alerts_found: alerts.length,
      alerts,
      checked_at: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}