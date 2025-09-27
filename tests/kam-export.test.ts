import { describe, expect, it } from 'vitest';
import { buildKamMarkdown, buildKamJson } from '@/utils/kam-export';
import type { KamDraft } from '@/lib/kam-service';

const baseDraft: KamDraft = {
  id: 'draft-1',
  org_id: 'org-1',
  engagement_id: 'eng-1',
  candidate_id: 'cand-1',
  heading: 'Revenue recognition',
  why_kam: 'Significant judgements over bundled contracts.',
  how_addressed: 'Performed walkthroughs and substantive analytics.',
  procedures_refs: [
    {
      procedureId: 'proc-1',
      isaRefs: ['ISA 315', 'ISA 330'],
    },
  ],
  evidence_refs: [
    {
      evidenceId: 'ev-1',
      note: 'WP-05 testing summary',
    },
  ],
  results_summary: 'No material misstatements identified.',
  status: 'DRAFT',
  submitted_at: null,
  approved_at: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('KAM export helpers', () => {
  it('renders markdown scaffold with procedure and evidence lists', () => {
    const markdown = buildKamMarkdown(baseDraft);
    expect(markdown).toContain('### Revenue recognition');
    expect(markdown).toContain('**How we addressed it**');
    expect(markdown).toContain('Procedure proc-1');
    expect(markdown).toContain('Evidence ev-1');
  });

  it('renders placeholder text when no references are linked', () => {
    const markdown = buildKamMarkdown({ ...baseDraft, procedures_refs: [], evidence_refs: [] });
    expect(markdown).toContain('(Pending selection)');
  });

  it('serialises JSON export payload', () => {
    const json = buildKamJson(baseDraft);
    const parsed = JSON.parse(json);
    expect(parsed.heading).toBe('Revenue recognition');
    expect(parsed.procedures[0].procedureId).toBe('proc-1');
  });
});
