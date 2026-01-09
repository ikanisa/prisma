/**
 * Base Agent Class
 * 
 * Common functionality for all specialist agents.
 */

import type { EngagementType } from '@prisma/db';
import type { Agent, AgentRequest, AgentResponse, AgentEvent } from '../orchestrator.js';

export abstract class BaseAgent implements Agent {
    abstract name: string;
    abstract type: EngagementType;
    abstract systemPrompt: string;

    /**
     * Execute the agent with the given request
     */
    async run(request: AgentRequest): Promise<AgentResponse> {
        const events: AgentEvent[] = [];
        const startTime = Date.now();

        events.push({
            eventType: 'agent_start',
            timestamp: new Date().toISOString(),
            payload: { agentName: this.name, message: request.message },
        });

        try {
            // Step 1: Prepare context
            const contextSummary = await this.prepareContext(request);

            events.push({
                eventType: 'context_prepared',
                timestamp: new Date().toISOString(),
                payload: { contextKeys: Object.keys(contextSummary) },
                durationMs: Date.now() - startTime,
            });

            // Step 2: Execute agent logic
            const result = await this.execute(request, contextSummary);

            events.push({
                eventType: 'agent_complete',
                timestamp: new Date().toISOString(),
                payload: { responseType: result.type },
                durationMs: Date.now() - startTime,
            });

            return {
                runId: '', // Set by orchestrator
                traceId: '', // Set by orchestrator
                status: 'completed',
                agentType: this.type,
                response: result,
                events,
            };

        } catch (error) {
            events.push({
                eventType: 'agent_error',
                timestamp: new Date().toISOString(),
                payload: { error: String(error) },
                durationMs: Date.now() - startTime,
            });

            return {
                runId: '',
                traceId: '',
                status: 'failed',
                agentType: this.type,
                response: {
                    type: 'text',
                    content: `Error in ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
                },
                events,
                error: {
                    code: 'AGENT_EXECUTION_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }

    /**
     * Prepare context for the agent (subclass can override)
     */
    protected async prepareContext(request: AgentRequest): Promise<Record<string, unknown>> {
        return {
            engagementId: request.context.engagementId,
            engagementType: request.context.engagementType,
            jurisdiction: request.context.jurisdiction,
            phase: request.context.phase,
            ...request.context.metadata,
        };
    }

    /**
     * Execute agent-specific logic (must be implemented by subclass)
     */
    protected abstract execute(
        request: AgentRequest,
        context: Record<string, unknown>
    ): Promise<{ type: 'text' | 'workpaper' | 'task_list' | 'document_request' | 'widget'; content: unknown }>;
}
