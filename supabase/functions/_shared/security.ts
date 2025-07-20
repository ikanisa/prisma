import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Validates WhatsApp webhook signature using HMAC-SHA256
 */
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hmac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(hmac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Log validation attempt
    await supabase.from('security_events').insert({
      event_type: 'webhook_signature_validation',
      details: {
        signature_valid: expectedSignature === signature,
        timestamp: new Date().toISOString()
      }
    });
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Rate limiting for webhook endpoints
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'rate_limit_check')
      .gte('created_at', windowStart)
      .like('details->>identifier', identifier);
    
    // Log rate limit check
    await supabase.from('security_events').insert({
      event_type: 'rate_limit_check',
      details: {
        identifier,
        current_count: count || 0,
        max_requests: maxRequests,
        window_minutes: windowMinutes
      }
    });
    
    return (count || 0) < maxRequests;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error to prevent blocking
  }
}

/**
 * Logs security events
 */
export async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000); // Limit length
}