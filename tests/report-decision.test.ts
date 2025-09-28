import { describe, expect, it } from 'vitest';
import { evaluateOpinion } from '@/utils/report-evaluation';

describe('evaluateOpinion', () => {
  it('defaults to unmodified when no issues', () => {
    const result = evaluateOpinion({ misstatements: [], goingConcernMU: false, scopeLimitations: false });
    expect(result.recommendedOpinion).toBe('UNMODIFIED');
    expect(result.reasons[0]).toContain('No material misstatements');
  });

  it('suggests qualified for material misstatement', () => {
    const result = evaluateOpinion({
      misstatements: [{ classification: 'Material misstatement', corrected: false }],
      goingConcernMU: false,
      scopeLimitations: false,
    });
    expect(result.recommendedOpinion).toBe('QUALIFIED');
  });

  it('suggests adverse for pervasive misstatement', () => {
    const result = evaluateOpinion({
      misstatements: [{ classification: 'Material and pervasive misstatement', corrected: false }],
      goingConcernMU: false,
      scopeLimitations: false,
    });
    expect(result.recommendedOpinion).toBe('ADVERSE');
  });

  it('suggests disclaimer when scope limitation is pervasive', () => {
    const result = evaluateOpinion({
      misstatements: [{ classification: 'Pervasive potential', corrected: false }],
      goingConcernMU: false,
      scopeLimitations: true,
    });
    expect(result.recommendedOpinion).toBe('DISCLAIMER');
  });

  it('adds GC section when material uncertainty present', () => {
    const result = evaluateOpinion({ misstatements: [], goingConcernMU: true, scopeLimitations: false });
    expect(result.requiredSections).toContain('GC_MATERIAL_UNCERTAINTY');
  });
});
