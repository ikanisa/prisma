/**
 * Agent Schemas Index
 * 
 * Zod schemas for structured agent outputs.
 */

export {
    WorkpaperSchema,
    TaskListSchema,
    DocumentRequestSchema,
    TextResponseSchema,
    WidgetSchema,
    AgentOutputSchema,
    type WorkpaperOutput,
    type TaskListOutput,
    type DocumentRequestOutput,
    type TextResponseOutput,
    type WidgetOutput,
    type AgentOutput,
} from './outputs.js';

export {
    MaterialityInputSchema,
    VatInputSchema,
    type MaterialitySchemaInput,
    type VatSchemaInput,
} from './inputs.js';
