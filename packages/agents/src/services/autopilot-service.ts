/**
 * Autopilot Service
 * 
 * Event-driven automation for engagements.
 * Responds to document uploads, task completions, and review submissions.
 */

import type { EngagementPhase, TaskStatus } from '@prisma/db';

// ============================================================================
// TYPES
// ============================================================================

export type AutopilotEvent =
    | 'document_uploaded'
    | 'document_extracted'
    | 'task_completed'
    | 'task_blocked'
    | 'review_submitted'
    | 'review_approved'
    | 'review_rejected'
    | 'phase_completed';

export interface AutopilotInput {
    engagementId: string;
    event: AutopilotEvent;
    payload: Record<string, unknown>;
    triggeredBy?: string;
}

export interface AutopilotResult {
    success: boolean;
    engagementId: string;
    event: AutopilotEvent;
    actions: AutopilotAction[];
    stateChanges: StateChange[];
    notifications: Notification[];
    processedAt: string;
}

export interface AutopilotAction {
    type: 'task_update' | 'workpaper_update' | 'notification' | 'agent_run' | 'phase_transition';
    description: string;
    resourceId?: string;
    data?: Record<string, unknown>;
}

export interface StateChange {
    resourceType: 'task' | 'workpaper' | 'engagement' | 'document';
    resourceId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface Notification {
    type: 'info' | 'warning' | 'action_required';
    recipientRole: string;
    message: string;
}

// ============================================================================
// AUTOPILOT SERVICE
// ============================================================================

export class AutopilotService {

    /**
     * Process an autopilot event
     */
    async processEvent(input: AutopilotInput): Promise<AutopilotResult> {
        const { engagementId, event, payload } = input;
        const actions: AutopilotAction[] = [];
        const stateChanges: StateChange[] = [];
        const notifications: Notification[] = [];

        switch (event) {
            case 'document_uploaded':
                await this.handleDocumentUploaded(payload, actions, stateChanges, notifications);
                break;

            case 'document_extracted':
                await this.handleDocumentExtracted(payload, actions, stateChanges, notifications);
                break;

            case 'task_completed':
                await this.handleTaskCompleted(payload, actions, stateChanges, notifications);
                break;

            case 'review_submitted':
                await this.handleReviewSubmitted(payload, actions, stateChanges, notifications);
                break;

            case 'review_approved':
                await this.handleReviewApproved(payload, actions, stateChanges, notifications);
                break;

            case 'review_rejected':
                await this.handleReviewRejected(payload, actions, stateChanges, notifications);
                break;

            case 'phase_completed':
                await this.handlePhaseCompleted(payload, actions, stateChanges, notifications);
                break;

            default:
                // Unknown event - log but don't fail
                actions.push({
                    type: 'notification',
                    description: `Unknown event type: ${event}`,
                });
        }

        return {
            success: true,
            engagementId,
            event,
            actions,
            stateChanges,
            notifications,
            processedAt: new Date().toISOString(),
        };
    }

    // ==========================================================================
    // EVENT HANDLERS
    // ==========================================================================

    private async handleDocumentUploaded(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const documentId = payload.documentId as string;
        const docType = payload.docType as string;

        // Action: Queue for extraction
        actions.push({
            type: 'agent_run',
            description: 'Queue document for AI extraction',
            resourceId: documentId,
            data: { action: 'extract', docType },
        });

        // State change: Document status → processing
        stateChanges.push({
            resourceType: 'document',
            resourceId: documentId,
            field: 'status',
            oldValue: 'uploaded',
            newValue: 'processing',
        });

        // Find and update related tasks
        // TODO: Query tasks with matching docType requirement
        actions.push({
            type: 'task_update',
            description: 'Update related document request tasks',
            data: { docType, markAsReceived: true },
        });
    }

    private async handleDocumentExtracted(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const documentId = payload.documentId as string;
        const extractionId = payload.extractionId as string;

        // State change: Document status → extracted
        stateChanges.push({
            resourceType: 'document',
            resourceId: documentId,
            field: 'status',
            oldValue: 'processing',
            newValue: 'extracted',
        });

        // Action: Link extraction to relevant workpapers
        actions.push({
            type: 'workpaper_update',
            description: 'Link extraction to relevant workpapers',
            resourceId: extractionId,
            data: { action: 'link_to_workpapers' },
        });

        // Action: Update task citations
        actions.push({
            type: 'task_update',
            description: 'Add document citation to related tasks',
            data: { documentId, extractionId },
        });

        // Notify: Extraction complete
        notifications.push({
            type: 'info',
            recipientRole: 'STAFF',
            message: 'Document extraction complete. Review extracted data.',
        });
    }

