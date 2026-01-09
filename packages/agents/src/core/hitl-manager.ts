/**
 * Human-in-the-Loop (HITL) Manager
 * 
 * Manages approval workflows for high-risk agent decisions.
 * Routes based on risk level, tracks SLAs, and maintains audit trail.
 * 
 * @example
 * ```typescript
 * const manager = new HITLManager();
 * 
 * // Request approval for high-risk action
 * const request = await manager.requestApproval({
 *   workflowInstanceId: 'wf-123',
 *   taskId: 'task-456',
 *   riskLevel: 'high',
 *   context: { summary: 'Material adjustment detected', ... }
 * });
 * 
 * // Approve the request
 * await manager.approve(request.id, 'user-789', 'Reviewed and approved');
 * ```
 */

import type {
    ApprovalRequest,
    ApprovalStatus,
    ApprovalContext,
    ApprovalDecision,
} from './types.js';

// ============================================================================
// HITL CONFIGURATION
// ============================================================================

export interface HITLConfig {
    defaultSLA: {
        low: number;      // minutes
        medium: number;
        high: number;
        critical: number;
    };
    autoApproveRiskLevels: ('low' | 'medium' | 'high' | 'critical')[];
    escalationPath: {
        [role: string]: string; // role -> escalation role
    };
    notificationChannels: ('email' | 'slack' | 'inApp')[];
}

const DEFAULT_CONFIG: HITLConfig = {
    defaultSLA: {
        low: 60,        // 1 hour
        medium: 30,     // 30 minutes
        high: 15,       // 15 minutes
        critical: 5,    // 5 minutes
    },
    autoApproveRiskLevels: ['low'],
    escalationPath: {
        'staff': 'manager',
        'manager': 'partner',
        'partner': 'admin',
    },
    notificationChannels: ['inApp', 'email'],
};

// ============================================================================
// HITL MANAGER
// ============================================================================

export class HITLManager {
    private requests: Map<string, ApprovalRequest> = new Map();
    private config: HITLConfig;
    private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
    private eventHandlers: Map<string, ((event: ApprovalEvent) => void)[]> = new Map();

    constructor(config: Partial<HITLConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ========================================================================
    // APPROVAL REQUEST LIFECYCLE
    // ========================================================================

    /**
     * Create a new approval request
     */
    async requestApproval(params: CreateApprovalParams): Promise<ApprovalRequest> {
        const id = crypto.randomUUID();
        const now = new Date();

        // Calculate SLA deadline
        const slaMinutes = this.config.defaultSLA[params.riskLevel];
        const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

        const request: ApprovalRequest = {
            id,
            workflowInstanceId: params.workflowInstanceId,
            taskId: params.taskId,
            taskName: params.taskName,
            requestedAt: now,
            requestedBy: params.requestedBy,
            riskLevel: params.riskLevel,
            status: 'pending',
            context: params.context,
            slaDeadline,
        };

        // Check auto-approval
        if (this.shouldAutoApprove(params.riskLevel)) {
            request.status = 'approved';
            request.decision = {
                approved: true,
                decidedBy: 'system',
                decidedAt: now,
                comment: 'Auto-approved based on risk level configuration',
            };
            this.emit('auto_approved', request);
        } else {
            // Set up escalation timer
            this.setupEscalation(request);
            this.emit('approval_requested', request);
        }

        this.requests.set(id, request);
        return request;
    }

    /**
     * Approve a pending request
     */
    async approve(
        requestId: string,
        userId: string,
        comment?: string,
        modifications?: Record<string, unknown>
    ): Promise<ApprovalRequest> {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }

        if (request.status !== 'pending') {
            throw new Error(`Request is not pending: ${request.status}`);
        }

        request.status = 'approved';
        request.decision = {
            approved: true,
            decidedBy: userId,
            decidedAt: new Date(),
            comment,
            modifications,
        };

        // Clear escalation timer
        this.clearEscalation(requestId);

        this.emit('approval_granted', request);
        return request;
    }

    /**
     * Deny a pending request
     */
    async deny(
        requestId: string,
        userId: string,
        reason: string
    ): Promise<ApprovalRequest> {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }

        if (request.status !== 'pending') {
            throw new Error(`Request is not pending: ${request.status}`);
        }

        request.status = 'denied';
        request.decision = {
            approved: false,
            decidedBy: userId,
            decidedAt: new Date(),
            comment: reason,
        };

        // Clear escalation timer
        this.clearEscalation(requestId);

