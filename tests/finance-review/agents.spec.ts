/**
 * Finance Review Tests - Agent Prompts
 * 
 * Tests for agent prompt validation and schema enforcement
 */

import { describe, it, expect } from 'vitest';
import { CFO_PROMPT, CFOResponseSchema } from '../../src/agents/finance-review/cfo';
import { AUDITOR_PROMPT, AuditorResponseSchema } from '../../src/agents/finance-review/auditor';

describe('Finance Review Agents', () => {
  describe('CFO Agent', () => {
    it('should have required prompt content', () => {
      expect(CFO_PROMPT).toContain('CFO Agent');
      expect(CFO_PROMPT).toContain('double-entry');
      expect(CFO_PROMPT).toContain('proposed_entries');
      expect(CFO_PROMPT).toContain('status');
    });

    it('should validate correct CFO response', () => {
      const validResponse = {
        summary: 'All entries balanced, no issues found.',
        status: 'GREEN',
        issues: [],
        proposed_entries: [],
      };

      const result = CFOResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate CFO response with issues', () => {
      const responseWithIssues = {
        summary: 'Found missing documentation for 3 transactions.',
        status: 'AMBER',
        issues: [
          {
            type: 'missing_doc',
            id: 'txn-123',
            explain: 'Invoice not attached',
            severity: 'medium',
          },
        ],
        proposed_entries: [
          {
            date: '2024-01-15',
            debit_account: 'Adjustments',
            credit_account: 'Suspense',
            amount: 100.50,
            currency: 'KES',
            memo: 'Adjust for timing difference',
          },
        ],
      };

      const result = CFOResponseSchema.safeParse(responseWithIssues);
      expect(result.success).toBe(true);
    });

    it('should reject invalid CFO response', () => {
      const invalidResponse = {
        summary: 'Test',
        status: 'INVALID_STATUS', // Invalid enum value
        issues: [],
        proposed_entries: [],
      };

      const result = CFOResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject proposed entry with invalid date', () => {
      const invalidResponse = {
        summary: 'Test',
        status: 'GREEN',
        issues: [],
        proposed_entries: [
          {
            date: 'invalid-date',
            debit_account: 'Test',
            credit_account: 'Test',
            amount: 100,
            currency: 'KES',
            memo: 'Test',
          },
        ],
      };

      const result = CFOResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Auditor Agent', () => {
    it('should have required prompt content', () => {
      expect(AUDITOR_PROMPT).toContain('Auditor');
      expect(AUDITOR_PROMPT).toContain('independent');
      expect(AUDITOR_PROMPT).toContain('risk_level');
      expect(AUDITOR_PROMPT).toContain('exceptions');
    });

    it('should validate correct Auditor response', () => {
      const validResponse = {
        exceptions: [],
        risk_level: 'GREEN',
        comments: ['No material exceptions found.'],
      };

      const result = AuditorResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate Auditor response with exceptions', () => {
      const responseWithExceptions = {
        exceptions: [
          {
            ref: 'control-float-001',
            risk: 'high',
            explain: 'Float reconciliation difference exceeds materiality threshold',
            recommendation: 'Investigate settlement delays and post adjusting entry',
          },
        ],
        risk_level: 'RED',
        comments: [
          'Material control weakness identified',
          'Recommend enhanced reconciliation procedures',
        ],
      };

      const result = AuditorResponseSchema.safeParse(responseWithExceptions);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Auditor response', () => {
      const invalidResponse = {
        exceptions: [],
        risk_level: 'INVALID_LEVEL', // Invalid enum value
        comments: [],
      };

      const result = AuditorResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should enforce exception schema', () => {
      const invalidResponse = {
        exceptions: [
          {
            ref: 'test',
            risk: 'invalid_risk', // Invalid enum value
            explain: 'Test',
            recommendation: 'Test',
          },
        ],
        risk_level: 'GREEN',
        comments: [],
      };

      const result = AuditorResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Prompt Consistency', () => {
    it('CFO and Auditor should use consistent status/risk enums', () => {
      // Both should support GREEN, AMBER, RED
      const cfoResponse = { summary: 'Test', status: 'AMBER', issues: [], proposed_entries: [] };
      const auditorResponse = { exceptions: [], risk_level: 'AMBER', comments: [] };

      expect(CFOResponseSchema.safeParse(cfoResponse).success).toBe(true);
      expect(AuditorResponseSchema.safeParse(auditorResponse).success).toBe(true);
    });
  });
});
