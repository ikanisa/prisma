/**
 * Tool Registry
 * 
 * Central registry for all tools, used by both API and MCP server
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from './types';
import { UserRole } from './types';
import { logToolExecution } from './database';
import { validateToolInput, sanitizeToolInput } from './validation';

// Import all tool handlers
import * as identityTools from './identity';
import * as engagementTools from './engagements';
import * as documentTools from './documents';
import * as workpaperTools from './workpapers';
import * as knowledgeTools from './knowledge';

/**
 * Tool registry entry
 */
interface ToolRegistryEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * Global tool registry
 */
class ToolRegistry {
  private tools = new Map<string, ToolRegistryEntry>();

  /**
   * Register a tool
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  /**
   * Get tool definition
   */
  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  /**
   * Get tool handler
   */
  getHandler(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler;
  }

  /**
   * List all tool definitions
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((entry) => entry.definition);
  }

  /**
   * Check if user has permission to use tool
   */
  checkPermission(toolName: string, userRole: UserRole): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    // If no required role, all authenticated users can use
    if (!tool.definition.requiredRole) {
      return true;
    }

    // SYSTEM_ADMIN can use any tool
    if (userRole === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    // Check if user role matches required role
    return userRole === tool.definition.requiredRole;
  }

  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const entry = this.tools.get(toolName);
    if (!entry) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool not found: ${toolName}`,
        },
      };
    }

    // Check permissions
    if (!this.checkPermission(toolName, context.userRole)) {
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `User role ${context.userRole} does not have permission to use tool ${toolName}`,
        },
      };
    }

    // Validate input
    const validation = validateToolInput(entry.definition, input);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Input validation failed: ${validation.errors.join(', ')}`,
          details: validation.errors,
        },
      };
    }

    // Sanitize input
    const sanitizedInput = sanitizeToolInput(entry.definition, input);

    // Execute tool
    const startTime = Date.now();
    try {
      const result = await entry.handler(sanitizedInput, context);
      const durationMs = Date.now() - startTime;

      // Add audit log
      result.auditLog = {
        toolName,
        userId: context.userId,
        userRole: context.userRole,
        organizationId: context.organizationId,
        input: sanitizedInput,
        output: result,
        timestamp: new Date(),
        durationMs,
        requestId: context.requestId,
      };

      // Persist audit log to database (async, don't wait)
      logToolExecution({
        toolName,
        userId: context.userId,
        userRole: context.userRole,
        organizationId: context.organizationId,
        input: sanitizedInput,
        output: result,
        success: result.success,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        durationMs,
        requestId: context.requestId,
      }).catch((err) => {
        console.error('Failed to log tool execution:', err);
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const result: ToolResult = {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        auditLog: {
          toolName,
          userId: context.userId,
          userRole: context.userRole,
          organizationId: context.organizationId,
          input: sanitizedInput,
          output: {
            success: false,
            error: {
              code: 'TOOL_EXECUTION_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          },
          timestamp: new Date(),
          durationMs,
          requestId: context.requestId,
        },
      };
      return result;
    }
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();

/**
 * Initialize tool registry with all tools
 */
export function initializeToolRegistry(): void {
  // Register identity tools
  toolRegistry.register(identityTools.whoamiDefinition, identityTools.whoami);
  toolRegistry.register(identityTools.listStaffDefinition, identityTools.listStaff);
  toolRegistry.register(identityTools.setStaffRolePermissionsDefinition, identityTools.setStaffRolePermissions);

  // Register engagement tools
  toolRegistry.register(engagementTools.createEngagementDefinition, engagementTools.createEngagement);
  toolRegistry.register(engagementTools.getEngagementDefinition, engagementTools.getEngagement);
  toolRegistry.register(engagementTools.listEngagementsDefinition, engagementTools.listEngagements);
  toolRegistry.register(engagementTools.addEngagementNoteDefinition, engagementTools.addEngagementNote);
  toolRegistry.register(engagementTools.assignEngagementDefinition, engagementTools.assignEngagement);

  // Register document tools
  toolRegistry.register(documentTools.uploadDocumentDefinition, documentTools.uploadDocument);
  toolRegistry.register(documentTools.classifyDocumentDefinition, documentTools.classifyDocument);
  toolRegistry.register(documentTools.extractEntitiesDefinition, documentTools.extractEntities);
  toolRegistry.register(documentTools.generateRequestForDocumentsDefinition, documentTools.generateRequestForDocuments);

  // Register workpaper tools
  toolRegistry.register(workpaperTools.runAuditProcedureDefinition, workpaperTools.runAuditProcedure);
  toolRegistry.register(workpaperTools.generateManagementLetterDefinition, workpaperTools.generateManagementLetter);
  toolRegistry.register(workpaperTools.generateTaxSummaryDefinition, workpaperTools.generateTaxSummary);

  // Register knowledge tools
  toolRegistry.register(knowledgeTools.searchKnowledgeBaseDefinition, knowledgeTools.searchKnowledgeBase);
}

// Auto-initialize on import
initializeToolRegistry();

