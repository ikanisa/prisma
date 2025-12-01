/**
 * Zod schemas for Execution-related validation
 */

import { z } from 'zod';

// Execution schema
export const ExecutionSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  persona_id: z.string().uuid().nullable(),
  input_text: z.string(),
  input_tokens: z.number().int().nullable(),
  output_text: z.string().nullable(),
  output_tokens: z.number().int().nullable(),
  latency_ms: z.number().int().nullable(),
  model_used: z.string().nullable(),
  tools_invoked: z.array(z.record(z.unknown())).default([]),
  knowledge_retrieved: z.array(z.record(z.unknown())).default([]),
  user_rating: z.number().int().min(1).max(5).nullable(),
  user_feedback: z.string().nullable(),
  auto_eval_score: z.number().min(0).max(1).nullable(),
  user_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  session_id: z.string().uuid().nullable(),
  estimated_cost: z.number().nullable(),
  created_at: z.string().datetime(),
});

export type Execution = z.infer<typeof ExecutionSchema>;

// Execution input
export const ExecutionInputSchema = z.object({
  input_text: z.string().min(1),
  persona_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  stream: z.boolean().default(false),
});

export type ExecutionInput = z.infer<typeof ExecutionInputSchema>;

// Execution filters
export const ExecutionFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  agent_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
});

export type ExecutionFilters = z.infer<typeof ExecutionFiltersSchema>;

// Import PaginatedResult from shared
export { PaginatedResult } from './shared.js';

// Execution feedback
export const ExecutionFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

export type ExecutionFeedback = z.infer<typeof ExecutionFeedbackSchema>;
