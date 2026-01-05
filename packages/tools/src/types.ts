/**
 * Tool Types
 * 
 * Core types for tool definitions, inputs, outputs, and audit logs
 */

/**
 * User role enum (matches database app_role)
 */
export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  STAFF = 'STAFF',
}

/**
 * Tool input schema (JSON Schema compatible)
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  requiredRole?: UserRole; // If undefined, all authenticated users can use
  idempotent?: boolean; // If true, tool is safe to retry
}

/**
 * Tool execution context
 */
export interface ToolContext {
  userId: string;
  userRole: UserRole;
  organizationId?: string;
  requestId?: string; // For idempotency
}

/**
 * Tool execution result
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  auditLog?: ToolAuditLog;
}

/**
 * Tool audit log entry
 */
export interface ToolAuditLog {
  toolName: string;
  userId: string;
  userRole: UserRole;
  organizationId?: string;
  input: Record<string, unknown>;
  output: ToolResult;
  timestamp: Date;
  durationMs: number;
  requestId?: string;
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TInput = Record<string, unknown>, TOutput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult<TOutput>>;

/**
 * Permission check result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

