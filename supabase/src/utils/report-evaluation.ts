export type AuditOpinion = 'UNMODIFIED' | 'QUALIFIED' | 'ADVERSE' | 'DISCLAIMER';

export interface OpinionInput {
  classification: string | null;
  corrected: boolean | null;
}

export interface OpinionEvaluation {
  recommendedOpinion: AuditOpinion;
  reasons: string[];
  requiredSections: string[];
}

export function evaluateOpinion(
  inputs: {
    misstatements: OpinionInput[];
    goingConcernMU: boolean;
    scopeLimitations: boolean;
  },
): OpinionEvaluation {
  const reasons: string[] = [];
  const requiredSections: string[] = ['BASIS_FOR_OPINION'];

  const uncorrected = inputs.misstatements.filter((m) => !m.corrected);
  const hasMaterial = uncorrected.some((m) => (m.classification ?? '').toLowerCase().includes('material'));
  const hasPervasive = uncorrected.some((m) => (m.classification ?? '').toLowerCase().includes('pervasive'));
  const scopeLimitation = inputs.scopeLimitations;

  if (inputs.goingConcernMU) {
    reasons.push('Material uncertainty related to going concern disclosed.');
    requiredSections.push('GC_MATERIAL_UNCERTAINTY');
  }

  if (scopeLimitation && hasPervasive) {
    reasons.push('Inability to obtain sufficient appropriate audit evidence with pervasive effect.');
    return { recommendedOpinion: 'DISCLAIMER', reasons, requiredSections };
  }

  if (scopeLimitation) {
    reasons.push('Scope limitation leading to material uncertainty.');
    return { recommendedOpinion: 'QUALIFIED', reasons, requiredSections };
  }

  if (hasPervasive) {
    reasons.push('Material and pervasive misstatements identified.');
    return { recommendedOpinion: 'ADVERSE', reasons, requiredSections };
  }

  if (hasMaterial) {
    reasons.push('Material misstatements identified (not pervasive).');
    return { recommendedOpinion: 'QUALIFIED', reasons, requiredSections };
  }

  reasons.push('No material misstatements identified; sufficient evidence obtained.');
  return { recommendedOpinion: 'UNMODIFIED', reasons, requiredSections };
}
