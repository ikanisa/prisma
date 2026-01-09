/**
 * Agent Output Schemas
 * 
 * Zod schemas for structured agent outputs.
 * These ensure type-safe, validated responses from agents.
 */

import { z } from 'zod';

// ============================================================================
// TEXT RESPONSE
// ============================================================================

export const TextResponseSchema = z.object({
    type: z.literal('text'),
    content: z.string(),
    citations: z.array(z.object({
        documentId: z.string().optional(),
        extractionId: z.string().optional(),
        text: z.string(),
        page: z.number().optional(),
    })).optional(),
});

export type TextResponseOutput = z.infer<typeof TextResponseSchema>;

// ============================================================================
// WORKPAPER OUTPUT
// ============================================================================

export const WorkpaperSchema = z.object({
    type: z.literal('workpaper'),
    content: z.object({
        wpType: z.string(),
        title: z.string(),
        wpRef: z.string().optional(),
        data: z.record(z.unknown()),
        status: z.enum(['draft', 'review', 'approved', 'rejected']).optional(),
        linkedDocuments: z.array(z.string()).optional(),
        linkedExtractions: z.array(z.string()).optional(),
    }),
});

export type WorkpaperOutput = z.infer<typeof WorkpaperSchema>;

// ============================================================================
// TASK LIST OUTPUT
// ============================================================================

export const TaskListSchema = z.object({
    type: z.literal('task_list'),
    content: z.object({
        tasks: z.array(z.object({
            title: z.string(),
            description: z.string().optional(),
            phase: z.enum(['planning', 'fieldwork', 'completion', 'archived']),
            assignedRole: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
            estimatedHours: z.number().optional(),
            dueDate: z.string().optional(),
            priority: z.number().optional(),
        })),
    }),
});

export type TaskListOutput = z.infer<typeof TaskListSchema>;

// ============================================================================
// DOCUMENT REQUEST OUTPUT
// ============================================================================

export const DocumentRequestSchema = z.object({
    type: z.literal('document_request'),
    content: z.object({
        requests: z.array(z.object({
            docType: z.string(),
            description: z.string(),
            required: z.boolean().optional(),
            phase: z.enum(['planning', 'fieldwork', 'completion']).optional(),
        })),
        message: z.string().optional(),
    }),
});

export type DocumentRequestOutput = z.infer<typeof DocumentRequestSchema>;

// ============================================================================
// WIDGET OUTPUT (for structured UI rendering)
// ============================================================================

export const WidgetSchema = z.object({
    type: z.literal('widget'),
    content: z.object({
        widgetType: z.enum([
            'materiality_calculator',
            'sampling_plan',
            'vat_return',
            'bank_reconciliation',
            'trial_balance',
            'risk_matrix',
            'confirmation_tracker',
        ]),
        data: z.record(z.unknown()),
        interactive: z.boolean().optional(),
    }),
});

export type WidgetOutput = z.infer<typeof WidgetSchema>;

// ============================================================================
// COMBINED AGENT OUTPUT
// ============================================================================

export const AgentOutputSchema = z.discriminatedUnion('type', [
    TextResponseSchema,
    WorkpaperSchema,
    TaskListSchema,
    DocumentRequestSchema,
    WidgetSchema,
]);

export type AgentOutput = z.infer<typeof AgentOutputSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateAgentOutput(output: unknown): { valid: boolean; data?: AgentOutput; error?: string } {
    const result = AgentOutputSchema.safeParse(output);

    if (result.success) {
        return { valid: true, data: result.data };
    }

    return {
        valid: false,
        error: result.error.message,
    };
}
