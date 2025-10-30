/**
 * Finance Review System - CFO Agent
 * 
 * System prompt and response schema for the CFO agent,
 * responsible for daily close validation and financial accuracy.
 * 
 * @module agents/finance-review/cfo
 */

import { z } from 'zod';

/**
 * CFO Agent System Prompt
 * 
 * Defines the role, responsibilities, and output format
 * for the CFO agent in the financial review loop.
 */
export const CFO_PROMPT = `
You are CFO Agent, responsible for daily close and financial accuracy.

Context: This is an IKANISA/MoMo gateway operations suite managing SACCO float 
and mobile money settlements. Revenue recognition follows IFRS principles.

Your Tasks:
1) Validate double-entry balance and transaction cut-off
2) Reconcile MoMo gateway and SACCO float accounts; identify unexplained breaks
3) Identify duplicate entries and entries missing supporting evidence
4) Propose draft adjusting journal entries (JEs) with clear rationales
5) Summarize with status: GREEN (no issues), AMBER (minor issues), or RED (critical issues)

Output Requirements:
- Return ONLY valid JSON matching the schema below
- Be concise but specific in explanations
- Reference account codes and transaction IDs when identifying issues
- All amounts must include currency
- Proposed entries must balance (debits = credits)

Return JSON matching this schema:
{
  "summary": string (2-3 sentences),
  "status": "GREEN" | "AMBER" | "RED",
  "issues": [
    {
      "type": "missing_doc" | "duplicate" | "cutoff" | "float_break" | "tax_map_gap" | "other",
      "id": string (transaction or entry ID),
      "explain": string (brief explanation),
      "severity": "low" | "medium" | "high"
    }
  ],
  "proposed_entries": [
    {
      "date": string (YYYY-MM-DD),
      "debit_account": string,
      "credit_account": string,
      "amount": number,
      "currency": string,
      "memo": string (clear rationale)
    }
  ]
}
`.trim();

/**
 * Issue types that can be identified by the CFO agent
 */
export const IssueTypeSchema = z.enum([
  'missing_doc',
  'duplicate',
  'cutoff',
  'float_break',
  'tax_map_gap',
  'other',
]);

/**
 * Severity levels for identified issues
 */
export const SeveritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Individual issue identified by CFO agent
 */
export const CFOIssueSchema = z.object({
  type: IssueTypeSchema,
  id: z.string(),
  explain: z.string(),
  severity: SeveritySchema,
});

/**
 * Proposed adjusting journal entry
 */
export const ProposedEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  debit_account: z.string(),
  credit_account: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  memo: z.string(),
});

/**
 * Overall status from CFO review
 */
export const StatusSchema = z.enum(['GREEN', 'AMBER', 'RED']);

/**
 * CFO Agent response schema
 */
export const CFOResponseSchema = z.object({
  summary: z.string(),
  status: StatusSchema,
  issues: z.array(CFOIssueSchema),
  proposed_entries: z.array(ProposedEntrySchema),
});

/**
 * Type inference for CFO response
 */
export type CFOResponse = z.infer<typeof CFOResponseSchema>;
export type CFOIssue = z.infer<typeof CFOIssueSchema>;
export type ProposedEntry = z.infer<typeof ProposedEntrySchema>;
