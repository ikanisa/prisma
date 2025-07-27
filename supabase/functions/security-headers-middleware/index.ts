import { corsHeaders } from '../_shared/cors.ts'

const securityHeaders = {
  ...corsHeaders,
  // Security Headers
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: securityHeaders })
  }

  try {
    const { endpoint, method, user_agent, ip_address } = await req.json()

    // Security checks
    const securityChecks = await performSecurityChecks(req, {
      endpoint,
      method,
      user_agent,
      ip_address
    })

    if (!securityChecks.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Request blocked by security policy',
          reason: securityChecks.reason,
          request_id: securityChecks.request_id
        }),
        { 
          status: 403, 
          headers: {
            ...securityHeaders,
            'X-Request-ID': securityChecks.request_id
          }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        security_headers: Object.keys(securityHeaders),
        request_id: securityChecks.request_id
      }),
      { 
        status: 200, 
        headers: {
          ...securityHeaders,
          'X-Request-ID': securityChecks.request_id
        }
      }
    )

  } catch (error) {
    console.error('Security middleware error:', error)
    return new Response(
      JSON.stringify({ error: 'Security check failed' }),
      { status: 500, headers: securityHeaders }
    )
  }
})

async function performSecurityChecks(req: Request, data: any) {
  const request_id = crypto.randomUUID()
  const checks = []

  // 1. Rate limiting check
  const rateLimitResult = await checkRateLimit(data.ip_address, data.endpoint)
  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      request_id,
      details: rateLimitResult
    }
  }
  checks.push('rate_limit: passed')

  // 2. User agent validation
  const userAgentCheck = validateUserAgent(data.user_agent)
  if (!userAgentCheck.valid) {
    return {
      allowed: false,
      reason: 'Invalid user agent',
      request_id,
      details: userAgentCheck
    }
  }
  checks.push('user_agent: passed')

  // 3. Request size validation
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return {
      allowed: false,
      reason: 'Request too large',
      request_id
    }
  }
  checks.push('size: passed')

  // 4. Check for suspicious patterns
  const suspiciousCheck = await checkSuspiciousPatterns(req, data)
  if (!suspiciousCheck.safe) {
    return {
      allowed: false,
      reason: 'Suspicious request pattern detected',
      request_id,
      details: suspiciousCheck
    }
  }
  checks.push('pattern: passed')

  return {
    allowed: true,
    request_id,
    checks
  }
}

async function checkRateLimit(ip_address: string, endpoint: string) {
  // This would integrate with your rate limiting system
  // For now, return a basic check
  return {
    allowed: true,
    remaining: 100,
    reset_time: Date.now() + 3600000
  }
}

function validateUserAgent(user_agent?: string) {
  if (!user_agent) {
    return { valid: false, reason: 'Missing user agent' }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /hack/i,
    /exploit/i
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(user_agent)) {
      return { valid: false, reason: 'Suspicious user agent pattern' }
    }
  }

  return { valid: true }
}

async function checkSuspiciousPatterns(req: Request, data: any) {
  const suspiciousIndicators = []

  // Check request headers for injection attempts
  const headers = Object.fromEntries(req.headers.entries())
  for (const [key, value] of Object.entries(headers)) {
    if (value.includes('script>') || value.includes('javascript:') || value.includes('data:')) {
      suspiciousIndicators.push(`Suspicious header: ${key}`)
    }
  }

  // Check URL for SQL injection patterns
  const url = new URL(req.url)
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /script\s*:/i
  ]

  for (const pattern of sqlPatterns) {
    if (pattern.test(url.search) || pattern.test(url.pathname)) {
      suspiciousIndicators.push('SQL injection pattern detected')
    }
  }

  return {
    safe: suspiciousIndicators.length === 0,
    indicators: suspiciousIndicators
  }
}