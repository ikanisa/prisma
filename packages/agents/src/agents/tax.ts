/**
 * Tax Agent
 * 
 * Specialist agent for tax engagements.
 * Handles VAT, income tax, withholding tax, and compliance.
 */

import type { AgentRequest } from '../orchestrator.js';
import { BaseAgent } from './base.js';

export class TaxAgent extends BaseAgent {
    name = 'tax-agent';
    type = 'tax' as const;

    systemPrompt = `You are an expert Tax Agent for Prisma Core.

Your role is to assist with tax engagements for SME clients in Rwanda (RW), Malta (MT), and Canada (CA).

JURISDICTION-SPECIFIC KNOWLEDGE:

RWANDA (RW):
- Tax Authority: RRA (Rwanda Revenue Authority)
- VAT: 18% standard rate
- Corporate Income Tax: 30% (reduced rates for SMEs)
- PAYE: Progressive rates
- EBM: Electronic Billing Machines required
- Key forms: VAT declaration, PAYE declaration, CIT return

MALTA (MT):
- Tax Authority: CFR (Commissioner for Revenue)
- VAT: 18% standard rate (reduced rates exist)
- Corporate Income Tax: 35% with imputation system
- Shareholder refunds: 6/7ths or 5/7ths
- NID: Notional Interest Deduction available
- Key forms: TA24 (VAT), Company tax return

CANADA (CA):
- Tax Authority: CRA (Canada Revenue Agency)
- GST: 5% federal (HST varies by province)
- Corporate Income Tax: Federal + Provincial
- T2 corporate return
- SR&ED credits available
- Key forms: T2, GST/HST return, T4 summary

CAPABILITIES:
1. VAT/GST return preparation
2. Corporate income tax computation
3. Withholding tax calculation
4. PAYE/payroll tax reconciliation
5. Tax treaty rate determination
6. Compliance calendar management
7. Tax provision calculation

TOOLS AVAILABLE:
- get_engagement_context: Get current engagement details
- list_documents: List uploaded documents
- read_extraction: Read extracted data from documents
- create_or_update_workpaper: Create or update workpapers
- create_tasks: Create follow-up tasks
- request_documents: Request documents from client
- compute_vat_return: Calculate VAT/GST return
- compute_income_tax: Calculate corporate income tax
- compute_withholding_tax: Calculate WHT on payments
- check_treaty_rate: Look up DTA withholding rates

RESPONSE GUIDELINES:
- Always cite relevant tax legislation
- Document tax positions clearly
- Flag aggressive positions for partner review
- Consider transfer pricing implications

PROHIBITED:
- Do NOT process any financial institution clients
- Do NOT advise on tax evasion
- Do NOT file returns without partner approval`;

    protected async execute(
        request: AgentRequest,
        context: Record<string, unknown>
    ): Promise<{ type: 'text' | 'workpaper' | 'task_list' | 'document_request' | 'widget'; content: unknown }> {
        const { message } = request;
        const lowerMessage = message.toLowerCase();
        const jurisdiction = context.jurisdiction as string;

        // VAT/GST return
        if (lowerMessage.includes('vat') || lowerMessage.includes('gst') || lowerMessage.includes('hst')) {
            const vatRate = jurisdiction === 'CA' ? '5% GST' : '18% VAT';
            return {
                type: 'workpaper',
                content: {
                    wpType: 'vat_computation',
                    title: jurisdiction === 'CA' ? 'GST/HST Return Computation' : 'VAT Return Computation',
                    data: {
                        jurisdiction,
                        rate: vatRate,
                        status: 'draft',
                        sections: [
                            { name: 'Output VAT/GST', description: 'Tax collected on sales' },
                            { name: 'Input VAT/GST', description: 'Tax paid on purchases' },
                            { name: 'Net Payable/Refundable', description: 'Output minus Input' },
                        ],
                    },
                },
            };
        }

        // Corporate income tax
        if (lowerMessage.includes('corporate') || lowerMessage.includes('income tax') || lowerMessage.includes('cit')) {
            const citInfo: Record<string, { rate: string; notes: string }> = {
                RW: { rate: '30%', notes: 'Reduced rates for qualifying SMEs' },
                MT: { rate: '35%', notes: 'Full imputation system, 6/7ths refund available' },
                CA: { rate: 'Federal + Provincial', notes: 'Small business deduction may apply' },
            };

            return {
                type: 'workpaper',
                content: {
                    wpType: 'cit_computation',
                    title: 'Corporate Income Tax Computation',
                    data: {
                        jurisdiction,
                        ...citInfo[jurisdiction],
                        status: 'draft',
                        sections: [
                            { name: 'Accounting Profit', description: 'Per financial statements' },
                            { name: 'Add-backs', description: 'Non-deductible expenses' },
                            { name: 'Deductions', description: 'Tax-specific deductions' },
                            { name: 'Taxable Income', description: 'Tax base' },
                            { name: 'Tax Liability', description: 'Computed tax' },
                        ],
                    },
                },
            };
        }

        // Withholding tax
        if (lowerMessage.includes('withholding') || lowerMessage.includes('wht')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'wht_reconciliation',
                    title: 'Withholding Tax Reconciliation',
                    data: {
                        jurisdiction,
                        status: 'draft',
                        paymentTypes: [
                            { type: 'Dividends', domesticRate: 'Varies', treatyNote: 'Check DTA' },
                            { type: 'Interest', domesticRate: 'Varies', treatyNote: 'Check DTA' },
                            { type: 'Royalties', domesticRate: 'Varies', treatyNote: 'Check DTA' },
                            { type: 'Services', domesticRate: 'Varies', treatyNote: 'Check DTA' },
                        ],
                    },
                },
            };
        }

        // PAYE / Payroll
        if (lowerMessage.includes('paye') || lowerMessage.includes('payroll')) {
            return {
                type: 'workpaper',
                content: {
                    wpType: 'payroll_reconciliation',
                    title: 'PAYE/Payroll Tax Reconciliation',
                    data: {
                        jurisdiction,
                        status: 'draft',
                        note: 'Reconcile employer declarations with payroll records.',
                    },
                },
            };
        }

        if (lowerMessage.includes('document') || lowerMessage.includes('request')) {
            return {
                type: 'document_request',
                content: {
                    requests: [
                        { docType: 'trial_balance', description: 'Trial balance for tax period' },
                        { docType: 'financial_statement', description: 'Year-end financial statements' },
                        { docType: 'payroll', description: 'Payroll records and declarations' },
                    ],
                },
            };
        }

        if (lowerMessage.includes('task') || lowerMessage.includes('plan')) {
            return {
                type: 'task_list',
                content: {
                    tasks: [
                        { title: 'Gather accounting records', phase: 'data_collection' },
                        { title: 'VAT/GST return computation', phase: 'computation' },
                        { title: 'Corporate income tax computation', phase: 'computation' },
                        { title: 'Manager review', phase: 'filing' },
                        { title: 'Partner approval and filing', phase: 'filing' },
                    ],
                },
            };
        }

        // Default text response
        return {
            type: 'text',
            content: `I'm the Tax Agent for ${jurisdiction}. I can help with:
- VAT/GST return preparation
- Corporate income tax computation
- Withholding tax calculations
- PAYE/payroll reconciliation
- Compliance deadlines

What tax matter would you like me to assist with?`,
        };
    }
}
