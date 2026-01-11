/**
 * Security Validator Tests
 * 
 * Tests for production security validation (Blocker #2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    validateProductionConfig,
    enforceProductionSecurity,
    isSecurityFeatureEnabled,
    getSecuritySummary,
} from '../security-validator';

describe('Security Validator', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('validateProductionConfig', () => {
        it('should return no violations in development mode', () => {
            vi.stubEnv('NODE_ENV', 'development');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'true');

            const violations = validateProductionConfig();
            expect(violations.length).toBe(0);
        });

        it('should detect SUPABASE_ALLOW_STUB=true in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'true');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const violations = validateProductionConfig();
            const stubViolation = violations.find(v => v.code === 'SEC-001');

            expect(stubViolation).toBeDefined();
            expect(stubViolation?.severity).toBe('critical');
        });

        it('should detect missing SUPABASE_URL in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const violations = validateProductionConfig();
            const urlViolation = violations.find(v => v.code === 'SEC-002');

            expect(urlViolation).toBeDefined();
        });

        it('should detect missing ANON_KEY in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            // Don't set ANON_KEY

            const violations = validateProductionConfig();
            const keyViolation = violations.find(v => v.code === 'SEC-003');

            expect(keyViolation).toBeDefined();
        });

        it('should pass with correct production configuration', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'false');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            const violations = validateProductionConfig();
            const critical = violations.filter(v => v.severity === 'critical');

            expect(critical.length).toBe(0);
        });
    });

    describe('enforceProductionSecurity', () => {
        it('should throw on critical violations in production', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'true');

            expect(() => enforceProductionSecurity()).toThrow('security validation failed');
        });

        it('should not throw in development even with violations', () => {
            vi.stubEnv('NODE_ENV', 'development');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'true');

            expect(() => enforceProductionSecurity()).not.toThrow();
        });

        it('should not throw with valid production config', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'false');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

            expect(() => enforceProductionSecurity()).not.toThrow();
        });
    });

    describe('isSecurityFeatureEnabled', () => {
        it('should return true for RLS by default', () => {
            expect(isSecurityFeatureEnabled('rls')).toBe(true);
        });

        it('should return false for RLS when explicitly disabled', () => {
            vi.stubEnv('SUPABASE_RLS_ENABLED', 'false');
            expect(isSecurityFeatureEnabled('rls')).toBe(false);
        });

        it('should return true for rate-limiting by default', () => {
            expect(isSecurityFeatureEnabled('rate-limiting')).toBe(true);
        });

        it('should return false for unknown features', () => {
            expect(isSecurityFeatureEnabled('unknown-feature')).toBe(false);
        });
    });

    describe('getSecuritySummary', () => {
        it('should return complete security summary', () => {
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
            vi.stubEnv('SUPABASE_ALLOW_STUB', 'false');

            const summary = getSecuritySummary();

            expect(summary.environment).toBe('production');
            expect(summary.supabase).toBeDefined();
            expect(summary.features).toBeDefined();
            expect(typeof summary.violations).toBe('number');
        });
    });
});