        this.emit('approval_denied', request);
        return request;
    }

    /**
     * Escalate a request to higher authority
     */
    async escalate(
        requestId: string,
        reason: string
    ): Promise<ApprovalRequest> {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }

        request.status = 'escalated';

        this.emit('approval_escalated', request, { reason });
        return request;
    }

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get a specific approval request
     */
    getRequest(requestId: string): ApprovalRequest | undefined {
        return this.requests.get(requestId);
    }

    /**
     * Get all pending requests
     */
    getPendingRequests(filters?: ApprovalFilters): ApprovalRequest[] {
        let requests = Array.from(this.requests.values()).filter(
            r => r.status === 'pending'
        );

        if (filters?.workflowInstanceId) {
            requests = requests.filter(r => r.workflowInstanceId === filters.workflowInstanceId);
        }

        if (filters?.riskLevel) {
            requests = requests.filter(r => r.riskLevel === filters.riskLevel);
        }

        if (filters?.assignedTo) {
            // In a full implementation, this would filter by assigned reviewer
            requests = requests.filter(r => r.requestedBy === filters.assignedTo);
        }

        // Sort by SLA deadline (most urgent first)
        return requests.sort((a, b) =>
            (a.slaDeadline?.getTime() ?? 0) - (b.slaDeadline?.getTime() ?? 0)
        );
    }

    /**
     * Get approval history for a workflow
     */
    getWorkflowApprovals(workflowInstanceId: string): ApprovalRequest[] {
        return Array.from(this.requests.values()).filter(
            r => r.workflowInstanceId === workflowInstanceId
        );
    }

    /**
     * Get approval statistics
     */
    getStats(): ApprovalStats {
        const all = Array.from(this.requests.values());
        const pending = all.filter(r => r.status === 'pending');
        const approved = all.filter(r => r.status === 'approved');
        const denied = all.filter(r => r.status === 'denied');
        const escalated = all.filter(r => r.status === 'escalated');

        // Calculate average response time
        const completed = [...approved, ...denied];
        let avgResponseTimeMs = 0;
        if (completed.length > 0) {
            const totalTime = completed.reduce((sum, r) => {
                const responseTime = r.decision?.decidedAt
                    ? r.decision.decidedAt.getTime() - r.requestedAt.getTime()
                    : 0;
                return sum + responseTime;
            }, 0);
            avgResponseTimeMs = totalTime / completed.length;
        }

        // Count SLA breaches
        const now = new Date();
        const slaBreaches = pending.filter(r =>
            r.slaDeadline && r.slaDeadline.getTime() < now.getTime()
        ).length;

        return {
            total: all.length,
            pending: pending.length,
            approved: approved.length,
            denied: denied.length,
            escalated: escalated.length,
            approvalRate: completed.length > 0
                ? approved.length / completed.length
                : 0,
            avgResponseTimeMs,
            slaBreaches,
        };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private shouldAutoApprove(riskLevel: 'low' | 'medium' | 'high' | 'critical'): boolean {
        return this.config.autoApproveRiskLevels.includes(riskLevel);
    }

    private setupEscalation(request: ApprovalRequest): void {
        if (!request.slaDeadline) return;

        const timeUntilSLA = request.slaDeadline.getTime() - Date.now();
        if (timeUntilSLA <= 0) return;

        const timer = setTimeout(() => {
            this.escalate(request.id, 'SLA deadline exceeded');
        }, timeUntilSLA);

        this.escalationTimers.set(request.id, timer);
    }

    private clearEscalation(requestId: string): void {
        const timer = this.escalationTimers.get(requestId);
        if (timer) {
            clearTimeout(timer);
            this.escalationTimers.delete(requestId);
        }
    }

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    /**
     * Subscribe to approval events
     */
    on(event: ApprovalEventType, handler: (event: ApprovalEvent) => void): void {
        const handlers = this.eventHandlers.get(event) ?? [];
        handlers.push(handler);
        this.eventHandlers.set(event, handlers);
    }

    /**
     * Unsubscribe from approval events
     */
    off(event: ApprovalEventType, handler: (event: ApprovalEvent) => void): void {
        const handlers = this.eventHandlers.get(event) ?? [];
        const index = handlers.indexOf(handler);
        if (index >= 0) {
            handlers.splice(index, 1);
        }
    }

    private emit(
        type: ApprovalEventType,
        request: ApprovalRequest,
        extra?: Record<string, unknown>
    ): void {
        const event: ApprovalEvent = {
            type,
            request,
            timestamp: new Date(),
            ...extra,
        };

        const handlers = this.eventHandlers.get(type) ?? [];
        for (const handler of handlers) {
            try {
                handler(event);
            } catch (error) {
                console.error(`Error in approval event handler: ${error}`);
            }
        }
    }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface CreateApprovalParams {
    workflowInstanceId: string;
    taskId: string;
    taskName: string;
    requestedBy: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    context: ApprovalContext;
}

export interface ApprovalFilters {
    workflowInstanceId?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;
}

export interface ApprovalStats {
    total: number;
    pending: number;
    approved: number;
    denied: number;
    escalated: number;
    approvalRate: number;
    avgResponseTimeMs: number;
    slaBreaches: number;
}

export type ApprovalEventType =
    | 'approval_requested'
    | 'approval_granted'
    | 'approval_denied'
    | 'approval_escalated'
    | 'auto_approved';

export interface ApprovalEvent {
    type: ApprovalEventType;
    request: ApprovalRequest;
    timestamp: Date;
    [key: string]: unknown;
}

// Export singleton
export const hitlManager = new HITLManager();
