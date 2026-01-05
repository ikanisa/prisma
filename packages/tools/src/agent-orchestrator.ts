/**
 * Agent Orchestrator
 * 
 * Orchestrates agent workflows using the tool registry
 * Connects OpenAI Agents SDK and Agent Builder to tools
 */

import { toolRegistry } from './registry';
import type { ToolContext, ToolResult } from './types';
import type { ToolDefinition } from './types';

/**
 * Agent workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  toolName: string;
  input: Record<string, unknown>;
  condition?: (previousResults: ToolResult[]) => boolean;
  onSuccess?: (result: ToolResult) => void;
  onError?: (error: ToolResult) => void;
}

/**
 * Agent workflow definition
 */
export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  parallel?: boolean; // If true, steps can run in parallel
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  steps: Array<{
    stepId: string;
    toolName: string;
    result: ToolResult;
    durationMs: number;
  }>;
  totalDurationMs: number;
  error?: {
    stepId: string;
    message: string;
  };
}

/**
 * Agent Orchestrator
 * Executes workflows using the tool registry
 */
export class AgentOrchestrator {
  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: AgentWorkflow,
    context: ToolContext
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const stepResults: WorkflowResult['steps'] = [];
    const previousResults: ToolResult[] = [];

    try {
      if (workflow.parallel) {
        // Execute steps in parallel
        const stepPromises = workflow.steps.map(async (step) => {
          const stepStartTime = Date.now();
          
          // Check condition if provided
          if (step.condition && !step.condition(previousResults)) {
            return {
              stepId: step.id,
              toolName: step.toolName,
              result: {
                success: false,
                error: {
                  code: 'CONDITION_NOT_MET',
                  message: `Step ${step.name} condition not met`,
                },
              },
              durationMs: Date.now() - stepStartTime,
            };
          }

          // Execute tool
          const result = await toolRegistry.execute(step.toolName, step.input, context);
          const durationMs = Date.now() - stepStartTime;

          // Call callbacks
          if (result.success && step.onSuccess) {
            step.onSuccess(result);
          } else if (!result.success && step.onError) {
            step.onError(result);
          }

          return {
            stepId: step.id,
            toolName: step.toolName,
            result,
            durationMs,
          };
        });

        const results = await Promise.all(stepPromises);
        stepResults.push(...results);
      } else {
        // Execute steps sequentially
        for (const step of workflow.steps) {
          const stepStartTime = Date.now();

          // Check condition if provided
          if (step.condition && !step.condition(previousResults)) {
            const skippedResult: ToolResult = {
              success: false,
              error: {
                code: 'CONDITION_NOT_MET',
                message: `Step ${step.name} condition not met`,
              },
            };
            stepResults.push({
              stepId: step.id,
              toolName: step.toolName,
              result: skippedResult,
              durationMs: Date.now() - stepStartTime,
            });
            previousResults.push(skippedResult);
            continue;
          }

          // Execute tool
          const result = await toolRegistry.execute(step.toolName, step.input, context);
          const durationMs = Date.now() - stepStartTime;

          stepResults.push({
            stepId: step.id,
            toolName: step.toolName,
            result,
            durationMs,
          });

          previousResults.push(result);

          // Call callbacks
          if (result.success && step.onSuccess) {
            step.onSuccess(result);
          } else if (!result.success && step.onError) {
            step.onError(result);
          }

          // Stop on error if workflow should fail fast
          if (!result.success) {
            break;
          }
        }
      }

      const totalDurationMs = Date.now() - startTime;
      const allSuccessful = stepResults.every((sr) => sr.result.success);

      return {
        workflowId: workflow.id,
        success: allSuccessful,
        steps: stepResults,
        totalDurationMs,
        error: allSuccessful
          ? undefined
          : {
              stepId: stepResults.find((sr) => !sr.result.success)?.stepId || 'unknown',
              message: stepResults.find((sr) => !sr.result.success)?.result.error?.message || 'Unknown error',
            },
      };
    } catch (error) {
      const totalDurationMs = Date.now() - startTime;
      return {
        workflowId: workflow.id,
        success: false,
        steps: stepResults,
        totalDurationMs,
        error: {
          stepId: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown workflow error',
        },
      };
    }
  }

  /**
   * Get available tools for agent
   */
  getAvailableTools(): ToolDefinition[] {
    return toolRegistry.listTools();
  }

  /**
   * Check if tool is available
   */
  isToolAvailable(toolName: string): boolean {
    return toolRegistry.getDefinition(toolName) !== undefined;
  }
}

