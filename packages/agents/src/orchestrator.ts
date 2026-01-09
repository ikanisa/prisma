/**
 * Agent Orchestrator
 * 
 * Routes requests to the appropriate specialist agent based on:
 * - engagement.type (accounting, audit, tax)
 * - User intent analysis
 * - Current engagement phase
 * 
 * Enforces eligibility checks before any agent execution.
 */

import type { EngagementType, Jurisdiction } from '@prisma/db';
import { AccountingAgent } from './agents/accounting.js';
import { AuditAgent } from './agents/audit.js';
import { TaxAgent } from './agents/tax.js';
import { eligibilityCheck } from './tools/eligibility-check.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentContext {
    engagementId: string;
    engagementType: EngagementType;
    jurisdiction: Jurisdiction;
    clientId: string;
    firmId: string;
    userId: string;
    phase: string;
    metadata?: Record<string, unknown>;
}

export interface AgentRequest {
    message: string;
    context: AgentContext;
    tools?: string[];
}

export interface AgentResponse {
    runId: string;
    traceId: string;
    status: 'completed' | 'pending' | 'failed';
    agentType: EngagementType;
    response: {
        type: 'text' | 'workpaper' | 'task_list' | 'document_request' | 'widget';
        content: unknown;
    };
    events: AgentEvent[];
    tokensUsed?: {
        input: number;
        output: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface AgentEvent {
    eventType: string;
    timestamp: string;
    payload: unknown;
    durationMs?: number;
}

// ============================================================================
// AGENT INTERFACE
// ============================================================================

export interface Agent {
    name: string;
    type: EngagementType;
    systemPrompt: string;
    run(request: AgentRequest): Promise<AgentResponse>;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class Orchestrator {
    private agents: Map<EngagementType, Agent> = new Map();

    constructor() {
        // Register all agents
        this.agents.set('accounting', new AccountingAgent());
        this.agents.set('audit', new AuditAgent());
        this.agents.set('tax', new TaxAgent());
    }

    /**
     * Route request to appropriate agent
     */
    async run(request: AgentRequest): Promise<AgentResponse> {
        const { context, message } = request;
        const runId = crypto.randomUUID();
        const traceId = crypto.randomUUID();
        const startTime = Date.now();
        const events: AgentEvent[] = [];

        // Log start
        events.push({
            eventType: 'orchestrator_start',
            timestamp: new Date().toISOString(),
            payload: { engagementId: context.engagementId, agentType: context.engagementType },
        });

        try {
            // Step 1: Eligibility check
            const eligibility = await eligibilityCheck(context.clientId);

            events.push({
                eventType: 'eligibility_check',
                timestamp: new Date().toISOString(),
                payload: eligibility,
                durationMs: Date.now() - startTime,
            });

            if (!eligibility.eligible) {
                return {
                    runId,
                    traceId,
                    status: 'failed',
                    agentType: context.engagementType,
                    response: {
                        type: 'text',
                        content: `Cannot proceed: ${eligibility.reason}`,
                    },
                    events,
                    error: {
                        code: 'INELIGIBLE_CLIENT',
                        message: eligibility.reason || 'Client is not eligible',
                    },
                };
            }

            // Step 2: Route to agent
            const agent = this.agents.get(context.engagementType);

            if (!agent) {
                throw new Error(`No agent registered for type: ${context.engagementType}`);
            }

            events.push({
                eventType: 'agent_selected',
                timestamp: new Date().toISOString(),
                payload: { agentName: agent.name, agentType: agent.type },
            });

            // Step 3: Execute agent
            const response = await agent.run(request);

            // Merge events
            events.push(...response.events);

            events.push({
                eventType: 'orchestrator_complete',
                timestamp: new Date().toISOString(),
                payload: { status: response.status },
                durationMs: Date.now() - startTime,
            });

            return {
                ...response,
                runId,
                traceId,
                events,
            };

        } catch (error) {
            events.push({
                eventType: 'orchestrator_error',
                timestamp: new Date().toISOString(),
                payload: { error: String(error) },
                durationMs: Date.now() - startTime,
            });

            return {
                runId,
                traceId,
                status: 'failed',
                agentType: context.engagementType,
                response: {
                    type: 'text',
                    content: 'An error occurred during agent execution.',
                },
                events,
                error: {
                    code: 'AGENT_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }

    /**
     * Analyze user intent to determine best agent
     * (For cases where engagement type is ambiguous)
     */
    analyzeIntent(message: string): EngagementType {
        const lowerMessage = message.toLowerCase();

        // Audit keywords
        if (
            lowerMessage.includes('audit') ||
            lowerMessage.includes('isa ') ||
            lowerMessage.includes('materiality') ||
            lowerMessage.includes('sampling') ||
            lowerMessage.includes('control test') ||
            lowerMessage.includes('substantive')
        ) {
            return 'audit';
        }

        // Tax keywords
        if (
            lowerMessage.includes('tax') ||
            lowerMessage.includes('vat') ||
            lowerMessage.includes('gst') ||
            lowerMessage.includes('paye') ||
            lowerMessage.includes('cit') ||
            lowerMessage.includes('withholding') ||
            lowerMessage.includes('return')
        ) {
            return 'tax';
        }

        // Default to accounting
        return 'accounting';
    }

    /**
     * Get available tools for an agent type
     */
    getAvailableTools(agentType: EngagementType): string[] {
        const commonTools = [
            'get_engagement_context',
            'list_documents',
            'read_extraction',
            'create_or_update_workpaper',
            'create_tasks',
            'request_documents',
            'eligibility_check',
        ];

        const agentSpecificTools: Record<EngagementType, string[]> = {
            accounting: [
                'compute_trial_balance',
                'compute_journal_entry',
                'compute_bank_reconciliation',
            ],
            audit: [
                'compute_materiality',
                'compute_sampling_plan',
                'generate_confirmation_letter',
                'evaluate_misstatements',
            ],
            tax: [
                'compute_vat_return',
                'compute_income_tax',
                'compute_withholding_tax',
                'check_treaty_rate',
            ],
        };

        return [...commonTools, ...(agentSpecificTools[agentType] || [])];
    }
}

// Export singleton instance
export const orchestrator = new Orchestrator();
