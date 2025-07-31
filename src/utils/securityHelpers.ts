/**
 * Security Helper Functions for EasyMO Admin Panel
 * 
 * This module provides comprehensive security utilities including
 * input validation, sanitization, encryption helpers, and security
 * monitoring functions.
 */

import { supabase } from '@/integrations/supabase/client';

// Constants for security configuration
export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_TIMEOUT_MINUTES: 30,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_SPECIAL_CHARS: true,
  PHONE_VALIDATION_PATTERN: /^(\+250|250|0)[0-9]{9}$/,
  EMAIL_VALIDATION_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']
  }
} as const;

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PASSWORD_CHANGE = 'password_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_EXPORT = 'data_export',
  ADMIN_ACTION = 'admin_action',
  FILE_UPLOAD = 'file_upload',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SecurityEvent {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  source_ip: string;
  user_id?: string;
  details?: Record<string, any>;
  user_agent?: string;
  session_id?: string;
}

/**
 * Input Sanitization Functions
 */
export class InputSanitizer {
  private static xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[\s\S]*?>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  private static sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b\d+\s*=\s*\d+\b)/g,
    /(\b(OR|AND)\s+[\w"']+\s*(=|LIKE)\s*[\w"']+)/gi
  ];

  /**
   * Sanitize text input for XSS and SQL injection
   */
  static sanitizeText(input: string, options: {
    allowHtml?: boolean;
    maxLength?: number;
    removeSpecialChars?: boolean;
  } = {}): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input.trim();

    // Truncate if needed
    if (options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove XSS patterns
    if (!options.allowHtml) {
      this.xssPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
    }

    // Remove SQL injection patterns
    this.sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove special characters if requested
    if (options.removeSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&]/g, '');
    }

    return sanitized;
  }

  /**
   * Sanitize phone number input
   */
  static sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Rwanda phone number normalization
    if (cleaned.startsWith('0')) {
      cleaned = '+250' + cleaned.substring(1);
    } else if (cleaned.startsWith('250')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+250')) {
      cleaned = '+250' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    return email.toLowerCase().trim().replace(/[^\w@.\-+]/g, '');
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';
    
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }
}

/**
 * Input Validation Functions
 */
export class InputValidator {
  /**
   * Validate Rwanda phone number
   */
  static isValidPhoneNumber(phone: string): boolean {
    const sanitized = InputSanitizer.sanitizePhoneNumber(phone);
    return SECURITY_CONFIG.PHONE_VALIDATION_PATTERN.test(sanitized);
  }

  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    const sanitized = InputSanitizer.sanitizeEmail(email);
    return SECURITY_CONFIG.EMAIL_VALIDATION_PATTERN.test(sanitized);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
    } else {
      score += Math.min(password.length * 2, 20);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15;
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/g, // Repeated characters
      /123456|654321|qwerty|password|admin/gi, // Common sequences
    ];

    commonPatterns.forEach(pattern => {
      if (pattern.test(password)) {
        score -= 10;
        errors.push('Password contains common patterns');
      }
    });

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, Math.min(100, score))
    };
  }

  /**
   * Validate file upload
   */
  static validateFile(file: File): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check file size
    if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      errors.push(`File size must be less than ${SECURITY_CONFIG.MAX_FILE_SIZE_MB}MB`);
    }

    // Check file type
    if (!SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(file.type as any)) {
      errors.push('File type not allowed');
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|sh|php|jsp|asp)$/i,
      /<script/i,
      /javascript:/i
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(file.name)) {
        errors.push('Filename contains suspicious patterns');
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Security Event Logging
 */
export class SecurityLogger {
  /**
   * Log a security event
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: event.event_type,
          severity: event.severity,
          source_ip: event.source_ip,
          user_id: event.user_id,
          details: event.details || {},
          user_agent: event.user_agent,
          session_id: event.session_id
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // For critical events, also log to console for immediate visibility
      if (event.severity === SecuritySeverity.CRITICAL) {
        console.warn('CRITICAL SECURITY EVENT:', event);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Log user authentication event
   */
  static async logAuthEvent(success: boolean, userId?: string, details?: any): Promise<void> {
    const clientInfo = this.getClientInfo();
    
    await this.logSecurityEvent({
      event_type: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
      severity: success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      source_ip: clientInfo.ip,
      user_id: userId,
      details: {
        timestamp: new Date().toISOString(),
        ...details
      },
      user_agent: clientInfo.userAgent
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspiciousActivity(description: string, details?: any): Promise<void> {
    const clientInfo = this.getClientInfo();
    
    await this.logSecurityEvent({
      event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.HIGH,
      source_ip: clientInfo.ip,
      details: {
        description,
        timestamp: new Date().toISOString(),
        ...details
      },
      user_agent: clientInfo.userAgent
    });
  }

  /**
   * Get client information
   */
  private static getClientInfo(): { ip: string; userAgent: string } {
    return {
      ip: 'unknown', // In a real app, you'd get this from headers
      userAgent: navigator.userAgent || 'unknown'
    };
  }
}

/**
 * Rate Limiting Utilities
 */
export class RateLimiter {
  private static readonly storage = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request is within rate limit
   */
  static isWithinLimit(identifier: string, maxRequests: number = SECURITY_CONFIG.RATE_LIMIT_REQUESTS_PER_MINUTE, windowMs: number = 60000): boolean {
    const now = Date.now();
    const key = `${identifier}_${Math.floor(now / windowMs)}`;
    
    const current = this.storage.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > current.resetTime) {
      // Reset the counter
      current.count = 0;
      current.resetTime = now + windowMs;
    }
    
    current.count++;
    this.storage.set(key, current);
    
    // Clean up old entries
    this.cleanup();
    
    return current.count <= maxRequests;
  }

  /**
   * Clean up expired rate limit entries
   */
  private static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.storage.entries()) {
      if (now > value.resetTime + 60000) { // Clean up entries older than 1 minute
        this.storage.delete(key);
      }
    }
  }
}

/**
 * Session Security Utilities
 */
export class SessionSecurity {
  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(lastActivity: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return diffMinutes > SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

/**
 * Content Security Policy Utilities
 */
export class CSPHelper {
  /**
   * Generate CSP header value
   */
  static generateCSPHeader(): string {
    const directives = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    
    return directives;
  }

  /**
   * Validate inline script with nonce
   */
  static validateScriptNonce(nonce: string): boolean {
    // In a real implementation, you'd validate against your nonce store
    return /^[a-zA-Z0-9+/]{24}={0,2}$/.test(nonce);
  }
}

export default {
  InputSanitizer,
  InputValidator,
  SecurityLogger,
  RateLimiter,
  SessionSecurity,
  CSPHelper,
  SECURITY_CONFIG,
  SecurityEventType,
  SecuritySeverity
};