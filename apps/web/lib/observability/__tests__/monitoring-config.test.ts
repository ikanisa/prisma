/**
 * Monitoring Configuration Tests
 * 
 * Tests for SLO/SLI definitions and utility functions.
 * Addresses: Audit Blocker #7 - Production monitoring
 */
import { describe, it, expect } from 'vitest';
import {
    SLOs,
    SLIs,
    ALERT_RULES,
    DASHBOARD_PANELS,
    HEALTH_CHECKS,
    calculateErrorBudget,
    isSLOMet,
    getAlertColor,
} from '../monitoring-config';

describe('Monitoring Configuration', () => {
    describe('SLOs', () => {
        it('should define availability target of 99.9%', () => {
            expect(SLOs.availability.target).toBe(0.999);
        });

        it('should define error budget of 43 minutes', () => {
            expect(SLOs.availability.errorBudgetMinutes).toBe(43);
        });

        it('should define latency p95 target of 500ms', () => {
            expect(SLOs.latency.p95_target_ms).toBe(500);
        });

        it('should define error rate target of 0.1%', () => {
            expect(SLOs.errorRate.target).toBe(0.001);
        });

        it('should define agent response target of 10 seconds', () => {
            expect(SLOs.agentResponse.target_seconds).toBe(10);
        });
    });

    describe('SLIs', () => {
        it('should define uptime metric', () => {
            expect(SLIs.uptime).toBeDefined();
            expect(SLIs.uptime.name).toBe('Service Uptime');
        });

        it('should define request latency metric', () => {
            expect(SLIs.requestLatency).toBeDefined();
            expect(SLIs.requestLatency.unit).toBe('seconds');
        });

        it('should define error rate metric', () => {
            expect(SLIs.errorRate).toBeDefined();
            expect(SLIs.errorRate.unit).toBe('percent');
        });

        it('should define agent response time metric', () => {
            expect(SLIs.agentResponseTime).toBeDefined();
        });
    });

    describe('Alert Rules', () => {
        it('should define critical alerts', () => {
            const criticalAlerts = ALERT_RULES.filter(r => r.severity === 'critical');
            expect(criticalAlerts.length).toBeGreaterThan(0);
        });

        it('should have runbook links for all alerts', () => {
            ALERT_RULES.forEach(rule => {
                expect(rule.runbook).toBeDefined();
                expect(rule.runbook).toContain('/docs/runbooks/');
            });
        });

        it('should define HighErrorRate alert', () => {
            const alert = ALERT_RULES.find(r => r.name === 'HighErrorRate');
            expect(alert).toBeDefined();
            expect(alert?.severity).toBe('critical');
        });

        it('should define ServiceDown alert', () => {
            const alert = ALERT_RULES.find(r => r.name === 'ServiceDown');
            expect(alert).toBeDefined();
        });
    });

    describe('Dashboard Panels', () => {
        it('should define overview panels', () => {
            expect(DASHBOARD_PANELS.overview).toBeDefined();
            expect(DASHBOARD_PANELS.overview.length).toBeGreaterThan(0);
        });

        it('should define performance panels', () => {
            expect(DASHBOARD_PANELS.performance).toBeDefined();
        });

        it('should define error panels', () => {
            expect(DASHBOARD_PANELS.errors).toBeDefined();
        });

        it('should define agent panels', () => {
            expect(DASHBOARD_PANELS.agents).toBeDefined();
        });
    });

    describe('Health Checks', () => {
        it('should define endpoint health checks', () => {
            expect(HEALTH_CHECKS.endpoints.length).toBeGreaterThan(0);
        });

        it('should include /api/health endpoint', () => {
            const healthCheck = HEALTH_CHECKS.endpoints.find(e => e.path === '/api/health');
            expect(healthCheck).toBeDefined();
        });

        it('should define database health check', () => {
            expect(HEALTH_CHECKS.database.enabled).toBe(true);
        });

        it('should define external service checks', () => {
            expect(HEALTH_CHECKS.external.length).toBeGreaterThan(0);
        });
    });

    describe('calculateErrorBudget', () => {
        it('should calculate remaining budget correctly', () => {
            const result = calculateErrorBudget(0.0005); // 0.05% error rate
            expect(result.remaining).toBeGreaterThan(0);
            expect(result.percent).toBe(50); // Half of 0.1% budget used
        });

        it('should return 0 when budget exhausted', () => {
            const result = calculateErrorBudget(0.002); // 0.2% error rate (over budget)
            expect(result.remaining).toBe(0);
            expect(result.percent).toBe(0);
        });

        it('should return 100% when no errors', () => {
            const result = calculateErrorBudget(0);
            expect(result.percent).toBe(100);
        });
    });

    describe('isSLOMet', () => {
        it('should return true when availability SLO is met', () => {
            expect(isSLOMet('availability', 0.999)).toBe(true);
            expect(isSLOMet('availability', 0.9999)).toBe(true);
        });

        it('should return false when availability SLO is not met', () => {
            expect(isSLOMet('availability', 0.998)).toBe(false);
        });

        it('should return true when latency SLO is met', () => {
            expect(isSLOMet('latency', 400)).toBe(true);
            expect(isSLOMet('latency', 500)).toBe(true);
        });

        it('should return false when latency SLO is not met', () => {
            expect(isSLOMet('latency', 600)).toBe(false);
        });

        it('should return true when error rate SLO is met', () => {
            expect(isSLOMet('errorRate', 0.0005)).toBe(true);
            expect(isSLOMet('errorRate', 0.001)).toBe(true);
        });

        it('should return false when error rate SLO is not met', () => {
            expect(isSLOMet('errorRate', 0.002)).toBe(false);
        });
    });

    describe('getAlertColor', () => {
        it('should return red for critical', () => {
            expect(getAlertColor('critical')).toBe('#dc2626');
        });

        it('should return amber for warning', () => {
            expect(getAlertColor('warning')).toBe('#d97706');
        });

        it('should return blue for info', () => {
            expect(getAlertColor('info')).toBe('#2563eb');
        });
    });
});
