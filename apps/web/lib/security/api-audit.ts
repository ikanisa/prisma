/**
 * API Endpoint Security Audit
 * 
 * OWASP Top 10 compliance checklist and validation utilities
 * Addresses: Audit Blocker #8 - Security audit of all API endpoints
 */

export interface EndpointAudit {
    path: string;
    methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
    authentication: 'none' | 'jwt' | 'service-key' | 'api-key';
    rateLimit: { requests: number; window: number };
    inputValidation: 'zod' | 'manual' | 'none';
    owaspChecklist: OWASPChecklist;
}

export interface OWASPChecklist {
    A01_BrokenAccessControl: boolean;      // RLS enforced, authorization checks
    A02_CryptographicFailures: boolean;    // TLS, no secrets in logs
    A03_Injection: boolean;                // Input sanitization, parameterized queries
    A04_InsecureDesign: boolean;           // Threat modeling complete
    A05_SecurityMisconfiguration: boolean; // Secure defaults, env validation
    A06_VulnerableComponents: boolean;     // Dependencies audited
    A07_AuthenticationFailures: boolean;   // Session management secure
    A08_DataIntegrity: boolean;            // CSRF tokens where needed
    A09_LoggingFailures: boolean;          // Security events logged
    A10_SSRF: boolean;                     // URL validation for external calls
}

/**
 * Complete API endpoint inventory with security status
 */
