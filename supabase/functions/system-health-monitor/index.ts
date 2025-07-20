import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckRequest {
  operation: 'monitor' | 'alert' | 'metrics' | 'status'
  component?: string
  severity?: 'info' | 'warning' | 'critical'
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

    const body = await req.json() as HealthCheckRequest
    const { operation, component, severity } = body

    console.log('System health monitor:', { operation, component, severity })

    let result
    switch (operation) {
      case 'monitor':
        result = await performSystemHealthCheck(supabase)
        break
      case 'alert':
        result = await checkAlertConditions(supabase)
        break
      case 'metrics':
        result = await collectSystemMetrics(supabase)
        break
      case 'status':
        result = await getSystemStatus(supabase)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('System health monitor error:', error)
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

async function performSystemHealthCheck(supabase: any) {
  const results = {
    overall_status: 'healthy',
    checks: [],
    alerts_triggered: [],
    metrics_collected: 0,
    timestamp: new Date().toISOString()
  }

  // Check Edge Function Performance
  const functionCheck = await checkEdgeFunctionHealth(supabase)
  results.checks.push(functionCheck)
  
  // Check Database Performance
  const dbCheck = await checkDatabaseHealth(supabase)
  results.checks.push(dbCheck)
  
  // Check WhatsApp Integration
  const whatsappCheck = await checkWhatsAppHealth(supabase)
  results.checks.push(whatsappCheck)
  
  // Check Agent Performance
  const agentCheck = await checkAgentHealth(supabase)
  results.checks.push(agentCheck)

  // Determine overall status
  const criticalIssues = results.checks.filter(c => c.status === 'critical')
  const warningIssues = results.checks.filter(c => c.status === 'warning')
  
  if (criticalIssues.length > 0) {
    results.overall_status = 'critical'
  } else if (warningIssues.length > 0) {
    results.overall_status = 'warning'
  }

  // Generate alerts for issues
  for (const check of results.checks) {
    if (check.status !== 'healthy') {
      const alert = await createSystemAlert(supabase, {
        alert_type: check.component,
        severity: check.status,
        title: `${check.component} Health Issue`,
        description: check.message,
        current_value: check.metric_value,
        threshold_value: check.threshold,
        source_function: 'system-health-monitor'
      })
      
      if (alert) {
        results.alerts_triggered.push(alert)
      }
    }
  }

  // Collect and store metrics
  const metrics = await collectSystemMetrics(supabase)
  results.metrics_collected = metrics.metrics_stored

  return results
}

async function checkEdgeFunctionHealth(supabase: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  // Get recent function executions
  const { data: executions } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', oneHourAgo)

  if (!executions || executions.length === 0) {
    return {
      component: 'edge_functions',
      status: 'warning',
      message: 'No function executions in the last hour',
      metric_value: 0,
      threshold: 1
    }
  }

  const successRate = executions.filter(e => e.success_status).length / executions.length
  const avgResponseTime = executions
    .filter(e => e.execution_time_ms)
    .reduce((sum, e) => sum + e.execution_time_ms, 0) / executions.length

  let status = 'healthy'
  let message = 'Edge functions performing normally'

  if (successRate < 0.95) {
    status = 'critical'
    message = `Low success rate: ${(successRate * 100).toFixed(1)}%`
  } else if (avgResponseTime > 5000) {
    status = 'warning'
    message = `High response times: ${avgResponseTime.toFixed(0)}ms avg`
  } else if (successRate < 0.98) {
    status = 'warning'
    message = `Moderate success rate: ${(successRate * 100).toFixed(1)}%`
  }

  return {
    component: 'edge_functions',
    status,
    message,
    metric_value: successRate,
    threshold: 0.95,
    details: {
      total_executions: executions.length,
      success_rate: successRate,
      avg_response_time: avgResponseTime
    }
  }
}

async function checkDatabaseHealth(supabase: any) {
  const startTime = Date.now()
  
  try {
    // Simple database connectivity and performance test
    const { data, error } = await supabase
      .from('system_metrics')
      .select('count')
      .limit(1)

    const responseTime = Date.now() - startTime

    if (error) {
      return {
        component: 'database',
        status: 'critical',
        message: `Database error: ${error.message}`,
        metric_value: responseTime,
        threshold: 1000
      }
    }

    let status = 'healthy'
    let message = 'Database responding normally'

    if (responseTime > 2000) {
      status = 'critical'
      message = `Database very slow: ${responseTime}ms`
    } else if (responseTime > 1000) {
      status = 'warning'
      message = `Database slow: ${responseTime}ms`
    }

    return {
      component: 'database',
      status,
      message,
      metric_value: responseTime,
      threshold: 1000,
      details: {
        response_time_ms: responseTime
      }
    }

  } catch (error) {
    return {
      component: 'database',
      status: 'critical',
      message: `Database connection failed: ${error.message}`,
      metric_value: Date.now() - startTime,
      threshold: 1000
    }
  }
}

async function checkWhatsAppHealth(supabase: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  // Check recent WhatsApp message deliveries
  const { data: deliveries } = await supabase
    .from('whatsapp_delivery_metrics')
    .select('*')
    .gte('created_at', oneHourAgo)

  if (!deliveries || deliveries.length === 0) {
    return {
      component: 'whatsapp',
      status: 'warning',
      message: 'No WhatsApp messages in the last hour',
      metric_value: 0,
      threshold: 1
    }
  }

  const deliveryRate = deliveries.filter(d => d.delivered).length / deliveries.length
  const avgDeliveryTime = deliveries
    .filter(d => d.delivery_time_ms)
    .reduce((sum, d) => sum + d.delivery_time_ms, 0) / deliveries.length

  let status = 'healthy'
  let message = 'WhatsApp integration working normally'

  if (deliveryRate < 0.90) {
    status = 'critical'
    message = `Low delivery rate: ${(deliveryRate * 100).toFixed(1)}%`
  } else if (avgDeliveryTime > 10000) {
    status = 'warning'
    message = `High delivery times: ${avgDeliveryTime.toFixed(0)}ms avg`
  } else if (deliveryRate < 0.95) {
    status = 'warning'
    message = `Moderate delivery rate: ${(deliveryRate * 100).toFixed(1)}%`
  }

  return {
    component: 'whatsapp',
    status,
    message,
    metric_value: deliveryRate,
    threshold: 0.90,
    details: {
      total_messages: deliveries.length,
      delivery_rate: deliveryRate,
      avg_delivery_time: avgDeliveryTime
    }
  }
}

async function checkAgentHealth(supabase: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  // Check recent conversations
  const { data: conversations } = await supabase
    .from('conversation_messages')
    .select('*')
    .gte('created_at', oneHourAgo)

  if (!conversations || conversations.length === 0) {
    return {
      component: 'ai_agents',
      status: 'warning',
      message: 'No agent conversations in the last hour',
      metric_value: 0,
      threshold: 1
    }
  }

  const agentMessages = conversations.filter(c => c.sender === 'agent')
  const responseRate = agentMessages.length / conversations.length
  
  // Check confidence scores
  const confidenceScores = agentMessages
    .filter(m => m.confidence_score)
    .map(m => m.confidence_score)
  
  const avgConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    : 0

  let status = 'healthy'
  let message = 'AI agents responding normally'

  if (responseRate < 0.50) {
    status = 'critical'
    message = `Low agent response rate: ${(responseRate * 100).toFixed(1)}%`
  } else if (avgConfidence < 0.60) {
    status = 'warning'
    message = `Low confidence scores: ${(avgConfidence * 100).toFixed(1)}% avg`
  } else if (responseRate < 0.70) {
    status = 'warning'
    message = `Moderate response rate: ${(responseRate * 100).toFixed(1)}%`
  }

  return {
    component: 'ai_agents',
    status,
    message,
    metric_value: responseRate,
    threshold: 0.50,
    details: {
      total_conversations: conversations.length,
      agent_responses: agentMessages.length,
      response_rate: responseRate,
      avg_confidence: avgConfidence
    }
  }
}

async function createSystemAlert(supabase: any, alertData: any) {
  // Check if similar alert exists recently
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data: existingAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('alert_type', alertData.alert_type)
    .eq('status', 'active')
    .gte('triggered_at', oneHourAgo)

  if (existingAlerts && existingAlerts.length > 0) {
    console.log('Similar alert already exists, skipping')
    return null
  }

  // Create new alert
  const { data: alert, error } = await supabase
    .from('system_alerts')
    .insert(alertData)
    .select()
    .single()

  if (error) {
    console.error('Failed to create alert:', error)
    return null
  }

  console.log('Alert created:', alert.title)
  return alert
}

async function collectSystemMetrics(supabase: any) {
  const metrics = []
  const timestamp = new Date().toISOString()

  // Collect various system metrics
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Function execution metrics
  const { data: executions } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', oneHourAgo)

  if (executions && executions.length > 0) {
    const successRate = executions.filter(e => e.success_status).length / executions.length
    const avgResponseTime = executions
      .filter(e => e.execution_time_ms)
      .reduce((sum, e) => sum + e.execution_time_ms, 0) / executions.length

    metrics.push({
      metric_name: 'function_success_rate',
      metric_type: 'gauge',
      value: successRate,
      labels: { timeframe: '1h' },
      source: 'system-health-monitor'
    })

    metrics.push({
      metric_name: 'function_avg_response_time',
      metric_type: 'gauge',
      value: avgResponseTime,
      labels: { timeframe: '1h', unit: 'ms' },
      source: 'system-health-monitor'
    })
  }

  // WhatsApp metrics
  const { data: whatsappMessages } = await supabase
    .from('whatsapp_delivery_metrics')
    .select('*')
    .gte('created_at', oneHourAgo)

  if (whatsappMessages && whatsappMessages.length > 0) {
    const deliveryRate = whatsappMessages.filter(m => m.delivered).length / whatsappMessages.length
    
    metrics.push({
      metric_name: 'whatsapp_delivery_rate',
      metric_type: 'gauge',
      value: deliveryRate,
      labels: { timeframe: '1h' },
      source: 'system-health-monitor'
    })
  }

  // Store metrics
  for (const metric of metrics) {
    await supabase
      .from('system_metrics')
      .insert({
        ...metric,
        recorded_at: timestamp
      })
  }

  return {
    metrics_stored: metrics.length,
    timestamp
  }
}

async function checkAlertConditions(supabase: any) {
  // Get active alert configurations
  const { data: alertConfigs } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('is_active', true)

  const processedAlerts = []

  for (const config of alertConfigs || []) {
    // Check for new alerts matching this configuration
    const alerts = await checkSpecificAlertCondition(supabase, config)
    processedAlerts.push(...alerts)
  }

  return {
    alert_configurations_checked: alertConfigs?.length || 0,
    alerts_processed: processedAlerts.length,
    alerts: processedAlerts
  }
}

async function checkSpecificAlertCondition(supabase: any, config: any) {
  // This is a simplified implementation
  // In production, you'd have more sophisticated alert condition checking
  
  const recentAlerts = []
  
  // Check for recent system alerts matching this configuration
  const { data: systemAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .in('alert_type', config.alert_types)
    .in('severity', config.severity_levels)
    .eq('status', 'active')
    .gte('triggered_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  return systemAlerts || []
}

async function getSystemStatus(supabase: any) {
  // Get recent alerts
  const { data: recentAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('status', 'active')
    .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('triggered_at', { ascending: false })

  // Get system metrics
  const { data: recentMetrics } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false })

  // Calculate overall system health
  const criticalAlerts = recentAlerts?.filter(a => a.severity === 'critical') || []
  const warningAlerts = recentAlerts?.filter(a => a.severity === 'warning') || []

  let overallStatus = 'healthy'
  if (criticalAlerts.length > 0) {
    overallStatus = 'critical'
  } else if (warningAlerts.length > 0) {
    overallStatus = 'degraded'
  }

  return {
    overall_status: overallStatus,
    active_alerts: recentAlerts?.length || 0,
    critical_alerts: criticalAlerts.length,
    warning_alerts: warningAlerts.length,
    recent_metrics: recentMetrics?.length || 0,
    last_check: new Date().toISOString(),
    alerts: recentAlerts?.slice(0, 10) || [],
    key_metrics: summarizeKeyMetrics(recentMetrics || [])
  }
}

function summarizeKeyMetrics(metrics: any[]) {
  const summary: Record<string, any> = {}
  
  for (const metric of metrics) {
    if (!summary[metric.metric_name]) {
      summary[metric.metric_name] = {
        latest_value: metric.value,
        metric_type: metric.metric_type,
        last_updated: metric.recorded_at
      }
    }
  }
  
  return summary
}