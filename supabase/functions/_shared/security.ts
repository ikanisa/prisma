import { supabaseClient } from "./client.ts";
/**
 * Production security utilities
 * Comprehensive security measures for edge functions
 */

import { logger } from "./logger.ts";

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    requests: number;
    windowMs: number;
  };
  inputValidation: {
    maxPayloadSize: number;
    allowedMethods: string[];
  };
  cors: {
    allowedOrigins: string[];
    allowedHeaders: string[];
  };
}

export class SecurityManager {
  private static instance: SecurityManager;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private getClientIP(request: Request): string {
    return request.headers.get('cf-connecting-ip') || 
           request.headers.get('x-forwarded-for') || 
           'unknown';
  }

  async validateHmacSignature(
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
        ['sign', 'verify']
      );

      const expectedSignature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payload)
      );

      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const receivedHex = signature.replace('sha256=', '');
      
      return expectedHex === receivedHex;
    } catch (error) {
      logger.error('HMAC validation error', error);
      return false;
    }
  }

  checkRateLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime < now) {
        this.rateLimitStore.delete(key);
      }
    }

    const current = this.rateLimitStore.get(identifier);
    
    if (!current || current.resetTime < now) {
      // New window
      this.rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  validateRequestSize(request: Request, maxSize: number = 1024 * 1024): boolean {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return false;
    }
    return true;
  }

  sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'content-type',
      'authorization',
      'user-agent',
      'x-forwarded-for',
      'cf-connecting-ip'
    ];

    for (const [key, value] of headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value.substring(0, 1000); // Limit header length
      }
    }

    return sanitized;
  }

  async logSecurityEvent(event: {
    type: 'rate_limit_exceeded' | 'invalid_signature' | 'suspicious_payload' | 'malformed_request';
    severity: 'low' | 'medium' | 'high' | 'critical';
    clientIP: string;
    userAgent?: string;
    endpoint: string;
    details?: Record<string, any>;
  }): Promise<void> {
    logger.warn('Security event', {
      security_event: event.type,
      severity: event.severity,
      client_ip: event.clientIP,
      endpoint: event.endpoint,
      details: event.details
    });

    // Could integrate with external security monitoring here
    if (event.severity === 'critical') {
      logger.error('CRITICAL SECURITY EVENT', event);
    }
  }

  async checkRequestSecurity(
    request: Request,
    config: Partial<SecurityConfig> = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    headers?: Record<string, string>;
  }> {
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const url = new URL(request.url);

    // Check request size
    if (!this.validateRequestSize(request, config.inputValidation?.maxPayloadSize)) {
      await this.logSecurityEvent({
        type: 'malformed_request',
        severity: 'medium',
        clientIP,
        userAgent,
        endpoint: url.pathname,
        details: { reason: 'payload_too_large' }
      });
      return { allowed: false, reason: 'Payload too large' };
    }

    // Check rate limiting
    if (config.rateLimiting?.enabled) {
      const rateLimit = this.checkRateLimit(
        clientIP,
        config.rateLimiting.requests,
        config.rateLimiting.windowMs
      );

      if (!rateLimit.allowed) {
        await this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          clientIP,
          userAgent,
          endpoint: url.pathname
        });
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': config.rateLimiting.requests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
          }
        };
      }
    }

    // Check allowed methods
    if (config.inputValidation?.allowedMethods) {
      if (!config.inputValidation.allowedMethods.includes(request.method)) {
        await this.logSecurityEvent({
          type: 'malformed_request',
          severity: 'low',
          clientIP,
          userAgent,
          endpoint: url.pathname,
          details: { method: request.method }
        });
        return { allowed: false, reason: 'Method not allowed' };
      }
    }

    return { allowed: true };
  }
}

export class InputSanitizer {
  static sanitizeString(input: string, maxLength: number = 1000): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, maxLength)
      .trim();
  }

  static sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '').substring(0, 20);
  }

  static sanitizeEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.toLowerCase().trim().substring(0, 255);
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  static sanitizeObject(obj: any, depth: number = 0): any {
    if (depth > 10) return null; // Prevent deep nesting attacks
    
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 100).map(item => this.sanitizeObject(item, depth + 1));
    }

    const sanitized: any = {};
    const keys = Object.keys(obj).slice(0, 50); // Limit object keys
    
    for (const key of keys) {
      const sanitizedKey = this.sanitizeString(key, 100);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key], depth + 1);
      }
    }

    return sanitized;
  }
}

// Export singleton
export const securityManager = SecurityManager.getInstance();

// Common security configurations
export const SecurityConfigs = {
  webhook: {
    rateLimiting: {
      enabled: true,
      requests: 1000,
      windowMs: 60000 // 1 minute
    },
    inputValidation: {
      maxPayloadSize: 1024 * 1024, // 1MB
      allowedMethods: ['POST']
    }
  },
  api: {
    rateLimiting: {
      enabled: true,
      requests: 100,
      windowMs: 60000 // 1 minute
    },
    inputValidation: {
      maxPayloadSize: 512 * 1024, // 512KB
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  },
  publicEndpoint: {
    rateLimiting: {
      enabled: true,
      requests: 50,
      windowMs: 60000 // 1 minute
    },
    inputValidation: {
      maxPayloadSize: 256 * 1024, // 256KB
      allowedMethods: ['GET', 'POST']
    }
  }
};