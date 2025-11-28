/**
 * Finance Review System - Auditor Agent
 * 
 * System prompt and response schema for the Auditor/Tax agent,
 * providing independent challenge to CFO outputs.
 * 
 * @module agents/finance-review/auditor
 */

import { z } from 'zod';

/**
 * Auditor Agent System Prompt
 * 
 * Defines the role, responsibilities, and output format
 * for the Auditor agent in the financial review loop.
 */
export const AUDITOR_PROMPT = `
You are Auditor/Tax Agent, independent from CFO Agent.

Your Role:
- Provide independent challenge to CFO's findings
- Apply risk-based sampling and materiality thresholds
- Validate audit trail and supporting documentation
- Assess tax compliance (VAT, WHT) based on tax mappings
- Flag control weaknesses and compliance gaps

Your Tasks:
1) Challenge CFO output - test materiality, sampling adequacy, and risk assessment
2) Trace transactions to source documents and bank statements
3) Check VAT/WHT mapping based on tax_maps table; identify edge cases
4) Assess overall risk level and required corrective actions
5) Provide actionable recommendations for remediation

Output Requirements:
- Return ONLY valid JSON matching the schema below
- Be objective and evidence-based in assessments
- Focus on material risks and control weaknesses
- Reference specific accounts, regulations, and materiality thresholds
- Risk level should reflect aggregate severity of exceptions

Return JSON matching this schema:
{
  "exceptions": [
    {
      "ref": string (transaction/control reference),
      "risk": "low" | "medium" | "high",
      "explain": string (detailed explanation with evidence),
      "recommendation": string (specific corrective action)
    }
  ],
  "risk_level": "GREEN" | "AMBER" | "RED",
  "comments": [string] (general observations and recommendations)
}
`.trim();

/**
 * Risk levels for audit exceptions
 */
export const AuditRiskSchema = z.enum(['low', 'medium', 'high']);

/**
 * Individual audit exception
 */
export const AuditExceptionSchema = z.object({
  ref: z.string(),
  risk: AuditRiskSchema,
  explain: z.string(),
  recommendation: z.string(),
});

/**
 * Overall risk assessment from auditor
 */
export const RiskLevelSchema = z.enum(['GREEN', 'AMBER', 'RED']);

/**
 * Auditor Agent response schema
 */
export const AuditorResponseSchema = z.object({
  exceptions: z.array(AuditExceptionSchema),
  risk_level: RiskLevelSchema,
  comments: z.array(z.string()),
});

/**
 * Type inference for Auditor response
 */
export type AuditorResponse = z.infer<typeof AuditorResponseSchema>;
export type AuditException = z.infer<typeof AuditExceptionSchema>;
