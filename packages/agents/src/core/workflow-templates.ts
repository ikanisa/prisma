/**
 * Audit Workflow Templates
 * 
 * Pre-defined workflow definitions for common audit scenarios.
 * Based on ISA standards and Big-4 best practices.
 */

import type { WorkflowDefinition, TaskNode } from './types.js';

// ============================================================================
// ENGAGEMENT AUDIT WORKFLOW
// ============================================================================

/**
 * Full engagement audit workflow following ISA methodology.
 * 
 * Phases:
 * 1. Planning - Risk assessment, materiality, strategy
 * 2. Execution - Substantive testing, controls testing
 * 3. Completion - Wrap-up, opinion, reporting
 */
export const ENGAGEMENT_AUDIT_WORKFLOW: WorkflowDefinition = {
    id: 'audit-engagement-full',
    name: 'Full Engagement Audit',
    version: '1.0.0',
    description: 'Complete audit engagement workflow from planning to opinion',
    defaultConfig: {
        maxParallelTasks: 3,
        globalTimeout: 3600000, // 1 hour
        onFailure: 'stop',
        checkpointOnComplete: true,
        notifyOnComplete: true,
    },
    tasks: [
        // Phase 1: Planning
        {
            id: 'task-risk-assessment',
            name: 'Risk Assessment',
            agentType: 'audit',
            description: 'Perform comprehensive risk assessment including inherent risk, control risk, and fraud risk evaluation',
            dependencies: [],
            status: 'pending',
            priority: 100,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['get_engagement_context', 'compute_materiality'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-materiality',
            name: 'Materiality Calculation',
            agentType: 'audit',
            description: 'Calculate overall materiality, performance materiality, and trivial threshold',
            dependencies: ['task-risk-assessment'],
            status: 'pending',
            priority: 90,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager', 'partner'],
                riskLevel: 'high',
                autoApproveThreshold: 0.95,
                tools: ['compute_materiality'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
        {
            id: 'task-audit-strategy',
            name: 'Audit Strategy',
            agentType: 'audit',
            description: 'Develop overall audit strategy and detailed audit plan',
            dependencies: ['task-materiality'],
            status: 'pending',
            priority: 85,
            config: {
                requiresApproval: true,
                approvalRoles: ['partner'],
                riskLevel: 'high',
                tools: ['get_engagement_context', 'create_or_update_workpaper'],
            },
            retryCount: 0,
            maxRetries: 1,
        },

        // Phase 2: Execution (can run in parallel)
        {
            id: 'task-controls-testing',
            name: 'Controls Testing',
            agentType: 'audit',
            description: 'Test operating effectiveness of key controls',
            dependencies: ['task-audit-strategy'],
            status: 'pending',
            priority: 80,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['compute_sampling_plan', 'create_tasks'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-substantive-revenue',
            name: 'Substantive Testing - Revenue',
            agentType: 'audit',
            description: 'Perform substantive testing of revenue recognition',
            dependencies: ['task-audit-strategy'],
            status: 'pending',
            priority: 80,
            config: {
                requiresApproval: false,
                riskLevel: 'high',
                tools: ['compute_sampling_plan', 'request_documents'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-substantive-receivables',
            name: 'Substantive Testing - Receivables',
            agentType: 'audit',
            description: 'Perform substantive testing of accounts receivable',
            dependencies: ['task-audit-strategy'],
            status: 'pending',
            priority: 75,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['compute_sampling_plan', 'generate_confirmation_letter'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-substantive-payables',
            name: 'Substantive Testing - Payables',
            agentType: 'audit',
            description: 'Perform substantive testing of accounts payable',
            dependencies: ['task-audit-strategy'],
            status: 'pending',
            priority: 70,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['compute_sampling_plan'],
            },
            retryCount: 0,
            maxRetries: 2,
        },

        // Phase 3: Completion
        {
            id: 'task-evaluate-misstatements',
            name: 'Evaluate Misstatements',
            agentType: 'audit',
            description: 'Aggregate and evaluate identified misstatements against materiality',
            dependencies: [
                'task-controls-testing',
                'task-substantive-revenue',
                'task-substantive-receivables',
                'task-substantive-payables',
            ],
            status: 'pending',
            priority: 60,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager', 'partner'],
                riskLevel: 'critical',
                tools: ['evaluate_misstatements'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
        {
            id: 'task-audit-opinion',
            name: 'Draft Audit Opinion',
            agentType: 'audit',
            description: 'Formulate audit opinion based on testing conclusions',
            dependencies: ['task-evaluate-misstatements'],
            status: 'pending',
            priority: 50,
            config: {
                requiresApproval: true,
                approvalRoles: ['partner'],
                riskLevel: 'critical',
                tools: ['create_or_update_workpaper'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
    ],
};

// ============================================================================
// RISK ASSESSMENT WORKFLOW
// ============================================================================

/**
 * Focused risk assessment workflow for initial planning.
 */
export const RISK_ASSESSMENT_WORKFLOW: WorkflowDefinition = {
    id: 'audit-risk-assessment',
    name: 'Risk Assessment',
    version: '1.0.0',
    description: 'ISA 315 compliant risk assessment workflow',
    defaultConfig: {
        maxParallelTasks: 2,
        globalTimeout: 1800000, // 30 minutes
        onFailure: 'stop',
        checkpointOnComplete: true,
        notifyOnComplete: true,
    },
    tasks: [
        {
            id: 'task-understand-entity',
            name: 'Understand Entity & Environment',
            agentType: 'audit',
            description: 'Obtain understanding of entity, industry, and regulatory environment',
            dependencies: [],
            status: 'pending',
            priority: 100,
            config: {
                requiresApproval: false,
                riskLevel: 'low',
                tools: ['get_engagement_context', 'list_documents'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-internal-control',
            name: 'Evaluate Internal Control',
            agentType: 'audit',
            description: 'Evaluate design and implementation of internal controls',
            dependencies: ['task-understand-entity'],
            status: 'pending',
            priority: 90,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['get_engagement_context'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-identify-risks',
            name: 'Identify & Assess Risks',
            agentType: 'audit',
            description: 'Identify and assess risks of material misstatement',
            dependencies: ['task-internal-control'],
            status: 'pending',
            priority: 85,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager'],
                riskLevel: 'high',
                tools: ['create_or_update_workpaper'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
        {
            id: 'task-fraud-risk',
            name: 'Fraud Risk Assessment',
            agentType: 'audit',
            description: 'Assess fraud risk factors including management override',
            dependencies: ['task-identify-risks'],
            status: 'pending',
            priority: 80,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager', 'partner'],
                riskLevel: 'critical',
                tools: ['create_or_update_workpaper'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
    ],
};

// ============================================================================
// TAX COMPLIANCE WORKFLOW
// ============================================================================

/**
 * Tax compliance and filing workflow.
 */
export const TAX_COMPLIANCE_WORKFLOW: WorkflowDefinition = {
    id: 'tax-compliance-full',
    name: 'Tax Compliance & Filing',
    version: '1.0.0',
    description: 'Complete tax compliance workflow from data gathering to filing',
    defaultConfig: {
        maxParallelTasks: 4,
        globalTimeout: 7200000, // 2 hours
        onFailure: 'stop',
        checkpointOnComplete: true,
        notifyOnComplete: true,
    },
    tasks: [
        {
            id: 'task-gather-data',
            name: 'Gather Tax Data',
            agentType: 'tax',
            description: 'Collect and validate tax-relevant data from accounting system',
            dependencies: [],
            status: 'pending',
            priority: 100,
            config: {
                requiresApproval: false,
                riskLevel: 'low',
                tools: ['get_engagement_context', 'list_documents'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-compute-vat',
            name: 'Compute VAT/GST',
            agentType: 'tax',
            description: 'Calculate VAT/GST liability for the period',
            dependencies: ['task-gather-data'],
            status: 'pending',
            priority: 90,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['compute_vat_return'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-compute-cit',
            name: 'Compute Corporate Tax',
            agentType: 'tax',
            description: 'Calculate corporate income tax liability',
            dependencies: ['task-gather-data'],
            status: 'pending',
            priority: 90,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager'],
                riskLevel: 'high',
                tools: ['compute_income_tax'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
        {
            id: 'task-compute-wht',
            name: 'Compute Withholding Tax',
            agentType: 'tax',
            description: 'Calculate withholding tax on cross-border payments',
            dependencies: ['task-gather-data'],
            status: 'pending',
            priority: 85,
            config: {
                requiresApproval: false,
                riskLevel: 'medium',
                tools: ['compute_withholding_tax', 'check_treaty_rate'],
            },
            retryCount: 0,
            maxRetries: 2,
        },
        {
            id: 'task-review-filing',
            name: 'Review & Prepare Filing',
            agentType: 'tax',
            description: 'Review calculations and prepare returns for filing',
            dependencies: ['task-compute-vat', 'task-compute-cit', 'task-compute-wht'],
            status: 'pending',
            priority: 70,
            config: {
                requiresApproval: true,
                approvalRoles: ['manager', 'partner'],
                riskLevel: 'critical',
                tools: ['create_or_update_workpaper'],
            },
            retryCount: 0,
            maxRetries: 1,
        },
    ],
};

// ============================================================================
// EXPORT ALL WORKFLOWS
// ============================================================================

export const WORKFLOW_TEMPLATES = {
    'audit-engagement-full': ENGAGEMENT_AUDIT_WORKFLOW,
    'audit-risk-assessment': RISK_ASSESSMENT_WORKFLOW,
    'tax-compliance-full': TAX_COMPLIANCE_WORKFLOW,
} as const;

export type WorkflowTemplateId = keyof typeof WORKFLOW_TEMPLATES;

/**
 * Get a workflow template by ID
 */
export function getWorkflowTemplate(id: WorkflowTemplateId): WorkflowDefinition {
    return WORKFLOW_TEMPLATES[id];
}

/**
 * List all available workflow templates
 */
export function listWorkflowTemplates(): { id: string; name: string; description: string }[] {
    return Object.values(WORKFLOW_TEMPLATES).map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
    }));
}
