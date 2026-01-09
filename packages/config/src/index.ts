/**
 * Prisma Core Configuration
 * 
 * Exports jurisdiction playbooks and configuration loaders.
 */

export { loadPlaybook, JURISDICTIONS, ENGAGEMENT_TYPES } from './playbooks.js';
export type { Playbook, Phase, TaskTemplate, DocRequestTemplate } from './types.js';

// Security configuration
export {
    securityConfig,
    cspConfig,
    securityHeaders,
    wafRules,
    rateLimits,
    generateCSPHeader,
    checkWAFRules,
    validateSecrets,
    getSecret,
    requireSecret,
} from './security.js';

export {
    securityMiddleware,
    withSecurity,
    applySecurityHeaders,
    checkRequestWAF,
    checkRateLimit,
    getSecurityHeaders,
} from './security-middleware.js';

// Phase 4: Enterprise Integration

// SSO Integration
export * from './sso/index.js';

// API Gateway
export * from './gateway/index.js';

// Audit Logging
export * from './audit/index.js';

