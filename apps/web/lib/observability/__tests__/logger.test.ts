/**
 * Logger Tests
 * 
 * Tests for centralized logging infrastructure.
 * Addresses: Audit Blocker #3 - Test coverage & HP #13 - Logging
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    Logger,
    loggers,
    LOG_RETENTION_POLICIES,
    LOG_ALERT_RULES,
    buildLogQuery,
    createRequestLogger,
    logRequestStart,
    logRequestEnd,
} from '../logger';

describe('Centralized Logging', () => {
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Logger Class', () => {
        it('should create logger with service name', () => {
            const logger = new Logger('test-service');
            expect(logger).toBeDefined();
        });

        it('should create logger with component', () => {
            const logger = new Logger('test-service', 'test-component');
            expect(logger).toBeDefined();
        });

        it('should log info messages', () => {
            const logger = new Logger('test-service');
            logger.info('Test message');
            expect(console.info).toHaveBeenCalled();
        });

        it('should log warn messages', () => {
            const logger = new Logger('test-service');
            logger.warn('Warning message');
            expect(console.warn).toHaveBeenCalled();
        });

        it('should log error messages with error object', () => {
            const logger = new Logger('test-service');
            const error = new Error('Test error');
            logger.error('Error occurred', error);
            expect(console.error).toHaveBeenCalled();
        });

        it('should include context in logs', () => {
            const logger = new Logger('test-service');
            logger.info('Test message', { userId: 'user-123' });

            const call = (console.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
            const parsed = JSON.parse(call);
            expect(parsed.context.userId).toBe('user-123');
        });

        it('should create child logger with context', () => {
            const parent = new Logger('test-service');
            const child = parent.child('child-component', { requestId: 'req-123' });
            expect(child).toBeDefined();
        });

        it('should log audit events', () => {
            const logger = new Logger('test-service', 'auth');
            logger.audit('user_login', { userId: 'user-123' });

            expect(console.info).toHaveBeenCalled();
            const call = (console.info as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('AUDIT');
        });
    });

    describe('Pre-configured Loggers', () => {
        it('should have api logger', () => {
            expect(loggers.api).toBeDefined();
        });

        it('should have auth logger', () => {
            expect(loggers.auth).toBeDefined();
        });

        it('should have ai logger', () => {
            expect(loggers.ai).toBeDefined();
        });

        it('should have database logger', () => {
            expect(loggers.database).toBeDefined();
        });

        it('should have security logger', () => {
            expect(loggers.security).toBeDefined();
        });
    });

    describe('Log Retention Policies', () => {
        it('should define debug retention', () => {
            expect(LOG_RETENTION_POLICIES.debug.retentionDays).toBe(3);
        });

        it('should define info retention', () => {
            expect(LOG_RETENTION_POLICIES.info.retentionDays).toBe(30);
        });

        it('should define audit retention as longest', () => {
            expect(LOG_RETENTION_POLICIES.audit.retentionDays).toBeGreaterThan(
                LOG_RETENTION_POLICIES.error.retentionDays
            );
        });
    });

    describe('Log Alert Rules', () => {
        it('should define HighErrorRate alert', () => {
            const rule = LOG_ALERT_RULES.find(r => r.name === 'HighErrorRate');
            expect(rule).toBeDefined();
            expect(rule?.severity).toBe('critical');
        });

        it('should define AuthenticationFailures alert', () => {
            const rule = LOG_ALERT_RULES.find(r => r.name === 'AuthenticationFailures');
            expect(rule).toBeDefined();
        });

        it('should have notification channels for all alerts', () => {
            LOG_ALERT_RULES.forEach(rule => {
                expect(['slack', 'email', 'pagerduty']).toContain(rule.notification);
            });
        });
    });

    describe('buildLogQuery', () => {
        it('should build query with level', () => {
            const query = buildLogQuery({ level: 'error' });
            expect(query.level).toBe('error');
        });

        it('should build query with time range', () => {
            const startTime = new Date('2026-01-01');
            const endTime = new Date('2026-01-02');
            const query = buildLogQuery({ startTime, endTime });

            expect(query.from).toBe(startTime.toISOString());
            expect(query.to).toBe(endTime.toISOString());
        });

        it('should build query with search', () => {
            const query = buildLogQuery({ search: 'error message' });
            expect(query.search).toBe('error message');
        });
    });

    describe('Request Logging', () => {
        it('should create request logger', () => {
            const logger = createRequestLogger('req-123', 'user-456');
            expect(logger).toBeDefined();
        });

        it('should log request start', () => {
            const logger = createRequestLogger('req-123');
            logRequestStart(logger, 'GET', '/api/test');
            expect(console.info).toHaveBeenCalled();
        });

        it('should log request end with duration', () => {
            const logger = createRequestLogger('req-123');
            logRequestEnd(logger, 'GET', '/api/test', 200, 150);
            expect(console.info).toHaveBeenCalled();
        });
    });
});
