/**
 * Zod schemas for Agent-related validation
 */

import { z } from 'zod';

// Agent types enum
export const AgentTypeSchema = z.enum([
  'assistant',
  'specialist',
  'orchestrator',
  'evaluator',
  'autonomous',
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

// Agent status enum
export const AgentStatusSchema = z.enum([
  'draft',
  'testing',
  'active',
  'deprecated',
  'archived',
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

// Agent schema
export const AgentSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  avatar_url: z.string().url().optional(),
  type: AgentTypeSchema,
  category: z.string().max(100).optional(),
  status: AgentStatusSchema.default('draft'),
  is_public: z.boolean().default(false),
  version: z.string().default('1.0.0'),
  parent_version_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  published_at: z.string().datetime().optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

// Create agent input
export const CreateAgentInputSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  avatar_url: z.string().url().optional(),
  type: AgentTypeSchema,
  category: z.string().max(100).optional(),
  is_public: z.boolean().default(false),
});

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

// Update agent input
export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  avatar_url: z.string().url().optional().nullable(),
  type: AgentTypeSchema.optional(),
  category: z.string().max(100).optional().nullable(),
  is_public: z.boolean().optional(),
  status: AgentStatusSchema.optional(),
});

export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

// Agent filters for listing
export const AgentFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  type: AgentTypeSchema.optional(),
  status: AgentStatusSchema.optional(),
  search: z.string().optional(),
  organization_id: z.string().uuid().optional(),
});

export type AgentFilters = z.infer<typeof AgentFiltersSchema>;

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Test input
export const TestInputSchema = z.object({
  input_text: z.string().min(1),
  persona_id: z.string().uuid().optional(),
});

export type TestInput = z.infer<typeof TestInputSchema>;

// Execution result
export interface ExecutionResult {
  id: string;
  output_text: string;
  latency_ms: number;
  tokens_used?: {
    input: number;
    output: number;
  };
  model_used?: string;
  created_at: string;
}

// Publish input
export const PublishInputSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
});

export type PublishInput = z.infer<typeof PublishInputSchema>;
