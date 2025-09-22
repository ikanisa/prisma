export interface SecurityConfig {
  maxRequestSize: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  allowedOrigins: string[];
  trustedProxies: string[];
}

export class SecurityManager {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      rateLimitWindow: 60 * 1000, // 1 minute
      rateLimitMax: 100, // 100 requests per minute
      allowedOrigins: ['*'],
      trustedProxies: ['127.0.0.1', '::1'],
      ...config,
    };
  }

  validateContentLength(contentLength: string | null): void {
    if (!contentLength) return;
    
    const size = parseInt(contentLength);
    if (size > this.config.maxRequestSize) {
      throw new Error(`Request too large: ${size} bytes`);
    }
  }

  checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const client = this.requestCounts.get(clientId);

    if (!client || now > client.resetTime) {
      this.requestCounts.set(clientId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow,
      });
      return true;
    }

    if (client.count >= this.config.rateLimitMax) {
      return false;
    }

    client.count++;
    return true;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>&"']/g, (char) => {
        const map: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return map[char] || char;
      })
      .trim();
  }

  validateOrigin(origin: string | null): boolean {
    if (this.config.allowedOrigins.includes('*')) return true;
    if (!origin) return false;
    return this.config.allowedOrigins.includes(origin);
  }
}