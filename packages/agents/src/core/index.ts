/**
 * Core Module
 * 
 * Multi-agent workflow orchestration with HITL support.
 */

// Workflow Engine
export {
    WorkflowEngine,
    workflowEngine,
    type WorkflowEngineOptions,
} from './workflow-engine.js';

// HITL Manager
export {
    HITLManager,
    hitlManager,
    type HITLConfig,
    type CreateApprovalParams,
    type ApprovalFilters,
    type ApprovalStats,
    type ApprovalEventType,
    type ApprovalEvent,
} from './hitl-manager.js';

// Types
export type {
    // Task types
    TaskStatus,
    TaskNode,
    TaskConfig,
    TaskError,
    TaskTiming,

    // Workflow types
    WorkflowStatus,
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowResult,
    WorkflowTrigger,
    WorkflowConfig,
    WorkflowCheckpoint,
    WorkflowEvent,
    WorkflowEventType,
    WorkflowTiming,
    WorkflowMetadata,

    // Approval types
    ApprovalRequest,
    ApprovalStatus,
    ApprovalContext,
    ApprovalDecision,

    // Reasoning types
    ReasoningStep,
    ReasoningSource,
    ChainOfThought,
} from './types.js';

// Workflow Templates
export {
    ENGAGEMENT_AUDIT_WORKFLOW,
    RISK_ASSESSMENT_WORKFLOW,
    TAX_COMPLIANCE_WORKFLOW,
    WORKFLOW_TEMPLATES,
    getWorkflowTemplate,
    listWorkflowTemplates,
    type WorkflowTemplateId,
} from './workflow-templates.js';
