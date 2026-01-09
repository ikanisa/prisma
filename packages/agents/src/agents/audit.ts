/**
 * Audit Agent
 * 
 * Specialist agent for audit engagements.
 * Handles risk assessment, materiality, sampling, substantive testing.
 */

import type { AgentRequest } from '../orchestrator.js';
import { BaseAgent } from './base.js';

export class AuditAgent extends BaseAgent {
    name = 'audit-agent';
    type = 'audit' as const;

    systemPrompt = `You are an expert Audit Agent for Prisma Core.

Your role is to assist with audit engagements for SME clients in Rwanda (RW), Malta (MT), and Canada (CA).

JURISDICTION-SPECIFIC KNOWLEDGE:
- Rwanda (RW): ISA standards, ICPAR requirements
- Malta (MT): ISA standards, MIA requirements, GAPSME thresholds, MBR filing
- Canada (CA): CAS (Canadian Auditing Standards), CPA Canada requirements

AUDIT FRAMEWORK:
- Planning Phase: Risk assessment (ISA 315), Materiality, Audit strategy
- Fieldwork Phase: Tests of controls, Substantive procedures
- Completion Phase: Evaluate misstatements (ISA 450), Form opinion (ISA 700)

CAPABILITIES:
1. Risk assessment and fraud considerations (ISA 240)
2. Materiality calculation (overall, performance, trivial)
3. Sampling plan design (ISA 530)
4. Control testing procedures
5. Substantive analytical procedures
6. External confirmation drafting
7. Misstatement evaluation
8. Audit report drafting

TOOLS AVAILABLE:
- get_engagement_context: Get current engagement details
- list_documents: List uploaded documents
- read_extraction: Read extracted data from documents
- create_or_update_workpaper: Create or update workpapers
- create_tasks: Create follow-up tasks
- request_documents: Request documents/confirmations
- compute_materiality: Calculate materiality based on benchmark
- compute_sampling_plan: Design statistical sampling plan
- generate_confirmation_letter: Draft external confirmation
- evaluate_misstatements: Summarize and evaluate misstatements

RESPONSE GUIDELINES:
- Always reference ISA/CAS standards
- Document rationale for all professional judgments
- Flag items for partner attention
- Maintain skepticism and independence

PROHIBITED:
- Do NOT process any financial institution clients
- Do NOT issue opinion without partner approval
- Do NOT skip required ISA procedures`;

    protected async execute(
        request: AgentRequest,
        context: Record<string, unknown>
    ): Promise<{ type: 'text' | 'workpaper' | 'task_list' | 'document_request' | 'widget'; content: unknown }> {
        const { message } = request;
        const lowerMessage = message.toLowerCase();

        // Materiality calculation
        if (lowerMessage.includes('materiality')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'materiality_memo',
                    title: 'Materiality Calculation',
                    data: {
                        status: 'draft',
                        benchmarks: [
                            { name: 'Total Revenue', rate: '0.5% - 2%' },
                            { name: 'Total Assets', rate: '0.5% - 2%' },
                            { name: 'Profit Before Tax', rate: '5% - 10%' },
                        ],
                        note: 'Select appropriate benchmark based on entity stability and user focus.',
                    },
                },
            };
        }

        // Risk assessment
        if (lowerMessage.includes('risk')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'risk_assessment',
                    title: 'Risk Assessment (ISA 315)',
                    data: {
                        status: 'draft',
                        riskCategories: [
                            { area: 'Revenue Recognition', inherentRisk: 'High', controlRisk: 'TBD' },
                            { area: 'Management Override', inherentRisk: 'High', controlRisk: 'High' },
                            { area: 'Related Parties', inherentRisk: 'Medium', controlRisk: 'TBD' },
                        ],
                        note: 'Complete after understanding entity and environment.',
                    },
                },
            };
        }

        // Sampling
        if (lowerMessage.includes('sampling') || lowerMessage.includes('sample')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'sampling_plan',
                    title: 'Sampling Plan (ISA 530)',
                    data: {
                        status: 'draft',
                        method: 'Statistical sampling',
                        note: 'Use compute_sampling_plan tool with population size and tolerable misstatement.',
                    },
                },
            };
        }

        // Confirmation
        if (lowerMessage.includes('confirmation') || lowerMessage.includes('confirm')) {
            return {
                type: 'document_request',
                content: {
                    requests: [
                        { docType: 'bank_confirmation', description: 'External bank confirmation letter' },
                        { docType: 'ar_confirmation', description: 'Accounts receivable confirmations' },
                        { docType: 'legal_confirmation', description: 'Legal counsel confirmation' },
                    ],
                },
            };
        }

        if (lowerMessage.includes('task') || lowerMessage.includes('plan')) {
            return {
                type: 'task_list',
                content: {
                    tasks: [
                        { title: 'Engagement acceptance review', phase: 'planning' },
                        { title: 'Risk assessment (ISA 315)', phase: 'planning' },
                        { title: 'Materiality calculation', phase: 'planning' },
                        { title: 'Tests of controls', phase: 'fieldwork' },
                        { title: 'Substantive procedures', phase: 'fieldwork' },
                        { title: 'Evaluate misstatements', phase: 'completion' },
                    ],
                },
            };
        }

        // Default text response
        return {
            type: 'text',
            content: `I'm the Audit Agent following ISA standards for ${context.jurisdiction}. I can help with:
- Risk assessment (ISA 315)
- Materiality calculation
- Sampling design (ISA 530)
- Control and substantive testing
- External confirmations
- Misstatement evaluation

Current phase: ${context.phase || 'planning'}

What would you like me to help with for this audit engagement?`,
        };
    }
}
