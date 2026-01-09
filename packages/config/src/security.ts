/**
 * Security Configuration
 * 
 * Central security configuration for Prisma Core including:
 * - CSP (Content Security Policy) headers
 * - Security response headers
 * - WAF rule patterns
 * - Rate limiting configuration
 * 
 * @example
 * ```typescript
 * import { securityConfig, cspPolicy, wafRules } from '@prisma/security';
 * 
 * // Apply CSP headers
 * response.headers.set('Content-Security-Policy', cspPolicy.toString());
 * ```
 */

// ============================================================================
// CSP CONFIGURATION
// ============================================================================

export interface CSPDirective {
    name: string;
    values: string[];
}

export interface CSPConfig {
    directives: CSPDirective[];
    reportUri?: string;
    reportOnly?: boolean;
}

/**
 * Default CSP configuration for Prisma Core
 * Designed for balance between security and functionality
 */
export const cspConfig: CSPConfig = {
    directives: [
        {
            name: 'default-src',
            values: ["'self'"],
        },
        {
            name: 'script-src',
            values: [
                "'self'",
                "'unsafe-inline'",  // Required for some frameworks, consider nonce-based
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
            ],
        },
        {
            name: 'style-src',
            values: [
                "'self'",
                "'unsafe-inline'",  // Required for dynamic styles
                "https://fonts.googleapis.com",
            ],
        },
        {
            name: 'font-src',
            values: [
                "'self'",
                "https://fonts.gstatic.com",
                "data:",
            ],
        },
        {
            name: 'img-src',
            values: [
                "'self'",
                "data:",
                "blob:",
                "https:",  // Allow external images
            ],
        },
        {
            name: 'connect-src',
            values: [
                "'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://api.openai.com",
                "https://api.cohere.ai",
            ],
        },
        {
            name: 'frame-src',
            values: ["'self'"],
        },
        {
            name: 'frame-ancestors',
            values: ["'none'"],  // Prevent clickjacking
        },
        {
            name: 'form-action',
            values: ["'self'"],
        },
        {
            name: 'base-uri',
            values: ["'self'"],
        },
        {
            name: 'object-src',
            values: ["'none'"],
        },
        {
            name: 'upgrade-insecure-requests',
            values: [],
        },
    ],
    reportUri: '/api/csp-report',
    reportOnly: false,
};

/**
 * Generate CSP header string from config
 */
export function generateCSPHeader(config: CSPConfig = cspConfig): string {
    const parts: string[] = [];

    for (const directive of config.directives) {
        const value = directive.values.length > 0
            ? `${directive.name} ${directive.values.join(' ')}`
            : directive.name;
        parts.push(value);
    }

    if (config.reportUri) {
        parts.push(`report-uri ${config.reportUri}`);
    }

    return parts.join('; ');
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export interface SecurityHeaders {
    [key: string]: string;
}

/**
 * Recommended security headers for all responses
 */
export const securityHeaders: SecurityHeaders = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS protection (legacy, but still useful)
    'X-XSS-Protection': '1; mode=block',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (formerly Feature-Policy)
    'Permissions-Policy': [
        'accelerometer=()',
        'camera=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'payment=()',
        'usb=()',
    ].join(', '),

    // Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
};

// ============================================================================
// WAF RULES
// ============================================================================

export interface WAFRule {
    id: string;
    name: string;
    description: string;
    pattern: RegExp;
    action: 'block' | 'log' | 'challenge';
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'sqli' | 'xss' | 'rce' | 'lfi' | 'rfi' | 'path_traversal' | 'scanner' | 'bot';
}

/**
 * WAF rules for common attack patterns
 */