export const API_ENDPOINT_INVENTORY: EndpointAudit[] = [
    // Agent Orchestrator
    {
        path: '/api/agent/orchestrator',
        methods: ['POST'],
        authentication: 'jwt',
        rateLimit: { requests: 30, window: 60 },
        inputValidation: 'zod',
        owaspChecklist: {
            A01_BrokenAccessControl: true,       // JWT required, user context extracted
            A02_CryptographicFailures: true,     // TLS enforced
            A03_Injection: true,                 // Zod validation
            A04_InsecureDesign: false,           // TODO: Threat model needed
            A05_SecurityMisconfiguration: true,  // Env validation
            A06_VulnerableComponents: true,      // npm audit clean
            A07_AuthenticationFailures: true,    // Supabase session management
            A08_DataIntegrity: false,            // TODO: Add CSRF for mutations
            A09_LoggingFailures: false,          // TODO: Security event logging
            A10_SSRF: true,                      // Internal calls only
        },
    },

    // AI Anomalies
    {
        path: '/api/ai/anomalies',
        methods: ['GET', 'PUT'],
        authentication: 'service-key',
        rateLimit: { requests: 20, window: 60 },
        inputValidation: 'none', // TODO: Add validation
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: false,                // TODO: Add input validation
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: false,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // AI Process
    {
        path: '/api/ai/process',
        methods: ['POST'],
        authentication: 'service-key',
        rateLimit: { requests: 20, window: 60 },
        inputValidation: 'none', // TODO: Add validation
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: false,
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: false,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // AI Reviews
    {
        path: '/api/ai/reviews',
        methods: ['GET', 'PUT'],
        authentication: 'service-key',
        rateLimit: { requests: 20, window: 60 },
        inputValidation: 'none',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: false,
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: false,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // AI Status
    {
        path: '/api/ai/status',
        methods: ['GET'],
        authentication: 'jwt',
        rateLimit: { requests: 20, window: 60 },
        inputValidation: 'none', // Read-only, no validation needed
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,                 // Read-only endpoint
            A04_InsecureDesign: true,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: true,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // Auth OpenAI Callback
    {
        path: '/api/auth/openai/callback',
        methods: ['GET'],
        authentication: 'none', // OAuth callback
        rateLimit: { requests: 10, window: 60 },
        inputValidation: 'manual',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,                 // State validation
            A04_InsecureDesign: true,            // OAuth standard flow
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,    // OAuth state check
            A08_DataIntegrity: true,
            A09_LoggingFailures: false,
            A10_SSRF: true,                      // Only calls OpenAI
        },
    },

    // Auth OpenAI Refresh
    {
        path: '/api/auth/openai/refresh',
        methods: ['POST'],
        authentication: 'none', // Token refresh
        rateLimit: { requests: 10, window: 60 },
        inputValidation: 'manual',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,
            A04_InsecureDesign: true,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: true,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // Auth OpenAI Token
    {
        path: '/api/auth/openai/token',
        methods: ['POST'],
        authentication: 'none', // Token exchange
        rateLimit: { requests: 10, window: 60 },
        inputValidation: 'manual',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,
            A04_InsecureDesign: true,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: true,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },

    // ChatKit Message
    {
        path: '/api/chatkit/message',
        methods: ['POST'],
        authentication: 'jwt',
        rateLimit: { requests: 50, window: 60 },
        inputValidation: 'zod',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: false,
            A09_LoggingFailures: false,
            A10_SSRF: false,                     // TODO: Validate backend URL
        },
    },

    // ChatKit Session
    {
        path: '/api/chatkit/session',
        methods: ['GET', 'POST'],
        authentication: 'jwt',
        rateLimit: { requests: 50, window: 60 },
        inputValidation: 'manual',
        owaspChecklist: {
            A01_BrokenAccessControl: true,
            A02_CryptographicFailures: true,
            A03_Injection: true,
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: true,
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: true,
            A08_DataIntegrity: false,
            A09_LoggingFailures: false,
            A10_SSRF: false,
        },
    },

    // Metrics
    {
        path: '/api/metrics',
        methods: ['GET'],
        authentication: 'none', // Internal only
        rateLimit: { requests: 5, window: 60 },
        inputValidation: 'none',
        owaspChecklist: {
            A01_BrokenAccessControl: false,      // TODO: Should require auth
            A02_CryptographicFailures: true,
            A03_Injection: true,
            A04_InsecureDesign: false,
            A05_SecurityMisconfiguration: false, // TODO: Add auth
            A06_VulnerableComponents: true,
            A07_AuthenticationFailures: false,
            A08_DataIntegrity: true,
            A09_LoggingFailures: false,
            A10_SSRF: true,
        },
    },
];

/**
 * Get security audit summary
 */
export function getSecurityAuditSummary(): {
    totalEndpoints: number;
    fullyCompliant: number;
    partiallyCompliant: number;
    criticalIssues: string[];
    recommendations: string[];
} {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    let fullyCompliant = 0;

    for (const endpoint of API_ENDPOINT_INVENTORY) {
        const checks = Object.values(endpoint.owaspChecklist);
        const passed = checks.filter(Boolean).length;
        const total = checks.length;

        if (passed === total) {
            fullyCompliant++;
        } else {
            // Check for critical issues
            if (!endpoint.owaspChecklist.A01_BrokenAccessControl) {
                criticalIssues.push(`${endpoint.path}: Missing access control`);
            }
            if (!endpoint.owaspChecklist.A03_Injection && endpoint.inputValidation === 'none') {
                recommendations.push(`${endpoint.path}: Add input validation`);
            }
            if (!endpoint.owaspChecklist.A09_LoggingFailures) {
                recommendations.push(`${endpoint.path}: Add security event logging`);
            }
        }
    }

    return {
        totalEndpoints: API_ENDPOINT_INVENTORY.length,
        fullyCompliant,
        partiallyCompliant: API_ENDPOINT_INVENTORY.length - fullyCompliant,
        criticalIssues,
        recommendations,
    };
}

/**
 * Validate endpoint meets minimum security requirements
 */
export function validateEndpointSecurity(path: string): {
    valid: boolean;
    issues: string[];
} {
    const endpoint = API_ENDPOINT_INVENTORY.find(e => e.path === path);

    if (!endpoint) {
        return { valid: false, issues: ['Endpoint not in security inventory'] };
    }

    const issues: string[] = [];

    // Critical checks
    if (!endpoint.owaspChecklist.A01_BrokenAccessControl) {
        issues.push('A01: Access control not verified');
    }
    if (!endpoint.owaspChecklist.A03_Injection && endpoint.inputValidation === 'none') {
        issues.push('A03: No input validation for modifying endpoint');
    }
    if (!endpoint.owaspChecklist.A07_AuthenticationFailures && endpoint.authentication === 'none') {
        issues.push('A07: Public endpoint without rate limiting validation');
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}
