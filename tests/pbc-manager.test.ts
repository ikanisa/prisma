import { describe, expect, it } from 'vitest';
import { matchProcedureId } from '@/utils/pbc';
import type { Database } from '@/integrations/supabase/types';

type PlannedProcedure = Database['public']['Tables']['audit_planned_procedures']['Row'];

const baseProcedure = (id: string, title: string): PlannedProcedure => ({
  id,
  title,
  org_id: 'org-1',
  engagement_id: 'eng-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by_user_id: 'user-1',
  updated_by_user_id: null,
  isa_references: [],
  notes: null,
  objective: null,
  risk_id: null,
});

describe('PBC procedure matching', () => {
  const procedures: PlannedProcedure[] = [
    baseProcedure('proc-1', 'Bank reconciliation testing'),
    baseProcedure('proc-2', 'Revenue contract walkthrough'),
    baseProcedure('proc-3', 'Cash confirmations and rollforward'),
  ];

  it('matches procedures using normalised keyword hints', () => {
    const result = matchProcedureId(procedures, 'Bank Recon');
    expect(result).toBe('proc-1');
  });

  it('falls back to tokenised matching for multi-word hints', () => {
    const result = matchProcedureId(procedures, 'cash confirmation');
    expect(result).toBe('proc-3');
  });

  it('maps synonyms like review to walkthrough', () => {
    const result = matchProcedureId(procedures, 'contract review');
    expect(result).toBe('proc-2');
  });

  it('returns null when no match is found', () => {
    const result = matchProcedureId(procedures, 'inventory count');
    expect(result).toBeNull();
  });
});