export const wafRules: WAFRule[] = [
    // SQL Injection patterns
    {
        id: 'sqli-001',
        name: 'SQL Injection - Union Select',
        description: 'Detects UNION SELECT injection attempts',
        pattern: /union\s+(all\s+)?select/i,
        action: 'block',
        severity: 'critical',
        category: 'sqli',
    },
    {
        id: 'sqli-002',
        name: 'SQL Injection - OR Boolean',
        description: 'Detects OR-based boolean injection',
        pattern: /'\s*(or|and)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
        action: 'block',
        severity: 'critical',
        category: 'sqli',
    },
    {
        id: 'sqli-003',
        name: 'SQL Injection - Comment Bypass',
        description: 'Detects SQL comment injection',
        pattern: /'\s*(--|#|\/\*)/i,
        action: 'block',
        severity: 'high',
        category: 'sqli',
    },
    {
        id: 'sqli-004',
        name: 'SQL Injection - Time-based',
        description: 'Detects time-based blind injection',
        pattern: /(sleep|benchmark|pg_sleep|waitfor\s+delay)/i,
        action: 'block',
        severity: 'critical',
        category: 'sqli',
    },

    // XSS patterns
    {
        id: 'xss-001',
        name: 'XSS - Script Tag',
        description: 'Detects script tag injection',
        pattern: /<script[^>]*>[\s\S]*?<\/script>/i,
        action: 'block',
        severity: 'high',
        category: 'xss',
    },
    {
        id: 'xss-002',
        name: 'XSS - Event Handler',
        description: 'Detects event handler injection',
        pattern: /on(load|error|click|mouseover|focus|blur)\s*=/i,
        action: 'block',
        severity: 'high',
        category: 'xss',
    },
    {
        id: 'xss-003',
        name: 'XSS - JavaScript URI',
        description: 'Detects javascript: URI injection',
        pattern: /javascript\s*:/i,
        action: 'block',
        severity: 'high',
        category: 'xss',
    },

    // Path traversal
    {
        id: 'path-001',
        name: 'Path Traversal',
        description: 'Detects directory traversal attempts',
        pattern: /\.\.[\/\\]/,
        action: 'block',
        severity: 'high',
        category: 'path_traversal',
    },
    {
        id: 'path-002',
        name: 'Path Traversal - Encoded',
        description: 'Detects encoded directory traversal',
        pattern: /(%2e%2e|%252e%252e|\.\.%2f|\.\.%5c)/i,
        action: 'block',
        severity: 'high',
        category: 'path_traversal',
    },

    // Remote Code Execution
    {
        id: 'rce-001',
        name: 'RCE - Command Injection',
        description: 'Detects command injection attempts',
        pattern: /[;&|`$]\s*(cat|ls|whoami|id|pwd|curl|wget|nc|bash|sh|cmd|powershell)/i,
        action: 'block',
        severity: 'critical',
        category: 'rce',
    },

    // Scanner/Bot detection
    {
        id: 'scanner-001',
        name: 'Security Scanner',
        description: 'Detects common security scanner patterns',
        pattern: /(sqlmap|nikto|nmap|acunetix|nessus|burp)/i,
        action: 'log',
        severity: 'medium',
        category: 'scanner',
    },
];

/**
 * Check input against WAF rules
 */
export function checkWAFRules(input: string): WAFRule | null {
    for (const rule of wafRules) {
        if (rule.pattern.test(input)) {
            return rule;
        }
    }
    return null;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    keyGenerator?: (req: unknown) => string;  // Key to identify client
    skipFailedRequests?: boolean;
    skipSuccessfulRequests?: boolean;
}

/**
 * Default rate limit configurations
 */
export const rateLimits: Record<string, RateLimitConfig> = {
    // General API rate limit
    api: {
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 100,
    },

    // Authentication endpoints
    auth: {
        windowMs: 15 * 60 * 1000,  // 15 minutes
        maxRequests: 10,
        skipSuccessfulRequests: true,  // Only count failed attempts
    },

    // AI/Agent endpoints (expensive)
    agent: {
        windowMs: 60 * 1000,
        maxRequests: 20,
    },

    // File upload endpoints
    upload: {
        windowMs: 60 * 1000,
        maxRequests: 10,
    },

    // Password reset
    passwordReset: {
        windowMs: 60 * 60 * 1000,  // 1 hour
        maxRequests: 3,
    },
};

// ============================================================================
// SECRETS MANAGEMENT
// ============================================================================

/**
 * Required secrets for Prisma Core
 * In production, these should be loaded from a secrets manager
 */
export const requiredSecrets = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_API_KEY',
    'DATABASE_URL',
] as const;

export const optionalSecrets = [
    'COHERE_API_KEY',
    'REDIS_URL',
    'SENTRY_DSN',
] as const;

export type RequiredSecret = typeof requiredSecrets[number];
export type OptionalSecret = typeof optionalSecrets[number];

/**
 * Validate that all required secrets are present
 */
export function validateSecrets(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const secret of requiredSecrets) {
        if (!process.env[secret]) {
            missing.push(secret);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

/**
 * Get a secret value with type safety
 */
export function getSecret(key: RequiredSecret | OptionalSecret): string | undefined {
    return process.env[key];
}

/**
 * Get a required secret, throwing if not present
 */
export function requireSecret(key: RequiredSecret): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required secret not found: ${key}`);
    }
    return value;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const securityConfig = {
    csp: cspConfig,
    headers: securityHeaders,
    waf: wafRules,
    rateLimits,
    requiredSecrets,
    optionalSecrets,
};
