/**
 * API Contract Tests
 * 
 * Tests validating API responses against contracts.
 * Addresses: Audit requirement for API contract tests
 */
import { describe, it, expect } from 'vitest';
import {
    HealthCheckResponseSchema,
    AIStatusResponseSchema,
    AgentRequestSchema,
    AgentResponseSchema,
    ChatSessionSchema,
    SendMessageRequestSchema,
    ErrorResponseSchema,
    validateResponse,
    validateRequest,
    API_VERSION,
} from '../contracts';

describe('API Contracts', () => {
    describe('API Version', () => {
        it('should define API version', () => {
            expect(API_VERSION).toBe('v1');
        });
    });

    describe('HealthCheckResponseSchema', () => {
        it('should validate healthy response', () => {
            const response = {
                status: 'healthy',
                timestamp: '2026-01-11T09:00:00Z',
                version: '3.0.0',
                checks: {
                    database: { status: 'healthy', latency: 45 },
                    auth: { status: 'healthy' },
                    environment: { status: 'healthy' },
                },
            };

            const result = HealthCheckResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it('should validate degraded response', () => {
            const response = {
                status: 'degraded',
                timestamp: '2026-01-11T09:00:00Z',
                version: '3.0.0',
                checks: {
                    database: { status: 'slow' },
                    auth: { status: 'healthy' },
                    environment: { status: 'healthy' },
                },
            };

            const result = HealthCheckResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it('should reject invalid status', () => {
            const response = {
                status: 'invalid',
                timestamp: '2026-01-11T09:00:00Z',
                version: '3.0.0',
                checks: {},
            };

            const result = HealthCheckResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });
    });

    describe('AIStatusResponseSchema', () => {
        it('should validate available status', () => {
            const response = {
                available: true,
                model: 'gpt-4',
                features: {
                    categorization: true,
                    anomalyDetection: true,
                    documentAnalysis: true,
                },
            };

            const result = AIStatusResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it('should validate unavailable status', () => {
            const response = {
                available: false,
            };

            const result = AIStatusResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });
    });

    describe('AgentRequestSchema', () => {
        it('should validate minimal request', () => {
            const request = {
                query: 'What is the VAT rate?',
            };

            const result = AgentRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('should validate full request with context', () => {
            const request = {
                query: 'What is the VAT rate?',
                context: {
                    userId: 'user-123',
                    sessionId: 'session-456',
                    engagementId: 'engagement-789',
                },
                tools: ['vat-calculator', 'knowledge-base'],
            };

            const result = AgentRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('should reject empty query', () => {
            const request = {
                query: '',
            };

            const result = AgentRequestSchema.safeParse(request);
            expect(result.success).toBe(false);
        });
    });

    describe('AgentResponseSchema', () => {
        it('should validate response with sources', () => {
            const response = {
                response: 'The standard VAT rate is 18%.',
                conversationId: 'conv-123',
                toolsUsed: ['vat-lookup'],
                sources: [
                    {
                        title: 'VAT Act 2018',
                        url: 'https://example.com/vat',
                        snippet: 'Standard rate: 18%',
                    },
                ],
            };

            const result = AgentResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });
    });

    describe('ChatSessionSchema', () => {
        it('should validate session', () => {
            const session = {
                id: 'session-123',
                userId: 'user-456',
                createdAt: '2026-01-11T09:00:00Z',
                updatedAt: '2026-01-11T09:30:00Z',
            };

            const result = ChatSessionSchema.safeParse(session);
            expect(result.success).toBe(true);
        });
    });

    describe('SendMessageRequestSchema', () => {
        it('should validate message request', () => {
            const request = {
                sessionId: 'session-123',
                content: 'Hello, world!',
            };

            const result = SendMessageRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('should reject empty content', () => {
            const request = {
                sessionId: 'session-123',
                content: '',
            };

            const result = SendMessageRequestSchema.safeParse(request);
            expect(result.success).toBe(false);
        });
    });

    describe('ErrorResponseSchema', () => {
        it('should validate error response', () => {
            const response = {
                error: 'Not Found',
                message: 'Resource not found',
                code: 'NOT_FOUND',
            };

            const result = ErrorResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });
    });

    describe('validateResponse', () => {
        it('should return success for valid data', () => {
            const result = validateResponse(AIStatusResponseSchema, { available: true });
            expect(result.success).toBe(true);
        });

        it('should return errors for invalid data', () => {
            const result = validateResponse(AIStatusResponseSchema, { invalid: true });
            expect(result.success).toBe(false);
        });
    });

    describe('validateRequest', () => {
        it('should return success for valid request', () => {
            const result = validateRequest(AgentRequestSchema, { query: 'test' });
            expect(result.success).toBe(true);
        });

        it('should return error messages for invalid request', () => {
            const result = validateRequest(AgentRequestSchema, { query: '' });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });
    });
});