/**
 * Global orchestrator instance
 */
export const agentOrchestrator = new AgentOrchestrator();

/**
 * Predefined workflows
 */

/**
 * Engagement Setup Workflow
 * Creates an engagement and sets up initial tasks
 */
export function createEngagementSetupWorkflow(
  clientId: string,
  engagementType: string,
  period: string,
  assignedStaffId?: string
): AgentWorkflow {
  return {
    id: 'engagement-setup',
    name: 'Engagement Setup',
    description: 'Set up a new engagement with initial tasks',
    steps: [
      {
        id: 'create-engagement',
        name: 'Create Engagement',
        toolName: 'create_engagement',
        input: {
          clientId,
          type: engagementType,
          period,
          assignedStaffId,
        },
        onSuccess: (result) => {
          // Engagement created successfully
        },
      },
      {
        id: 'generate-doc-request',
        name: 'Generate Document Request',
        toolName: 'generate_request_for_documents',
        input: {
          engagementId: '{{create-engagement.data.engagementId}}', // Would be resolved from previous step
        },
        condition: (results) => {
          // Only run if engagement was created successfully
          return results[0]?.success === true;
        },
      },
    ],
  };
}

/**
 * Document Ingestion Workflow
 * Uploads, classifies, and extracts entities from documents
 */
export function createDocumentIngestionWorkflow(
  engagementId: string,
  fileId: string,
  fileName: string
): AgentWorkflow {
  return {
    id: 'document-ingestion',
    name: 'Document Ingestion',
    description: 'Ingest, classify, and extract entities from documents',
    steps: [
      {
        id: 'upload-document',
        name: 'Upload Document',
        toolName: 'upload_document',
        input: {
          engagementId,
          fileId,
          fileName,
        },
      },
      {
        id: 'classify-document',
        name: 'Classify Document',
        toolName: 'classify_document',
        input: {
          fileId,
          documentId: '{{upload-document.data.documentId}}',
        },
        condition: (results) => results[0]?.success === true,
      },
      {
        id: 'extract-entities',
        name: 'Extract Entities',
        toolName: 'extract_entities',
        input: {
          fileId,
          documentId: '{{upload-document.data.documentId}}',
        },
        condition: (results) => results[0]?.success === true,
      },
    ],
  };
}

/**
 * Report Generation Workflow
 * Generates management letter and tax summary
 */
export function createReportGenerationWorkflow(
  engagementId: string,
  taxYear?: string,
  jurisdiction?: string
): AgentWorkflow {
  return {
    id: 'report-generation',
    name: 'Report Generation',
    description: 'Generate management letter and tax summary',
    parallel: true,
    steps: [
      {
        id: 'generate-management-letter',
        name: 'Generate Management Letter',
        toolName: 'generate_management_letter',
        input: {
          engagementId,
          includeFindings: true,
        },
      },
      {
        id: 'generate-tax-summary',
        name: 'Generate Tax Summary',
        toolName: 'generate_tax_summary',
        input: {
          engagementId,
          taxYear: taxYear || new Date().getFullYear().toString(),
          jurisdiction,
        },
        condition: (results) => {
          // Only generate tax summary if engagement type is TAX
          return true; // Would check engagement type in real implementation
        },
      },
    ],
  };
}

