/**
 * Zod schemas for Tool-related validation
 */

import { z } from 'zod';

// Tool implementation type enum
export const ToolImplementationTypeSchema = z.enum([
  'function',
  'api_call',
  'database_query',
  'file_operation',
  'workflow',
]);

export type ToolImplementationType = z.infer<typeof ToolImplementationTypeSchema>;

// Tool status enum
export const ToolStatusSchema = z.enum([
  'active',
  'deprecated',
  'disabled',
]);

export type ToolStatus = z.infer<typeof ToolStatusSchema>;

// Tool schema
export const ToolSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  input_schema: z.record(z.unknown()),
  output_schema: z.record(z.unknown()),
  implementation_type: ToolImplementationTypeSchema,
  implementation_config: z.record(z.unknown()),
  required_permissions: z.array(z.string()).default([]),
  rate_limit: z.number().int().positive().nullable(),
  cost_per_call: z.number().min(0).default(0),
  is_destructive: z.boolean().default(false),
  requires_confirmation: z.boolean().default(false),
  audit_level: z.enum(['none', 'basic', 'standard', 'detailed']).default('standard'),
  status: ToolStatusSchema.default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Tool = z.infer<typeof ToolSchema>;

// Create tool input
export const CreateToolInputSchema = z.object({
  organization_id: z.string().uuid().nullable().default(null),
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  input_schema: z.record(z.unknown()),
  output_schema: z.record(z.unknown()),
  implementation_type: ToolImplementationTypeSchema,
  implementation_config: z.record(z.unknown()),
  required_permissions: z.array(z.string()).default([]),
  rate_limit: z.number().int().positive().nullable().default(null),
  cost_per_call: z.number().min(0).default(0),
  is_destructive: z.boolean().default(false),
  requires_confirmation: z.boolean().default(false),
  audit_level: z.enum(['none', 'basic', 'standard', 'detailed']).default('standard'),
});

export type CreateToolInput = z.infer<typeof CreateToolInputSchema>;

// Update tool input
export const UpdateToolInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).max(100).optional(),
  input_schema: z.record(z.unknown()).optional(),
  output_schema: z.record(z.unknown()).optional(),
  implementation_type: ToolImplementationTypeSchema.optional(),
  implementation_config: z.record(z.unknown()).optional(),
  required_permissions: z.array(z.string()).optional(),
  rate_limit: z.number().int().positive().nullable().optional(),
  cost_per_call: z.number().min(0).optional(),
  is_destructive: z.boolean().optional(),
  requires_confirmation: z.boolean().optional(),
  audit_level: z.enum(['none', 'basic', 'standard', 'detailed']).optional(),
  status: ToolStatusSchema.optional(),
});

export type UpdateToolInput = z.infer<typeof UpdateToolInputSchema>;

// Tool filters for listing
export const ToolFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  organization_id: z.string().uuid().optional(),
});

export type ToolFilters = z.infer<typeof ToolFiltersSchema>;

// Tool test input
export const ToolTestInputSchema = z.object({
  params: z.record(z.unknown()),
});

export type ToolTestInput = z.infer<typeof ToolTestInputSchema>;

// Tool test result
export interface ToolTestResult {
  success: boolean;
  output?: unknown;
  error?: string;
  latency_ms: number;
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Tool assignment input
export const ToolAssignmentInputSchema = z.object({
  tool_id: z.string().uuid(),
  config: z.record(z.unknown()).optional(),
});

export type ToolAssignmentInput = z.infer<typeof ToolAssignmentInputSchema>;

// Tool assignment update
export const ToolAssignmentUpdateSchema = z.object({
  config: z.record(z.unknown()),
});

export type ToolAssignmentUpdate = z.infer<typeof ToolAssignmentUpdateSchema>;
