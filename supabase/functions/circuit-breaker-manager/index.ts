import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface CircuitBreakerCheck {
  serviceName: string;
  operation: string;
}

interface CircuitBreakerResult {
  canProceed: boolean;
  status: 'closed' | 'open' | 'half_open';
  reason?: string;
  nextCheck?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'check':
        return await checkCircuitBreaker(req, supabase);
      case 'record_success':
        return await recordSuccess(req, supabase);
      case 'record_failure':
        return await recordFailure(req, supabase);
      case 'reset':
        return await resetCircuitBreaker(req, supabase);
      case 'status':
        return await getCircuitBreakerStatus(req, supabase);
      case 'monitor':
        return await monitorCircuitBreakers(req, supabase);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('❌ Circuit breaker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function checkCircuitBreaker(req: Request, supabase: any): Promise<Response> {
  const { serviceName } = await req.json() as CircuitBreakerCheck;

  console.log(`🔌 Checking circuit breaker: ${serviceName}`);

  // Get or create circuit breaker
  let { data: breaker } = await supabase
    .from('circuit_breakers')
    .select('*')
    .eq('service_name', serviceName)
    .single();

  if (!breaker) {
    // Create new circuit breaker with default settings
    const { data: newBreaker } = await supabase
      .from('circuit_breakers')
      .insert({
        service_name: serviceName,
        status: 'closed',
        failure_count: 0,
        failure_threshold: 5,
        recovery_timeout_seconds: 300
      })
      .select()
      .single();
    
    breaker = newBreaker;
  }

  const result = await evaluateCircuitBreaker(breaker);
  
  // Update status if needed
  if (result.status !== breaker.status) {
    await supabase
      .from('circuit_breakers')
      .update({ 
        status: result.status,
        updated_at: new Date().toISOString()
      })
      .eq('service_name', serviceName);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function recordSuccess(req: Request, supabase: any): Promise<Response> {
  const { serviceName } = await req.json();

  console.log(`✅ Recording success for: ${serviceName}`);

  const { data: breaker } = await supabase
    .from('circuit_breakers')
    .select('*')
    .eq('service_name', serviceName)
    .single();

  if (!breaker) {
    return new Response(JSON.stringify({ error: 'Circuit breaker not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Reset failure count on success
  const updates: any = {
    failure_count: 0,
    updated_at: new Date().toISOString()
  };

  // If in half-open state and we got success, close the circuit
  if (breaker.status === 'half_open') {
    updates.status = 'closed';
    updates.last_failure_time = null;
  }

  await supabase
    .from('circuit_breakers')
    .update(updates)
    .eq('service_name', serviceName);

  return new Response(JSON.stringify({ success: true, status: updates.status || breaker.status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function recordFailure(req: Request, supabase: any): Promise<Response> {
  const { serviceName, error } = await req.json();

  console.log(`❌ Recording failure for: ${serviceName}`);

  const { data: breaker } = await supabase
    .from('circuit_breakers')
    .select('*')
    .eq('service_name', serviceName)
    .single();

  if (!breaker) {
    return new Response(JSON.stringify({ error: 'Circuit breaker not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const newFailureCount = breaker.failure_count + 1;
  const updates: any = {
    failure_count: newFailureCount,
    last_failure_time: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...breaker.metadata,
      last_error: error,
      last_failure_timestamp: Date.now()
    }
  };

  // Open circuit if threshold exceeded
  if (newFailureCount >= breaker.failure_threshold && breaker.status === 'closed') {
    updates.status = 'open';
  }

  await supabase
    .from('circuit_breakers')
    .update(updates)
    .eq('service_name', serviceName);

  return new Response(JSON.stringify({ 
    success: true, 
    status: updates.status || breaker.status,
    failureCount: newFailureCount,
    threshold: breaker.failure_threshold
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function resetCircuitBreaker(req: Request, supabase: any): Promise<Response> {
  const { serviceName } = await req.json();

  console.log(`🔄 Resetting circuit breaker: ${serviceName}`);

  await supabase
    .from('circuit_breakers')
    .update({
      status: 'closed',
      failure_count: 0,
      last_failure_time: null,
      updated_at: new Date().toISOString()
    })
    .eq('service_name', serviceName);

  return new Response(JSON.stringify({ success: true, status: 'closed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getCircuitBreakerStatus(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url);
  const serviceName = url.searchParams.get('service');

  if (serviceName) {
    const { data: breaker } = await supabase
      .from('circuit_breakers')
      .select('*')
      .eq('service_name', serviceName)
      .single();

    return new Response(JSON.stringify(breaker), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    const { data: breakers } = await supabase
      .from('circuit_breakers')
      .select('*')
      .order('updated_at', { ascending: false });

    return new Response(JSON.stringify({ breakers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function monitorCircuitBreakers(req: Request, supabase: any): Promise<Response> {
  console.log(`📊 Monitoring circuit breakers`);

  const { data: breakers } = await supabase
    .from('circuit_breakers')
    .select('*');

  const alerts = [];
  const updates = [];

  for (const breaker of breakers || []) {
    const evaluation = await evaluateCircuitBreaker(breaker);
    
    // Check if we need to transition states
    if (evaluation.status !== breaker.status) {
      await supabase
        .from('circuit_breakers')
        .update({ 
          status: evaluation.status,
          updated_at: new Date().toISOString()
        })
        .eq('service_name', breaker.service_name);

      updates.push({
        service: breaker.service_name,
        oldStatus: breaker.status,
        newStatus: evaluation.status
      });
    }

    // Generate alerts for problematic services
    if (evaluation.status === 'open') {
      alerts.push({
        service: breaker.service_name,
        message: `Service ${breaker.service_name} is down (circuit open)`,
        severity: 'critical',
        failureCount: breaker.failure_count,
        threshold: breaker.failure_threshold
      });
    } else if (evaluation.status === 'half_open') {
      alerts.push({
        service: breaker.service_name,
        message: `Service ${breaker.service_name} is recovering (circuit half-open)`,
        severity: 'warning'
      });
    }
  }

  // Store alerts in monitoring system
  for (const alert of alerts) {
    await supabase
      .from('system_alerts')
      .upsert({
        alert_type: 'circuit_breaker',
        service_name: alert.service,
        severity: alert.severity,
        message: alert.message,
        metadata: alert,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'alert_type,service_name'
      });
  }

  return new Response(JSON.stringify({ 
    success: true,
    monitored: breakers?.length || 0,
    alerts: alerts.length,
    updates: updates.length,
    details: { alerts, updates }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function evaluateCircuitBreaker(breaker: any): Promise<CircuitBreakerResult> {
  const now = new Date();
  const lastFailure = breaker.last_failure_time ? new Date(breaker.last_failure_time) : null;
  const timeSinceFailure = lastFailure ? now.getTime() - lastFailure.getTime() : Infinity;
  const recoveryTimeoutMs = breaker.recovery_timeout_seconds * 1000;

  switch (breaker.status) {
    case 'closed':
      // Circuit is closed - allow all requests
      return {
        canProceed: true,
        status: 'closed'
      };

    case 'open':
      // Circuit is open - check if recovery timeout has passed
      if (timeSinceFailure >= recoveryTimeoutMs) {
        return {
          canProceed: true,
          status: 'half_open'
        };
      } else {
        const nextCheckTime = new Date(lastFailure!.getTime() + recoveryTimeoutMs);
        return {
          canProceed: false,
          status: 'open',
          reason: `Service failed ${breaker.failure_count} times. Circuit will attempt recovery at ${nextCheckTime.toISOString()}`,
          nextCheck: nextCheckTime.toISOString()
        };
      }

    case 'half_open':
      // Circuit is half-open - allow limited requests to test recovery
      return {
        canProceed: true,
        status: 'half_open'
      };

    default:
      return {
        canProceed: true,
        status: 'closed'
      };
  }
}