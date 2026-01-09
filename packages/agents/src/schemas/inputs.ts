/**
 * Agent Input Schemas
 * 
 * Zod schemas for tool inputs.
 */

import { z } from 'zod';

// ============================================================================
// MATERIALITY INPUT
// ============================================================================

export const MaterialityInputSchema = z.object({
    benchmark: z.enum(['revenue', 'total_assets', 'profit_before_tax', 'equity']),
    benchmarkAmount: z.number().positive(),
    overallRate: z.number().min(0).max(1).optional(),
    performanceRate: z.number().min(0).max(1).optional(),
    trivialRate: z.number().min(0).max(1).optional(),
});

export type MaterialitySchemaInput = z.infer<typeof MaterialityInputSchema>;

// ============================================================================
// VAT INPUT
// ============================================================================

export const VatInputSchema = z.object({
    jurisdiction: z.enum(['RW', 'MT', 'CA']),
    period: z.object({
        start: z.string(),
        end: z.string(),
    }),
    sales: z.array(z.object({
        description: z.string(),
        grossAmount: z.number(),
        vatRate: z.number().min(0).max(1),
        isExempt: z.boolean().optional(),
    })),
    purchases: z.array(z.object({
        description: z.string(),
        grossAmount: z.number(),
        vatRate: z.number().min(0).max(1),
        isDeductible: z.boolean().optional(),
    })),
    adjustments: z.array(z.object({
        type: z.enum(['credit_note', 'bad_debt', 'correction']),
        amount: z.number(),
        isOutput: z.boolean(),
    })).optional(),
});

export type VatSchemaInput = z.infer<typeof VatInputSchema>;

// ============================================================================
// SAMPLING PLAN INPUT
// ============================================================================

export const SamplingPlanInputSchema = z.object({
    populationSize: z.number().int().positive(),
    tolerableMisstatement: z.number().positive(),
    expectedMisstatement: z.number().min(0).optional(),
    confidenceLevel: z.enum(['90', '95', '99']).optional(),
    samplingMethod: z.enum(['statistical', 'haphazard', 'systematic']).optional(),
});

export type SamplingPlanSchemaInput = z.infer<typeof SamplingPlanInputSchema>;

// ============================================================================
// ENGAGEMENT CONTEXT INPUT
// ============================================================================

export const EngagementContextInputSchema = z.object({
    engagementId: z.string().uuid(),
    includeStats: z.boolean().optional(),
    includePlaybook: z.boolean().optional(),
});

export type EngagementContextSchemaInput = z.infer<typeof EngagementContextInputSchema>;
