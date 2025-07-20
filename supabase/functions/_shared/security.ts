// SECURITY: Input validation and prompt injection protection

export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potential system prompt injection attempts
  const cleaned = input
    .replace(/system:|assistant:|user:/gi, '')
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/<script[^>]*>.*?<\/script>/gi, '[script removed]')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\s*\(/gi, '')
    .trim();

  // Limit length to prevent token exhaustion attacks
  return cleaned.substring(0, 1000);
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Basic phone validation (adjust for your region)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with country code
  if (cleaned.startsWith('250')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+250' + cleaned.substring(1);
  }
  
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

export function validateMessagePayload(payload: any): { isValid: boolean; error?: string } {
  if (!payload) {
    return { isValid: false, error: 'Missing payload' };
  }

  if (typeof payload !== 'object') {
    return { isValid: false, error: 'Payload must be an object' };
  }

  // Check for required fields based on message type
  if (payload.platform === 'whatsapp') {
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      return { isValid: false, error: 'Missing WhatsApp message data' };
    }
    
    if (!message.from || !message.type) {
      return { isValid: false, error: 'Missing required message fields' };
    }
  }

  return { isValid: true };
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 15,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    
    // Check if we've exceeded the limit
    if (validRequests.length >= this.maxRequests) {
      return true;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return false;
  }
}

export function logSecurityEvent(event: {
  type: 'webhook_signature_failure' | 'rate_limit_exceeded' | 'invalid_payload' | 'prompt_injection_attempt';
  source: string;
  details: any;
}) {
  const timestamp = new Date().toISOString();
  console.warn(`🚨 SECURITY EVENT [${timestamp}]: ${event.type} from ${event.source}`, event.details);
  
  // In production, you'd want to send this to a security monitoring system
  // Example: send to Sentry, DataDog, or custom logging endpoint
}