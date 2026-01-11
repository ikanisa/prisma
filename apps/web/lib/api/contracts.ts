/**
 * API Contract Definitions (OpenAPI)
 * 
 * Type-safe API contracts for all endpoints.
 * Addresses: API contract tests requirement
 */

import { z } from 'zod';

// ===========================================
// Common Types
// ===========================================

export const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional(),
});

export const PaginationSchema = z.object({
    page: z.number().optional().default(1),
    limit: z.number().optional().default(20),
    total: z.number().optional(),
    hasMore: z.boolean().optional(),
});

// ===========================================
// Health Check API
// ===========================================

export const HealthCheckResponseSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string(),
    version: z.string(),
    checks: z.object({
        database: z.object({
            status: z.string(),
            latency: z.number().optional(),
        }),
        auth: z.object({
            status: z.string(),
        }),
        environment: z.object({
            status: z.string(),
        }),
    }),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ===========================================
// AI Status API
// ===========================================

export const AIStatusResponseSchema = z.object({
    available: z.boolean(),
    model: z.string().optional(),
    features: z.object({
        categorization: z.boolean(),
        anomalyDetection: z.boolean(),
        documentAnalysis: z.boolean(),
    }).optional(),
});

export type AIStatusResponse = z.infer<typeof AIStatusResponseSchema>;

// ===========================================
// Agent Orchestrator API
// ===========================================

export const AgentRequestSchema = z.object({
    query: z.string().min(1),
    context: z.object({
        userId: z.string().optional(),
        sessionId: z.string().optional(),
        engagementId: z.string().optional(),
    }).optional(),
    tools: z.array(z.string()).optional(),
});

export const AgentResponseSchema = z.object({
    response: z.string(),
    conversationId: z.string(),
    toolsUsed: z.array(z.string()).optional(),
    sources: z.array(z.object({
        title: z.string(),
        url: z.string().optional(),
        snippet: z.string().optional(),
    })).optional(),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// ===========================================
// ChatKit Session API
// ===========================================

export const ChatSessionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    metadata: z.record(z.unknown()).optional(),
});

export const CreateSessionRequestSchema = z.object({
    metadata: z.record(z.unknown()).optional(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ===========================================
// ChatKit Message API
// ===========================================

export const ChatMessageSchema = z.object({
    id: z.string(),
    sessionId: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    createdAt: z.string(),
    metadata: z.record(z.unknown()).optional(),
});

export const SendMessageRequestSchema = z.object({
    sessionId: z.string(),
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

// ===========================================
// Metrics API
// ===========================================

export const MetricsResponseSchema = z.string(); // Prometheus format

// ===========================================
// API Version
// ===========================================

export const API_VERSION = 'v1';
export const API_BASE_PATH = '/api';

// ===========================================
// Contract Validation Utilities
// ===========================================

/**
 * Validate API response against schema
 */
export function validateResponse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Validate API request against schema
 */
export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    };
}
