/**
 * Production Security Validator
 * 
 * Ensures dangerous configurations are disabled in production.
 * This module runs at application startup and throws errors for security violations.
 * 
 * Addresses: Audit Blocker #2 - SUPABASE_ALLOW_STUB must be false in production
 */

export interface SecurityViolation {
    code: string;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validate all production security requirements
 * @throws Error if critical violations are found
 */
export function validateProductionConfig(): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // ===========================================
    // CRITICAL: Authentication Security
    // ===========================================

    // Blocker #2: Stub mode must be disabled in production
    if (isProduction && process.env.SUPABASE_ALLOW_STUB === 'true') {
        violations.push({
            code: 'SEC-001',
            message: 'SUPABASE_ALLOW_STUB must be false in production. This bypasses authentication.',
            severity: 'critical',
        });
    }

    // Required authentication configuration
    if (isProduction && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        violations.push({
            code: 'SEC-002',
            message: 'NEXT_PUBLIC_SUPABASE_URL is required in production',
            severity: 'critical',
        });
    }

    if (isProduction && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        violations.push({
            code: 'SEC-003',
            message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required in production',
            severity: 'critical',
        });
    }

    // ===========================================
    // HIGH: API Security
    // ===========================================

    // Service role key should not be exposed to client
    if (typeof window !== 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        violations.push({
            code: 'SEC-004',
            message: 'SUPABASE_SERVICE_ROLE_KEY is exposed to client-side code',
            severity: 'critical',
        });
    }

    // ===========================================
    // MEDIUM: Configuration Security
    // ===========================================

    // Debug mode should be disabled in production
    if (isProduction && process.env.DEBUG === 'true') {
        violations.push({
            code: 'SEC-010',
            message: 'DEBUG mode should be disabled in production',
            severity: 'medium',
        });
    }

    // Verbose logging should be disabled in production
    if (isProduction && process.env.LOG_LEVEL === 'debug') {
        violations.push({
            code: 'SEC-011',
            message: 'LOG_LEVEL should not be debug in production',
            severity: 'low',
        });
    }

    return violations;
}

/**
 * Run security validation and throw on critical violations
 */
export function enforceProductionSecurity(): void {
    const violations = validateProductionConfig();

    const critical = violations.filter(v => v.severity === 'critical');
    const high = violations.filter(v => v.severity === 'high');
    const medium = violations.filter(v => v.severity === 'medium');
    const low = violations.filter(v => v.severity === 'low');

    // Log all violations
    if (violations.length > 0) {
        console.warn('='.repeat(60));
        console.warn('SECURITY VALIDATION RESULTS');
        console.warn('='.repeat(60));

        if (critical.length > 0) {
            console.error(`\n🔴 CRITICAL (${critical.length}):`);
            critical.forEach(v => console.error(`  [${v.code}] ${v.message}`));
        }

        if (high.length > 0) {
            console.warn(`\n🟠 HIGH (${high.length}):`);
            high.forEach(v => console.warn(`  [${v.code}] ${v.message}`));
        }

        if (medium.length > 0) {
            console.warn(`\n🟡 MEDIUM (${medium.length}):`);
            medium.forEach(v => console.warn(`  [${v.code}] ${v.message}`));
        }

        if (low.length > 0) {
            console.info(`\n🔵 LOW (${low.length}):`);
            low.forEach(v => console.info(`  [${v.code}] ${v.message}`));
        }

        console.warn('='.repeat(60));
    }

    // Throw on critical violations in production
    if (critical.length > 0 && process.env.NODE_ENV === 'production') {
        throw new Error(
            `Production security validation failed with ${critical.length} critical violation(s):\n` +
            critical.map(v => `[${v.code}] ${v.message}`).join('\n')
        );
    }
}

/**
 * Check if a specific security feature is enabled
 */
export function isSecurityFeatureEnabled(feature: string): boolean {
    const features: Record<string, () => boolean> = {
        'rls': () => process.env.SUPABASE_RLS_ENABLED !== 'false',
        'rate-limiting': () => process.env.RATE_LIMITING_ENABLED !== 'false',
        'audit-logging': () => process.env.AUDIT_LOGGING_ENABLED === 'true',
        'csrf-protection': () => process.env.CSRF_PROTECTION_ENABLED !== 'false',
    };

    return features[feature]?.() ?? false;
}

/**
 * Get security configuration summary
 */
export function getSecuritySummary(): Record<string, unknown> {
    return {
        environment: process.env.NODE_ENV,
        supabase: {
            configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            stubMode: process.env.SUPABASE_ALLOW_STUB === 'true',
        },
        features: {
            rls: isSecurityFeatureEnabled('rls'),
            rateLimiting: isSecurityFeatureEnabled('rate-limiting'),
            auditLogging: isSecurityFeatureEnabled('audit-logging'),
            csrfProtection: isSecurityFeatureEnabled('csrf-protection'),
        },
        violations: validateProductionConfig().length,
    };
}
