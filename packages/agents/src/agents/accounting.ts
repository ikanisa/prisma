/**
 * Accounting Agent
 * 
 * Specialist agent for accounting engagements.
 * Handles bookkeeping, financial statements, reconciliations.
 */

import type { AgentRequest } from '../orchestrator.js';
import { BaseAgent } from './base.js';

export class AccountingAgent extends BaseAgent {
    name = 'accounting-agent';
    type = 'accounting' as const;

    systemPrompt = `You are an expert Accounting Agent for Prisma Core.

Your role is to assist with accounting engagements for SME clients in Rwanda (RW), Malta (MT), and Canada (CA).

JURISDICTION-SPECIFIC KNOWLEDGE:
- Rwanda (RW): RRA compliance, EBM invoicing, 18% VAT, IFRS for SMEs
- Malta (MT): GAPSME or full IFRS, 18% VAT, MBR filing requirements
- Canada (CA): ASPE or IFRS, GST/HST varying by province, CPA Canada standards

CAPABILITIES:
1. Transaction processing and categorization
2. Bank reconciliation
3. Trial balance preparation
4. Financial statement preparation (IFRS for SMEs / GAPSME / ASPE)
5. VAT/GST reconciliation
6. Period-end close procedures

TOOLS AVAILABLE:
- get_engagement_context: Get current engagement details
- list_documents: List uploaded documents
- read_extraction: Read extracted data from documents
- create_or_update_workpaper: Create or update workpapers
- create_tasks: Create follow-up tasks
- request_documents: Request documents from client
- compute_trial_balance: Generate trial balance from ledger
- compute_bank_reconciliation: Perform bank reconciliation

RESPONSE GUIDELINES:
- Always cite source documents when making assertions
- Create workpapers for significant calculations
- Flag unusual items for manager review
- Use appropriate framework (IFRS/GAPSME/ASPE) based on jurisdiction

PROHIBITED:
- Do NOT process any financial institution clients
- Do NOT make up numbers - always cite sources
- Do NOT skip review gates`;

    protected async execute(
        request: AgentRequest,
        context: Record<string, unknown>
    ): Promise<{ type: 'text' | 'workpaper' | 'task_list' | 'document_request' | 'widget'; content: unknown }> {
        const { message } = request;
        const lowerMessage = message.toLowerCase();

        // Determine response type based on request
        if (lowerMessage.includes('reconcil')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'bank_reconciliation',
                    title: 'Bank Reconciliation',
                    data: {
                        status: 'draft',
                        note: 'Bank reconciliation workpaper initiated. Please upload bank statements.',
                    },
                },
            };
        }

        if (lowerMessage.includes('trial balance')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'trial_balance',
                    title: 'Trial Balance',
                    data: {
                        status: 'draft',
                        note: 'Trial balance workpaper initiated. Requires ledger data.',
                    },
                },
            };
        }

        if (lowerMessage.includes('document') || lowerMessage.includes('request')) {
            return {
                type: 'document_request',
                content: {
                    requests: [
                        { docType: 'bank_statement', description: 'Bank statements for all accounts' },
                        { docType: 'invoice', description: 'Sales and purchase invoices' },
                    ],
                },
            };
        }

        if (lowerMessage.includes('task') || lowerMessage.includes('plan')) {
            return {
                type: 'task_list',
                content: {
                    tasks: [
                        { title: 'Review prior period financials', phase: 'planning' },
                        { title: 'Process bank transactions', phase: 'processing' },
                        { title: 'Reconcile bank accounts', phase: 'close' },
                    ],
                },
            };
        }

        // Default text response
        return {
            type: 'text',
            content: `I'm the Accounting Agent for ${context.jurisdiction}. I can help with:
- Transaction processing
- Bank reconciliations
- Trial balance preparation
- Financial statement drafting
- VAT/GST reconciliation

What would you like me to help with for this engagement?`,
        };
    }
}
