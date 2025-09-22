
interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimitingService {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  private rules: Record<string, RateLimitRule> = {
    'qr_generation': { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    'payment_creation': { maxRequests: 5, windowMs: 60000 }, // 5 per minute
    'share_action': { maxRequests: 20, windowMs: 60000 }, // 20 per minute
    'api_call': { maxRequests: 100, windowMs: 60000 } // 100 per minute
  };

  isAllowed(action: string, identifier: string = 'default'): boolean {
    const rule = this.rules[action];
    if (!rule) return true; // No rule defined, allow by default

    const key = `${action}:${identifier}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(key, {
        count: 1,
        resetTime: now + rule.windowMs
      });
      return true;
    }

    if (entry.count >= rule.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    entry.count++;
    this.limits.set(key, entry);
    return true;
  }

  getRemainingRequests(action: string, identifier: string = 'default'): number {
    const rule = this.rules[action];
    if (!rule) return Infinity;

    const key = `${action}:${identifier}`;
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return rule.maxRequests;
    }

    return Math.max(0, rule.maxRequests - entry.count);
  }

  getResetTime(action: string, identifier: string = 'default'): number {
    const key = `${action}:${identifier}`;
    const entry = this.limits.get(key);
    return entry?.resetTime || 0;
  }
}

export const rateLimitingService = new RateLimitingService();
