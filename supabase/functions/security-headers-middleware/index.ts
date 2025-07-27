import { corsHeaders } from '../_shared/cors.ts'

const securityHeaders = {
  ...corsHeaders,
  // Enhanced Security Headers
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  'X-Request-ID': crypto.randomUUID(),
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
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
  const startTime = Date.now()

  // 1. Enhanced Rate limiting check
  const rateLimitResult = await checkRateLimit(data.ip_address, data.endpoint)
  if (!rateLimitResult.allowed) {
    await logSecurityEvent('rate_limit_exceeded', 'high', data.ip_address, request_id, rateLimitResult)
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      request_id,
      details: rateLimitResult
    }
  }
  checks.push('rate_limit: passed')

  // 2. Enhanced User agent validation
  const userAgentCheck = validateUserAgent(data.user_agent)
  if (!userAgentCheck.valid) {
    await logSecurityEvent('invalid_user_agent', 'medium', data.ip_address, request_id, userAgentCheck)
    return {
      allowed: false,
      reason: 'Invalid user agent',
      request_id,
      details: userAgentCheck
    }
  }
  checks.push('user_agent: passed')

  // 3. Request size validation with enhanced limits
  const contentLength = req.headers.get('content-length')
  const maxSize = data.endpoint?.includes('upload') ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for uploads, 10MB for others
  if (contentLength && parseInt(contentLength) > maxSize) {
    await logSecurityEvent('request_too_large', 'medium', data.ip_address, request_id, { size: contentLength, limit: maxSize })
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
    await logSecurityEvent('suspicious_pattern', 'high', data.ip_address, request_id, suspiciousCheck)
    return {
      allowed: false,
      reason: 'Suspicious request pattern detected',
      request_id,
      details: suspiciousCheck
    }
  }
  checks.push('pattern: passed')

  // 5. Geographic validation (basic)
  const geoCheck = await validateGeographicAccess(data.ip_address)
  if (!geoCheck.allowed) {
    await logSecurityEvent('geo_blocked', 'high', data.ip_address, request_id, geoCheck)
    return {
      allowed: false,
      reason: 'Geographic access denied',
      request_id,
      details: geoCheck
    }
  }
  checks.push('geo: passed')

  const processingTime = Date.now() - startTime
  await logSecurityEvent('security_check_passed', 'low', data.ip_address, request_id, { 
    checks, 
    processing_time_ms: processingTime 
  })

  return {
    allowed: true,
    request_id,
    checks,
    processing_time_ms: processingTime
  }
}

async function checkRateLimit(ip_address: string, endpoint: string) {
  try {
    // Enhanced rate limiting with different limits per endpoint type
    const limits = {
      '/auth': { max: 10, window: 300 }, // 10 requests per 5 minutes for auth
      '/api/upload': { max: 5, window: 300 }, // 5 uploads per 5 minutes
      '/api/payment': { max: 3, window: 600 }, // 3 payments per 10 minutes
      'default': { max: 100, window: 3600 } // 100 requests per hour for others
    }
    
    const limit = limits[endpoint] || limits.default
    const window_start = new Date(Date.now() - (limit.window * 1000))
    
    // This would normally check against your rate limiting store
    // For security middleware, we simulate a check
    const current_requests = Math.floor(Math.random() * (limit.max + 10))
    const remaining = Math.max(0, limit.max - current_requests)
    const allowed = current_requests < limit.max
    
    return {
      allowed,
      remaining,
      reset_time: Date.now() + (limit.window * 1000),
      window_seconds: limit.window,
      max_requests: limit.max,
      current_requests
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail secure - deny on error
    return {
      allowed: false,
      remaining: 0,
      reset_time: Date.now() + 3600000,
      error: 'Rate limit service unavailable'
    }
  }
}

function validateUserAgent(user_agent?: string) {
  if (!user_agent) {
    return { valid: false, reason: 'Missing user agent', score: 0 }
  }

  if (user_agent.length < 10 || user_agent.length > 500) {
    return { valid: false, reason: 'Invalid user agent length', score: 0 }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /curl/i, score: -50, reason: 'curl detected' },
    { pattern: /wget/i, score: -50, reason: 'wget detected' },
    { pattern: /python/i, score: -30, reason: 'python detected' },
    { pattern: /bot/i, score: -20, reason: 'bot detected' },
    { pattern: /crawler/i, score: -20, reason: 'crawler detected' },
    { pattern: /scanner/i, score: -40, reason: 'scanner detected' },
    { pattern: /hack/i, score: -60, reason: 'hack detected' },
    { pattern: /exploit/i, score: -60, reason: 'exploit detected' },
    { pattern: /sqlmap/i, score: -80, reason: 'sqlmap detected' },
    { pattern: /nikto/i, score: -80, reason: 'nikto detected' }
  ]

  // Check for legitimate patterns
  const legitimatePatterns = [
    { pattern: /mozilla/i, score: 30, reason: 'mozilla detected' },
    { pattern: /chrome/i, score: 25, reason: 'chrome detected' },
    { pattern: /safari/i, score: 25, reason: 'safari detected' },
    { pattern: /firefox/i, score: 25, reason: 'firefox detected' },
    { pattern: /edge/i, score: 25, reason: 'edge detected' }
  ]

  let score = 50 // Start with neutral score
  const reasons = []

  for (const { pattern, score: patternScore, reason } of suspiciousPatterns) {
    if (pattern.test(user_agent)) {
      score += patternScore
      reasons.push(reason)
    }
  }

  for (const { pattern, score: patternScore, reason } of legitimatePatterns) {
    if (pattern.test(user_agent)) {
      score += patternScore
      reasons.push(reason)
    }
  }

  const valid = score > 20 // Threshold for validity
  
  return { 
    valid, 
    reason: valid ? 'Valid user agent' : `Suspicious user agent: ${reasons.join(', ')}`,
    score,
    reasons
  }
}

