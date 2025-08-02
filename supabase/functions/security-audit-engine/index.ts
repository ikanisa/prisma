import { supabaseClient } from "./client.ts";

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface SecurityEvent {
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source_ip?: string
  user_agent?: string
  endpoint?: string
  user_id?: string
  phone_number?: string
  details?: Record<string, any>
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event, ip_address, user_agent, endpoint, user_id, phone_number } = await req.json()

    // Validate required fields
    if (!event?.event_type || !event?.severity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type, severity' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Enhanced threat detection
    const threatLevel = await analyzeThreatLevel(event, ip_address)
    
    // Log security event
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        event_type: event.event_type,
        severity: threatLevel.severity,
        source_ip: ip_address,
        user_agent: user_agent,
        endpoint: endpoint,
        user_id: user_id,
        phone_number: phone_number,
        details: {
          ...event.details,
          threat_score: threatLevel.score,
          analysis: threatLevel.analysis
        }
      })

    if (error) {
      console.error('Failed to log security event:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log security event' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Trigger alerts for high-risk events
    if (threatLevel.severity === 'critical' || threatLevel.severity === 'high') {
      await triggerSecurityAlert(event, threatLevel, ip_address)
    }

    // Auto-block for critical threats
    if (threatLevel.score >= 90) {
      await autoBlockThreat(ip_address, user_id, phone_number, event.event_type)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        threat_level: threatLevel,
        action_taken: threatLevel.score >= 90 ? 'auto_blocked' : 'logged'
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Security audit error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})

async function analyzeThreatLevel(event: SecurityEvent, ip_address?: string) {
  let score = 0
  let analysis: string[] = []
  let severity = event.severity

  // IP-based analysis
  if (ip_address) {
    const recentEvents = await getRecentEventsByIP(ip_address)
    if (recentEvents > 10) {
      score += 20
      analysis.push('High frequency requests from IP')
    }
    
    // Check if IP is from suspicious geolocation (if available)
    const isVPN = await checkVPNIP(ip_address)
    if (isVPN) {
      score += 15
      analysis.push('Request from VPN/Proxy')
    }
  }

  // Event type specific scoring
  switch (event.event_type) {
    case 'failed_authentication':
      score += 30
      analysis.push('Authentication failure detected')
      break
    case 'rate_limit_exceeded':
      score += 25
      analysis.push('Rate limiting triggered')
      break
    case 'suspicious_payload':
      score += 40
      analysis.push('Malicious payload detected')
      break
    case 'sql_injection_attempt':
      score += 60
      severity = 'critical'
      analysis.push('SQL injection attempt')
      break
    case 'xss_attempt':
      score += 50
      severity = 'high'
      analysis.push('XSS attack attempt')
      break
  }

  // Adjust severity based on score
  if (score >= 80) severity = 'critical'
  else if (score >= 60) severity = 'high'
  else if (score >= 30) severity = 'medium'
  else severity = 'low'

  return { score, severity, analysis }
}

async function getRecentEventsByIP(ip_address: string): Promise<number> {
  const { count } = await supabase
    .from('security_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('source_ip', ip_address)
    .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour

  return count || 0
}

async function checkVPNIP(ip_address: string): Promise<boolean> {
  // Simple check - in production, integrate with IP intelligence service
  try {
    // This is a placeholder - integrate with actual VPN detection service
    const response = await fetch(`https://api.iplocation.net/?ip=${ip_address}`)
    const data = await response.json()
    return data.isp?.toLowerCase().includes('vpn') || 
           data.isp?.toLowerCase().includes('proxy') ||
           data.org?.toLowerCase().includes('hosting')
  } catch {
    return false
  }
}

async function triggerSecurityAlert(event: SecurityEvent, threatLevel: any, ip_address?: string) {
  // Log high-priority alert
  console.warn('SECURITY ALERT:', {
    event_type: event.event_type,
    threat_level: threatLevel,
    ip_address,
    timestamp: new Date().toISOString()
  })

  // In production, integrate with alerting systems (Slack, PagerDuty, etc.)
  // await notifySecurityTeam(event, threatLevel, ip_address)
}

async function autoBlockThreat(ip_address?: string, user_id?: string, phone_number?: string, event_type?: string) {
  if (ip_address) {
    // Add to rate limit tracker with extended block
    await supabase
      .from('rate_limit_tracker')
      .insert({
        identifier: ip_address,
        endpoint: 'global_block',
        request_count: 999,
        blocked_until: new Date(Date.now() + 86400000).toISOString() // 24 hours
      })
  }

  if (phone_number) {
    // Add to contact limits with opt-out
    await supabase
      .from('contact_limits')
      .insert({
        phone_number,
        is_opted_out: true,
        opt_out_reason: `Auto-blocked due to ${event_type}`,
        opt_out_at: new Date().toISOString()
      })
  }

  console.log('Auto-blocked threat:', { ip_address, user_id, phone_number, event_type })
}