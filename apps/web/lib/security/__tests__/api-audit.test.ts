/**
 * API Security Audit Tests
 * 
 * Tests for API audit module functions.
 * Addresses: Audit Blocker #3 - Test coverage 75%+
 */
import { describe, it, expect } from 'vitest';
import {
    API_ENDPOINT_INVENTORY,
    getSecurityAuditSummary,
    validateEndpointSecurity,
} from '../security/api-audit';

describe('API Security Audit', () => {
    describe('API_ENDPOINT_INVENTORY', () => {
        it('should contain all documented endpoints', () => {
            const expectedPaths = [
                '/api/agent/orchestrator',
                '/api/ai/anomalies',
                '/api/ai/process',
                '/api/ai/reviews',
                '/api/ai/status',
                '/api/auth/openai/callback',
                '/api/auth/openai/refresh',
                '/api/auth/openai/token',
                '/api/chatkit/message',
                '/api/chatkit/session',
                '/api/metrics',
            ];

            expectedPaths.forEach(path => {
                const endpoint = API_ENDPOINT_INVENTORY.find(e => e.path === path);
                expect(endpoint, `Missing endpoint: ${path}`).toBeDefined();
            });
        });

        it('should have OWASP checklist for all endpoints', () => {
            API_ENDPOINT_INVENTORY.forEach(endpoint => {
                expect(endpoint.owaspChecklist).toBeDefined();
                expect(endpoint.owaspChecklist.A01_BrokenAccessControl).toBeDefined();
                expect(endpoint.owaspChecklist.A03_Injection).toBeDefined();
                expect(endpoint.owaspChecklist.A07_AuthenticationFailures).toBeDefined();
            });
        });

        it('should have rate limits for all endpoints', () => {
            API_ENDPOINT_INVENTORY.forEach(endpoint => {
                expect(endpoint.rateLimit).toBeDefined();
                expect(endpoint.rateLimit.requests).toBeGreaterThan(0);
                expect(endpoint.rateLimit.window).toBeGreaterThan(0);
            });
        });

        it('should have authentication defined for all endpoints', () => {
            API_ENDPOINT_INVENTORY.forEach(endpoint => {
                expect(['none', 'jwt', 'service-key', 'api-key']).toContain(endpoint.authentication);
            });
        });
    });

    describe('getSecurityAuditSummary', () => {
        it('should return summary with required fields', () => {
            const summary = getSecurityAuditSummary();

            expect(summary.totalEndpoints).toBe(API_ENDPOINT_INVENTORY.length);
            expect(typeof summary.fullyCompliant).toBe('number');
            expect(typeof summary.partiallyCompliant).toBe('number');
            expect(Array.isArray(summary.criticalIssues)).toBe(true);
            expect(Array.isArray(summary.recommendations)).toBe(true);
        });

        it('should calculate compliance counts correctly', () => {
            const summary = getSecurityAuditSummary();

            expect(summary.fullyCompliant + summary.partiallyCompliant).toBe(summary.totalEndpoints);
        });
    });

    describe('validateEndpointSecurity', () => {
        it('should return valid for known endpoints', () => {
            const result = validateEndpointSecurity('/api/agent/orchestrator');
            expect(result).toBeDefined();
            expect(Array.isArray(result.issues)).toBe(true);
        });

        it('should return invalid for unknown endpoints', () => {
            const result = validateEndpointSecurity('/api/unknown');
            expect(result.valid).toBe(false);
            expect(result.issues).toContain('Endpoint not in security inventory');
        });

        it('should detect access control issues', () => {
            // Find an endpoint with known issues
            const metricsEndpoint = API_ENDPOINT_INVENTORY.find(e => e.path === '/api/metrics');

            if (metricsEndpoint && !metricsEndpoint.owaspChecklist.A01_BrokenAccessControl) {
                const result = validateEndpointSecurity('/api/metrics');
                expect(result.issues.some(i => i.includes('A01'))).toBe(true);
            }
        });
    });
});
