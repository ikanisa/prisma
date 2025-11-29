/**
 * Zod schemas for Persona-related validation
 */

import { z } from 'zod';

// Communication style enum
export const CommunicationStyleSchema = z.enum([
  'professional',
  'friendly',
  'concise',
  'detailed',
  'technical',
]);

export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

// PII handling enum
export const PIIHandlingSchema = z.enum([
  'redact',
  'mask',
  'warn',
  'allow',
]);

export type PIIHandling = z.infer<typeof PIIHandlingSchema>;

// Persona schema
export const PersonaSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  role: z.string().max(255).optional(),
  system_prompt: z.string().min(1),
  personality_traits: z.array(z.string()).default([]),
  communication_style: CommunicationStyleSchema.default('professional'),
  capabilities: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  context_window_size: z.number().int().positive().default(128000),
  max_output_tokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  top_p: z.number().min(0).max(1).default(0.9),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  presence_penalty: z.number().min(-2).max(2).default(0),
  content_filters: z.record(z.unknown()).default({}),
  pii_handling: PIIHandlingSchema.default('redact'),
  version: z.number().int().positive().default(1),
  is_active: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Persona = z.infer<typeof PersonaSchema>;

// Create persona input
export const CreatePersonaInputSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().max(255).optional(),
  system_prompt: z.string().min(1),
  personality_traits: z.array(z.string()).default([]),
  communication_style: CommunicationStyleSchema.default('professional'),
  capabilities: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  context_window_size: z.number().int().positive().default(128000),
  max_output_tokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  top_p: z.number().min(0).max(1).default(0.9),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  presence_penalty: z.number().min(-2).max(2).default(0),
  content_filters: z.record(z.unknown()).default({}),
  pii_handling: PIIHandlingSchema.default('redact'),
  is_active: z.boolean().default(false),
});

export type CreatePersonaInput = z.infer<typeof CreatePersonaInputSchema>;

// Update persona input
export const UpdatePersonaInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().max(255).optional().nullable(),
  system_prompt: z.string().min(1).optional(),
  personality_traits: z.array(z.string()).optional(),
  communication_style: CommunicationStyleSchema.optional(),
  capabilities: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  context_window_size: z.number().int().positive().optional(),
  max_output_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  content_filters: z.record(z.unknown()).optional(),
  pii_handling: PIIHandlingSchema.optional(),
  is_active: z.boolean().optional(),
});

export type UpdatePersonaInput = z.infer<typeof UpdatePersonaInputSchema>;

// Test persona input
export const TestPersonaInputSchema = z.object({
  input_text: z.string().min(1),
});

export type TestPersonaInput = z.infer<typeof TestPersonaInputSchema>;