    private async handleTaskCompleted(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const taskId = payload.taskId as string;
        const phase = payload.phase as EngagementPhase;
        const dependentTasks = (payload.dependentTasks || []) as string[];

        // State change: Task status → completed
        stateChanges.push({
            resourceType: 'task',
            resourceId: taskId,
            field: 'status',
            oldValue: 'in_progress',
            newValue: 'completed',
        });

        // Action: Unblock dependent tasks
        for (const depTaskId of dependentTasks) {
            actions.push({
                type: 'task_update',
                description: `Unblock dependent task`,
                resourceId: depTaskId,
                data: { action: 'check_dependencies' },
            });
        }

        // Check if phase is complete
        // TODO: Query if all tasks in phase are complete
        actions.push({
            type: 'phase_transition',
            description: 'Check if phase is complete',
            data: { phase },
        });
    }

    private async handleReviewSubmitted(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const resourceType = payload.resourceType as string;
        const resourceId = payload.resourceId as string;
        const stage = payload.stage as string; // 'MANAGER' | 'PARTNER' | 'EQR'

        // State change: Resource status → review
        stateChanges.push({
            resourceType: resourceType as 'workpaper',
            resourceId,
            field: 'status',
            oldValue: 'draft',
            newValue: 'review',
        });

        // Notify appropriate reviewer
        notifications.push({
            type: 'action_required',
            recipientRole: stage,
            message: `Review required for ${resourceType} submission`,
        });
    }

    private async handleReviewApproved(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const resourceType = payload.resourceType as string;
        const resourceId = payload.resourceId as string;
        const stage = payload.stage as string;
        const nextStage = payload.nextStage as string | undefined;

        if (nextStage) {
            // Move to next review stage
            notifications.push({
                type: 'action_required',
                recipientRole: nextStage,
                message: `${stage} approved. ${nextStage} review required.`,
            });
        } else {
            // Final approval
            stateChanges.push({
                resourceType: resourceType as 'workpaper',
                resourceId,
                field: 'status',
                oldValue: 'review',
                newValue: 'approved',
            });

            notifications.push({
                type: 'info',
                recipientRole: 'STAFF',
                message: `${resourceType} approved by ${stage}`,
            });
        }
    }

    private async handleReviewRejected(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const resourceType = payload.resourceType as string;
        const resourceId = payload.resourceId as string;
        const reason = payload.reason as string;

        // State change: Back to draft
        stateChanges.push({
            resourceType: resourceType as 'workpaper',
            resourceId,
            field: 'status',
            oldValue: 'review',
            newValue: 'rejected',
        });

        // Notify preparer
        notifications.push({
            type: 'action_required',
            recipientRole: 'STAFF',
            message: `${resourceType} rejected: ${reason}`,
        });
    }

    private async handlePhaseCompleted(
        payload: Record<string, unknown>,
        actions: AutopilotAction[],
        stateChanges: StateChange[],
        notifications: Notification[]
    ): Promise<void> {
        const engagementId = payload.engagementId as string;
        const completedPhase = payload.phase as EngagementPhase;
        const nextPhase = this.getNextPhase(completedPhase);

        if (nextPhase) {
            // Transition to next phase
            stateChanges.push({
                resourceType: 'engagement',
                resourceId: engagementId,
                field: 'phase',
                oldValue: completedPhase,
                newValue: nextPhase,
            });

            actions.push({
                type: 'phase_transition',
                description: `Transition from ${completedPhase} to ${nextPhase}`,
                resourceId: engagementId,
                data: { fromPhase: completedPhase, toPhase: nextPhase },
            });

            notifications.push({
                type: 'info',
                recipientRole: 'MANAGER',
                message: `${completedPhase} phase complete. Moving to ${nextPhase}.`,
            });
        } else {
            // Engagement complete
            notifications.push({
                type: 'info',
                recipientRole: 'PARTNER',
                message: 'All phases complete. Ready for final sign-off.',
            });
        }
    }

    // ==========================================================================
    // HELPERS
    // ==========================================================================

    private getNextPhase(currentPhase: EngagementPhase): EngagementPhase | null {
        const phaseOrder: EngagementPhase[] = ['planning', 'fieldwork', 'completion', 'archived'];
        const currentIndex = phaseOrder.indexOf(currentPhase);

        if (currentIndex < 0 || currentIndex >= phaseOrder.length - 1) {
            return null;
        }

        return phaseOrder[currentIndex + 1];
    }
}

// Export singleton
export const autopilotService = new AutopilotService();