async function checkSuspiciousPatterns(req: Request, data: any) {
  const suspiciousIndicators = []
  const severity = { low: 0, medium: 0, high: 0 }

  // Check request headers for injection attempts
  const headers = Object.fromEntries(req.headers.entries())
  for (const [key, value] of Object.entries(headers)) {
    // XSS patterns
    if (value.includes('<script') || value.includes('javascript:') || value.includes('data:text/html')) {
      suspiciousIndicators.push(`XSS attempt in header: ${key}`)
      severity.high++
    }
    
    // Command injection patterns
    if (value.includes('$(') || value.includes('`') || value.includes('&&') || value.includes('||')) {
      suspiciousIndicators.push(`Command injection attempt in header: ${key}`)
      severity.high++
    }
    
    // Path traversal
    if (value.includes('../') || value.includes('..\\') || value.includes('%2e%2e')) {
      suspiciousIndicators.push(`Path traversal attempt in header: ${key}`)
      severity.medium++
    }
  }

  // Check URL for various attack patterns
  const url = new URL(req.url)
  const fullUrl = url.pathname + url.search

  // SQL injection patterns
  const sqlPatterns = [
    { pattern: /union\s+select/i, name: 'UNION SELECT injection' },
    { pattern: /drop\s+table/i, name: 'DROP TABLE injection' },
    { pattern: /insert\s+into/i, name: 'INSERT injection' },
    { pattern: /delete\s+from/i, name: 'DELETE injection' },
    { pattern: /update\s+set/i, name: 'UPDATE injection' },
    { pattern: /exec\s*\(/i, name: 'EXEC injection' },
    { pattern: /or\s+1\s*=\s*1/i, name: 'Boolean injection' },
    { pattern: /'\s*or\s*'.*'=/i, name: 'String injection' },
    { pattern: /--/i, name: 'SQL comment injection' }
  ]

  // XSS patterns
  const xssPatterns = [
    { pattern: /<script/i, name: 'Script tag XSS' },
    { pattern: /javascript:/i, name: 'JavaScript protocol XSS' },
    { pattern: /on\w+\s*=/i, name: 'Event handler XSS' },
    { pattern: /<iframe/i, name: 'Iframe XSS' },
    { pattern: /eval\s*\(/i, name: 'Eval XSS' }
  ]

  // Check SQL patterns
  for (const { pattern, name } of sqlPatterns) {
    if (pattern.test(fullUrl)) {
      suspiciousIndicators.push(`SQL injection attempt: ${name}`)
      severity.high++
    }
  }

  // Check XSS patterns
  for (const { pattern, name } of xssPatterns) {
    if (pattern.test(fullUrl)) {
      suspiciousIndicators.push(`XSS attempt: ${name}`)
      severity.high++
    }
  }

  // Check for suspicious file access patterns
  const filePatterns = [
    { pattern: /\/etc\/passwd/i, name: 'System file access' },
    { pattern: /\/proc\/self\/environ/i, name: 'Environment file access' },
    { pattern: /\.\.\/.*\.php/i, name: 'PHP file traversal' },
    { pattern: /\.(exe|dll|bat|cmd|sh)$/i, name: 'Executable file access' }
  ]

  for (const { pattern, name } of filePatterns) {
    if (pattern.test(fullUrl)) {
      suspiciousIndicators.push(`Suspicious file access: ${name}`)
      severity.medium++
    }
  }

  // Calculate overall risk score
  const riskScore = (severity.high * 3) + (severity.medium * 2) + (severity.low * 1)
  const isSafe = riskScore < 3 // Allow up to 2 medium or 1 high severity issue

  return {
    safe: isSafe,
    indicators: suspiciousIndicators,
    severity,
    risk_score: riskScore,
    analysis: {
      total_patterns: suspiciousIndicators.length,
      high_severity: severity.high,
      medium_severity: severity.medium,
      low_severity: severity.low
    }
  }
}

async function validateGeographicAccess(ip_address: string) {
  try {
    // Basic geographic validation - in production you'd use a real IP geolocation service
    // For now, we'll allow all but implement the structure
    
    // Blocked countries or regions would go here
    const blockedCountries = ['XX'] // Example blocked country codes
    const allowedCountries = ['RW', 'UG', 'KE', 'TZ'] // East African countries for easyMO
    
    // Simulate IP lookup (in production use MaxMind, IPinfo, etc.)
    const geoInfo = {
      country: 'RW', // Default to Rwanda for simulation
      region: 'Kigali',
      city: 'Kigali',
      isp: 'Unknown'
    }
    
    const isBlocked = blockedCountries.includes(geoInfo.country)
    const isAllowed = allowedCountries.length === 0 || allowedCountries.includes(geoInfo.country)
    
    return {
      allowed: !isBlocked && isAllowed,
      country: geoInfo.country,
      region: geoInfo.region,
      reason: isBlocked ? 'Country blocked' : !isAllowed ? 'Country not in allowlist' : 'Geographic access allowed'
    }
  } catch (error) {
    console.error('Geographic validation failed:', error)
    // Fail open for geo validation to avoid blocking legitimate users
    return {
      allowed: true,
      reason: 'Geographic validation unavailable'
    }
  }
}

async function logSecurityEvent(event_type: string, severity: string, ip_address: string, request_id: string, details: any) {
  try {
    // This would log to your security audit system
    console.log(`SECURITY EVENT: ${event_type} | ${severity} | ${ip_address} | ${request_id}`, details)
    
    // In production, you'd send this to your SIEM or security monitoring system
    // Example: await sendToSecuritySystem({ event_type, severity, ip_address, request_id, details, timestamp: new Date() })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}