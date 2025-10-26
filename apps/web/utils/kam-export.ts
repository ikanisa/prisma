import type { KamDraft } from '@/lib/kam-service';

export function buildKamMarkdown(draft: KamDraft | undefined) {
  if (!draft) return '';
  const proceduresLines = (draft.procedures_refs ?? []).map((ref: any) => {
    const refs = Array.isArray(ref.isaRefs) ? ref.isaRefs.join(', ') : '';
    return `- Procedure ${ref.procedureId}${refs ? ` (ISA: ${refs})` : ''}`;
  });
  const evidenceLines = (draft.evidence_refs ?? []).map((ref: any) => {
    const parts = [] as string[];
    if (ref.evidenceId) parts.push(`Evidence ${ref.evidenceId}`);
    if (ref.documentId) parts.push(`Document ${ref.documentId}`);
    if (ref.note) parts.push(ref.note);
    return `- ${parts.join(' — ')}`;
  });

  return [
    `### ${draft.heading}`,
    '',
    '**Why it was a KAM**',
    draft.why_kam ?? '',
    '',
    '**How we addressed it**',
    draft.how_addressed ?? '',
    '',
    '**Results**',
    draft.results_summary ?? '',
    '',
    '**Procedures**',
    proceduresLines.join('\n') || '- (Pending selection)',
    '',
    '**Evidence**',
    evidenceLines.join('\n') || '- (Pending selection)',
    '',
  ].join('\n');
}

export function buildKamJson(draft: KamDraft | undefined) {
  if (!draft) return '';
  const payload = {
    heading: draft.heading,
    whyKAM: draft.why_kam,
    howAddressed: draft.how_addressed,
    resultsSummary: draft.results_summary,
    procedures: draft.procedures_refs,
    evidence: draft.evidence_refs,
    status: draft.status,
    submittedAt: draft.submitted_at,
  };
  return JSON.stringify(payload, null, 2);
}
