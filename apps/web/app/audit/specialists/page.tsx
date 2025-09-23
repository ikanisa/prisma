'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

type SpecialistStatus = 'draft' | 'in_review' | 'final';
type TargetType = 'expert' | 'internal';

interface EvidenceRecord {
  id: string;
  description: string | null;
  document_id: string | null;
  evidence_url: string | null;
  notes: string | null;
  standard_refs: string[];
  uploaded_at: string | null;
  uploaded_by: string | null;
}

interface ExpertEvaluationForm {
  id: string | null;
  area: string;
  specialistName: string;
  specialistFirm: string;
  scopeOfWork: string;
  competenceAssessment: string;
  objectivityAssessment: string;
  workPerformed: string;
  resultsSummary: string;
  conclusion: string;
  status: SpecialistStatus;
  standardRefs: string[];
}

interface InternalEvaluationForm {
  id: string | null;
  relianceArea: string;
  internalAuditLead: string;
  scopeOfReliance: string;
  competenceEvaluation: string;
  objectivityEvaluation: string;
  workEvaluation: string;
  riskAssessment: string;
  conclusion: string;
  status: SpecialistStatus;
  standardRefs: string[];
}

interface EvaluationResponse<T> {
  expert?: T;
  internal?: T;
  evidence?: T;
}

const STATUS_OPTIONS: Array<{ value: SpecialistStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'final', label: 'Final' },
];

const BASE_STANDARDS: Record<TargetType, string> = {
  expert: 'ISA 620',
  internal: 'ISA 610',
};

interface EvidenceFormInputs {
  description: string;
  documentId: string;
  evidenceUrl: string;
  notes: string;
  standards: string;
}

const DEFAULT_EVIDENCE_FORM: EvidenceFormInputs = {
  description: '',
  documentId: '',
  evidenceUrl: '',
  notes: '',
  standards: '',
};

function parseStandards(input: string, targetType: TargetType): string[] {
  const base = BASE_STANDARDS[targetType];
  const additional = input
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== base);
  return Array.from(new Set([base, ...additional]));
}

export default function AuditSpecialistsPage() {
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [engagementId, setEngagementId] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expertForm, setExpertForm] = useState<ExpertEvaluationForm>({
    id: null,
    area: '',
    specialistName: '',
    specialistFirm: '',
    scopeOfWork: '',
    competenceAssessment: '',
    objectivityAssessment: '',
    workPerformed: '',
    resultsSummary: '',
    conclusion: '',
    status: 'draft',
    standardRefs: [BASE_STANDARDS.expert],
  });

  const [internalForm, setInternalForm] = useState<InternalEvaluationForm>({
    id: null,
    relianceArea: '',
    internalAuditLead: '',
    scopeOfReliance: '',
    competenceEvaluation: '',
    objectivityEvaluation: '',
    workEvaluation: '',
    riskAssessment: '',
    conclusion: '',
    status: 'draft',
    standardRefs: [BASE_STANDARDS.internal],
  });

  const [expertEvidence, setExpertEvidence] = useState<EvidenceRecord[]>([]);
  const [internalEvidence, setInternalEvidence] = useState<EvidenceRecord[]>([]);
  const [newEvidenceForms, setNewEvidenceForms] = useState<Record<TargetType, EvidenceFormInputs>>({
    expert: { ...DEFAULT_EVIDENCE_FORM },
    internal: { ...DEFAULT_EVIDENCE_FORM },
  });

  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editingEvidenceType, setEditingEvidenceType] = useState<TargetType | null>(null);
  const [editingEvidenceForm, setEditingEvidenceForm] = useState<EvidenceFormInputs>({
    ...DEFAULT_EVIDENCE_FORM,
  });

  const expertStandardInput = useMemo(
    () => expertForm.standardRefs.join(', '),
    [expertForm.standardRefs],
  );
  const internalStandardInput = useMemo(
    () => internalForm.standardRefs.join(', '),
    [internalForm.standardRefs],
  );

  useEffect(() => {
    setFeedback(null);
    setError(null);
  }, [orgId, engagementId, userId]);

  const handleExpertChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setExpertForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInternalChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setInternalForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateStandardRefs = (targetType: TargetType, input: string) => {
    if (targetType === 'expert') {
      setExpertForm((prev) => ({ ...prev, standardRefs: parseStandards(input, 'expert') }));
    } else {
      setInternalForm((prev) => ({ ...prev, standardRefs: parseStandards(input, 'internal') }));
    }
  };

  const handleLoad = async () => {
    setFeedback(null);
    setError(null);

    if (!orgId || !engagementId) {
      setError('Provide an organisation ID and engagement ID to load evaluations.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/specialists?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to load specialist assessments');
      }

      const payload = (await response.json()) as {
        experts: Array<ExpertEvaluationForm & { evidence: EvidenceRecord[] }>;
        internal: Array<InternalEvaluationForm & { evidence: EvidenceRecord[] }>;
      };

      const [expert] = payload.experts;
      if (expert) {
        setExpertForm({
          id: expert.id,
          area: expert.area ?? '',
          specialistName: expert.specialistName ?? (expert as unknown as { specialist_name?: string }).specialist_name ?? '',
          specialistFirm:
            expert.specialistFirm ?? (expert as unknown as { specialist_firm?: string }).specialist_firm ?? '',
          scopeOfWork:
            expert.scopeOfWork ?? (expert as unknown as { scope_of_work?: string }).scope_of_work ?? '',
          competenceAssessment:
            expert.competenceAssessment ??
            (expert as unknown as { competence_assessment?: string }).competence_assessment ??
            '',
          objectivityAssessment:
            expert.objectivityAssessment ??
            (expert as unknown as { objectivity_assessment?: string }).objectivity_assessment ??
            '',
          workPerformed:
            expert.workPerformed ?? (expert as unknown as { work_performed?: string }).work_performed ?? '',
          resultsSummary:
            expert.resultsSummary ?? (expert as unknown as { results_summary?: string }).results_summary ?? '',
          conclusion: expert.conclusion ?? '',
          status: (expert.status as SpecialistStatus | null) ?? 'draft',
          standardRefs: expert.standardRefs ?? expert.standard_refs ?? [BASE_STANDARDS.expert],
        });
        setExpertEvidence(expert.evidence ?? []);
      } else {
        setExpertForm({
          id: null,
          area: '',
          specialistName: '',
          specialistFirm: '',
          scopeOfWork: '',
          competenceAssessment: '',
          objectivityAssessment: '',
          workPerformed: '',
          resultsSummary: '',
          conclusion: '',
          status: 'draft',
          standardRefs: [BASE_STANDARDS.expert],
        });
        setExpertEvidence([]);
      }

      const [internal] = payload.internal;
      if (internal) {
        setInternalForm({
          id: internal.id,
          relianceArea:
            internal.relianceArea ?? (internal as unknown as { reliance_area?: string }).reliance_area ?? '',
          internalAuditLead:
            internal.internalAuditLead ??
            (internal as unknown as { internal_audit_lead?: string }).internal_audit_lead ??
            '',
          scopeOfReliance:
            internal.scopeOfReliance ??
            (internal as unknown as { scope_of_reliance?: string }).scope_of_reliance ??
            '',
          competenceEvaluation:
            internal.competenceEvaluation ??
            (internal as unknown as { competence_evaluation?: string }).competence_evaluation ??
            '',
          objectivityEvaluation:
            internal.objectivityEvaluation ??
            (internal as unknown as { objectivity_evaluation?: string }).objectivity_evaluation ??
            '',
          workEvaluation:
            internal.workEvaluation ??
            (internal as unknown as { work_evaluation?: string }).work_evaluation ??
            '',
          riskAssessment:
            internal.riskAssessment ?? (internal as unknown as { risk_assessment?: string }).risk_assessment ?? '',
          conclusion: internal.conclusion ?? '',
          status: (internal.status as SpecialistStatus | null) ?? 'draft',
          standardRefs: internal.standardRefs ?? internal.standard_refs ?? [BASE_STANDARDS.internal],
        });
        setInternalEvidence(internal.evidence ?? []);
      } else {
        setInternalForm({
          id: null,
          relianceArea: '',
          internalAuditLead: '',
          scopeOfReliance: '',
          competenceEvaluation: '',
          objectivityEvaluation: '',
          workEvaluation: '',
          riskAssessment: '',
          conclusion: '',
          status: 'draft',
          standardRefs: [BASE_STANDARDS.internal],
        });
        setInternalEvidence([]);
      }

      setFeedback('Latest specialist evaluations retrieved successfully.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ensureHeaders = () => {
    if (!userId) {
      throw new Error('Provide an acting user ID via the x-user-id header field.');
    }
    if (!orgId || !engagementId) {
      throw new Error('Organisation and engagement identifiers are required.');
    }
  };

  const handleExpertSave = async (conclude = false) => {
    setFeedback(null);
    setError(null);
    try {
      ensureHeaders();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    const isCreate = !expertForm.id;
    const url = isCreate ? '/api/specialists/experts' : `/api/specialists/experts/${expertForm.id}`;
    const method = isCreate ? 'POST' : 'PUT';

    const payload = isCreate
      ? {
          orgId,
          engagementId,
          area: expertForm.area,
          specialistName: expertForm.specialistName,
          specialistFirm: expertForm.specialistFirm,
          scopeOfWork: expertForm.scopeOfWork,
          competenceAssessment: expertForm.competenceAssessment,
          objectivityAssessment: expertForm.objectivityAssessment,
          workPerformed: expertForm.workPerformed,
          resultsSummary: expertForm.resultsSummary,
          conclusion: expertForm.conclusion,
          status: expertForm.status,
          standardRefs: expertForm.standardRefs,
        }
      : {
          area: expertForm.area,
          specialistName: expertForm.specialistName,
          specialistFirm: expertForm.specialistFirm,
          scopeOfWork: expertForm.scopeOfWork,
          competenceAssessment: expertForm.competenceAssessment,
          objectivityAssessment: expertForm.objectivityAssessment,
          workPerformed: expertForm.workPerformed,
          resultsSummary: expertForm.resultsSummary,
          conclusion: expertForm.conclusion,
          status: expertForm.status,
          standardRefs: expertForm.standardRefs,
          conclude,
        };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? 'Failed to persist expert evaluation');
      }

      const result = (await response.json()) as EvaluationResponse<ExpertEvaluationForm & {
        evidence?: EvidenceRecord[];
      }>;

      if (result.expert) {
        setExpertForm({
          id: result.expert.id ?? expertForm.id,
          area: (result.expert as unknown as { area?: string }).area ?? expertForm.area,
          specialistName:
            (result.expert as unknown as { specialist_name?: string }).specialist_name ??
            result.expert.specialistName ??
            expertForm.specialistName,
          specialistFirm:
            (result.expert as unknown as { specialist_firm?: string }).specialist_firm ??
            result.expert.specialistFirm ??
            expertForm.specialistFirm,
          scopeOfWork:
            (result.expert as unknown as { scope_of_work?: string }).scope_of_work ??
            result.expert.scopeOfWork ??
            expertForm.scopeOfWork,
          competenceAssessment:
            (result.expert as unknown as { competence_assessment?: string }).competence_assessment ??
            result.expert.competenceAssessment ??
            expertForm.competenceAssessment,
          objectivityAssessment:
            (result.expert as unknown as { objectivity_assessment?: string }).objectivity_assessment ??
            result.expert.objectivityAssessment ??
            expertForm.objectivityAssessment,
          workPerformed:
            (result.expert as unknown as { work_performed?: string }).work_performed ??
            result.expert.workPerformed ??
            expertForm.workPerformed,
          resultsSummary:
            (result.expert as unknown as { results_summary?: string }).results_summary ??
            result.expert.resultsSummary ??
            expertForm.resultsSummary,
          conclusion:
            (result.expert as unknown as { conclusion?: string }).conclusion ??
            result.expert.conclusion ??
            expertForm.conclusion,
          status:
            ((result.expert as unknown as { status?: SpecialistStatus }).status ??
              (result.expert.status as SpecialistStatus | undefined) ??
              expertForm.status) as SpecialistStatus,
          standardRefs:
            (result.expert as unknown as { standard_refs?: string[] }).standard_refs ??
            result.expert.standardRefs ??
            expertForm.standardRefs,
        });
      }

      setFeedback(conclude ? 'Expert conclusion recorded.' : 'Expert evaluation saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleInternalSave = async (conclude = false) => {
    setFeedback(null);
    setError(null);
    try {
      ensureHeaders();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    const isCreate = !internalForm.id;
    const url = isCreate
      ? '/api/specialists/internal'
      : `/api/specialists/internal/${internalForm.id}`;
    const method = isCreate ? 'POST' : 'PUT';

    const payload = isCreate
      ? {
          orgId,
          engagementId,
          relianceArea: internalForm.relianceArea,
          internalAuditLead: internalForm.internalAuditLead,
          scopeOfReliance: internalForm.scopeOfReliance,
          competenceEvaluation: internalForm.competenceEvaluation,
          objectivityEvaluation: internalForm.objectivityEvaluation,
          workEvaluation: internalForm.workEvaluation,
          riskAssessment: internalForm.riskAssessment,
          conclusion: internalForm.conclusion,
          status: internalForm.status,
          standardRefs: internalForm.standardRefs,
        }
      : {
          relianceArea: internalForm.relianceArea,
          internalAuditLead: internalForm.internalAuditLead,
          scopeOfReliance: internalForm.scopeOfReliance,
          competenceEvaluation: internalForm.competenceEvaluation,
          objectivityEvaluation: internalForm.objectivityEvaluation,
          workEvaluation: internalForm.workEvaluation,
          riskAssessment: internalForm.riskAssessment,
          conclusion: internalForm.conclusion,
          status: internalForm.status,
          standardRefs: internalForm.standardRefs,
          conclude,
        };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? 'Failed to persist internal audit evaluation');
      }

      const result = (await response.json()) as EvaluationResponse<InternalEvaluationForm>;

      if (result.internal) {
        setInternalForm({
          id: result.internal.id ?? internalForm.id,
          relianceArea:
            (result.internal as unknown as { reliance_area?: string }).reliance_area ??
            result.internal.relianceArea ??
            internalForm.relianceArea,
          internalAuditLead:
            (result.internal as unknown as { internal_audit_lead?: string }).internal_audit_lead ??
            result.internal.internalAuditLead ??
            internalForm.internalAuditLead,
          scopeOfReliance:
            (result.internal as unknown as { scope_of_reliance?: string }).scope_of_reliance ??
            result.internal.scopeOfReliance ??
            internalForm.scopeOfReliance,
          competenceEvaluation:
            (result.internal as unknown as { competence_evaluation?: string }).competence_evaluation ??
            result.internal.competenceEvaluation ??
            internalForm.competenceEvaluation,
          objectivityEvaluation:
            (result.internal as unknown as { objectivity_evaluation?: string }).objectivity_evaluation ??
            result.internal.objectivityEvaluation ??
            internalForm.objectivityEvaluation,
          workEvaluation:
            (result.internal as unknown as { work_evaluation?: string }).work_evaluation ??
            result.internal.workEvaluation ??
            internalForm.workEvaluation,
          riskAssessment:
            (result.internal as unknown as { risk_assessment?: string }).risk_assessment ??
            result.internal.riskAssessment ??
            internalForm.riskAssessment,
          conclusion:
            (result.internal as unknown as { conclusion?: string }).conclusion ??
            result.internal.conclusion ??
            internalForm.conclusion,
          status:
            ((result.internal as unknown as { status?: SpecialistStatus }).status ??
              (result.internal.status as SpecialistStatus | undefined) ??
              internalForm.status) as SpecialistStatus,
          standardRefs:
            (result.internal as unknown as { standard_refs?: string[] }).standard_refs ??
            result.internal.standardRefs ??
            internalForm.standardRefs,
        });
      }

      setFeedback(conclude ? 'Internal reliance conclusion saved.' : 'Internal audit evaluation saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEvidenceInputChange = (
    type: TargetType,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setNewEvidenceForms((prev) => ({
      ...prev,
      [type]: { ...prev[type], [name]: value },
    }));
  };

  const handleEvidenceCreate = async (type: TargetType) => {
    setFeedback(null);
    setError(null);

    try {
      ensureHeaders();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    const evaluationId = type === 'expert' ? expertForm.id : internalForm.id;
    if (!evaluationId) {
      setError('Save the evaluation before attaching evidence.');
      return;
    }

    const form = newEvidenceForms[type];
    if (!form.documentId && !form.evidenceUrl) {
      setError('Provide either a document identifier or an evidence URL.');
      return;
    }

    const payload = {
      orgId,
      engagementId,
      targetType: type,
      targetId: evaluationId,
      documentId: form.documentId || null,
      evidenceUrl: form.evidenceUrl || null,
      description: form.description || null,
      notes: form.notes || null,
      standardRefs: parseStandards(form.standards, type),
    };

    try {
      const response = await fetch('/api/specialists/evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? 'Unable to attach evidence');
      }

      const result = (await response.json()) as { evidence: EvidenceRecord };
      if (type === 'expert') {
        setExpertEvidence((prev) => [...prev, result.evidence]);
      } else {
        setInternalEvidence((prev) => [...prev, result.evidence]);
      }

      setNewEvidenceForms((prev) => ({
        ...prev,
        [type]: { ...DEFAULT_EVIDENCE_FORM },
      }));
      setFeedback('Evidence attachment captured.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEditingEvidence = (record: EvidenceRecord, type: TargetType) => {
    setEditingEvidenceId(record.id);
    setEditingEvidenceType(type);
    setEditingEvidenceForm({
      description: record.description ?? '',
      documentId: record.document_id ?? '',
      evidenceUrl: record.evidence_url ?? '',
      notes: record.notes ?? '',
      standards: record.standard_refs?.join(', ') ?? BASE_STANDARDS[type],
    });
  };

  const cancelEvidenceEdit = () => {
    setEditingEvidenceId(null);
    setEditingEvidenceType(null);
    setEditingEvidenceForm({ ...DEFAULT_EVIDENCE_FORM });
  };

  const handleEvidenceEditChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setEditingEvidenceForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEvidenceEdit = async () => {
    if (!editingEvidenceId || !editingEvidenceType) {
      return;
    }

    try {
      ensureHeaders();
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    const payload = {
      description: editingEvidenceForm.description || null,
      documentId: editingEvidenceForm.documentId || null,
      evidenceUrl: editingEvidenceForm.evidenceUrl || null,
      notes: editingEvidenceForm.notes || null,
      standardRefs: parseStandards(editingEvidenceForm.standards, editingEvidenceType),
    };

    try {
      const response = await fetch(`/api/specialists/evidence/${editingEvidenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? 'Failed to update evidence');
      }

      const result = (await response.json()) as { evidence: EvidenceRecord };
      if (editingEvidenceType === 'expert') {
        setExpertEvidence((prev) => prev.map((item) => (item.id === result.evidence.id ? result.evidence : item)));
      } else {
        setInternalEvidence((prev) => prev.map((item) => (item.id === result.evidence.id ? result.evidence : item)));
      }

      setFeedback('Evidence record updated.');
      cancelEvidenceEdit();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const exportMemo = (type: TargetType) => {
    const evaluation = type === 'expert' ? expertForm : internalForm;
    const evidenceList = type === 'expert' ? expertEvidence : internalEvidence;
    const title = type === 'expert' ? 'Expert Use Evaluation' : 'Internal Audit Reliance Evaluation';

    const lines = [
      `# ${title}`,
      '',
      `*Organisation:* ${orgId || 'N/A'}`,
      `*Engagement:* ${engagementId || 'N/A'}`,
      `*Status:* ${evaluation.status}`,
      `*Standards:* ${(evaluation.standardRefs || []).join(', ')}`,
      '',
    ];

    if (type === 'expert') {
      lines.push(
        `## Specialist details`,
        `- Area: ${evaluation.area || '—'}`,
        `- Specialist: ${evaluation.specialistName || '—'}`,
        `- Firm: ${evaluation.specialistFirm || '—'}`,
        '',
        `## Evaluation`,
        `- Scope of work: ${evaluation.scopeOfWork || '—'}`,
        `- Competence: ${evaluation.competenceAssessment || '—'}`,
        `- Objectivity: ${evaluation.objectivityAssessment || '—'}`,
        `- Work performed: ${evaluation.workPerformed || '—'}`,
        `- Results: ${evaluation.resultsSummary || '—'}`,
      );
    } else {
      lines.push(
        `## Internal audit profile`,
        `- Reliance area: ${evaluation.relianceArea || '—'}`,
        `- Internal audit lead: ${evaluation.internalAuditLead || '—'}`,
        '',
        `## Evaluation`,
        `- Scope of reliance: ${evaluation.scopeOfReliance || '—'}`,
        `- Competence: ${evaluation.competenceEvaluation || '—'}`,
        `- Objectivity: ${evaluation.objectivityEvaluation || '—'}`,
        `- Work evaluation: ${evaluation.workEvaluation || '—'}`,
        `- Risk assessment: ${evaluation.riskAssessment || '—'}`,
      );
    }

    lines.push('', `## Conclusion`, evaluation.conclusion || '—', '', '## Evidence');

    if (evidenceList.length === 0) {
      lines.push('No evidence captured.');
    } else {
      evidenceList.forEach((item, index) => {
        lines.push(
          `### Evidence ${index + 1}`,
          `- Description: ${item.description ?? '—'}`,
          `- Document ID: ${item.document_id ?? '—'}`,
          `- URL: ${item.evidence_url ?? '—'}`,
          `- Notes: ${item.notes ?? '—'}`,
          `- Standards: ${(item.standard_refs ?? []).join(', ') || '—'}`,
          '',
        );
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${type}-specialist-memo-${engagementId || 'draft'}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderEvidenceList = (records: EvidenceRecord[], type: TargetType) => (
    <div className="space-y-3" aria-live="polite">
      {records.length === 0 && <p className="text-sm text-muted-foreground">No evidence captured yet.</p>}
      {records.map((record) => {
        const isEditing = editingEvidenceId === record.id && editingEvidenceType === type;
        return (
          <div key={record.id} className="rounded border border-border p-3">
            {isEditing ? (
              <form
                className="space-y-2"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void saveEvidenceEdit();
                }}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor={`edit-description-${record.id}`}>
                    Description
                  </label>
                  <input
                    id={`edit-description-${record.id}`}
                    name="description"
                    value={editingEvidenceForm.description}
                    onChange={handleEvidenceEditChange}
                    className="rounded border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor={`edit-document-${record.id}`}>
                    Document ID
                  </label>
                  <input
                    id={`edit-document-${record.id}`}
                    name="documentId"
                    value={editingEvidenceForm.documentId}
                    onChange={handleEvidenceEditChange}
                    className="rounded border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor={`edit-url-${record.id}`}>
                    Evidence URL
                  </label>
                  <input
                    id={`edit-url-${record.id}`}
                    name="evidenceUrl"
                    value={editingEvidenceForm.evidenceUrl}
                    onChange={handleEvidenceEditChange}
                    className="rounded border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor={`edit-notes-${record.id}`}>
                    Notes
                  </label>
                  <textarea
                    id={`edit-notes-${record.id}`}
                    name="notes"
                    value={editingEvidenceForm.notes}
                    onChange={handleEvidenceEditChange}
                    className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor={`edit-standards-${record.id}`}>
                    Standards (comma separated)
                  </label>
                  <input
                    id={`edit-standards-${record.id}`}
                    name="standards"
                    value={editingEvidenceForm.standards}
                    onChange={handleEvidenceEditChange}
                    className="rounded border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEvidenceEdit}
                    className="rounded border border-border px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{record.description ?? 'Untitled evidence'}</p>
                  <button
                    type="button"
                    onClick={() => startEditingEvidence(record, type)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p>
                  <span className="font-medium">Document ID:</span> {record.document_id ?? '—'}
                </p>
                <p>
                  <span className="font-medium">Evidence URL:</span> {record.evidence_url ?? '—'}
                </p>
                <p>
                  <span className="font-medium">Notes:</span> {record.notes ?? '—'}
                </p>
                <p>
                  <span className="font-medium">Standards:</span>{' '}
                  {(record.standard_refs ?? []).join(', ') || '—'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6" aria-labelledby="audit-specialists-heading">
      <header className="space-y-2">
        <h1 id="audit-specialists-heading" className="text-2xl font-semibold">
          Audit specialists workflow
        </h1>
        <p className="text-sm text-muted-foreground">
          Capture ISA 620 expert considerations and ISA 610 internal audit reliance assessments, attach supporting evidence, and export memo-ready summaries for your file.
        </p>
      </header>

      <section className="rounded border border-border p-4">
        <h2 className="text-lg font-medium">Engagement context</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Acting user ID
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="rounded border border-border px-3 py-2 text-sm"
              placeholder="Supabase auth user identifier"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Organisation ID
            <input
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="rounded border border-border px-3 py-2 text-sm"
              placeholder="org-uuid"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Engagement ID
            <input
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              className="rounded border border-border px-3 py-2 text-sm"
              placeholder="engagement-uuid"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleLoad()}
          disabled={loading}
          className="mt-4 inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load evaluations'}
        </button>
        {(feedback || error) && (
          <p className={`mt-3 text-sm ${error ? 'text-red-600' : 'text-green-700'}`} aria-live="polite">
            {error ?? feedback}
          </p>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2" aria-label="Specialist evaluations">
        <article className="flex flex-col gap-4 rounded border border-border p-4" aria-label="Expert use">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">External expert (ISA 620)</h2>
              <p className="text-xs text-muted-foreground">
                Assess the competence, objectivity, and work of the specialist engaged by the firm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportMemo('expert')}
              className="rounded border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              Export memo
            </button>
          </header>

          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Area addressed
              <input
                name="area"
                value={expertForm.area}
                onChange={handleExpertChange}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Specialist name
              <input
                name="specialistName"
                value={expertForm.specialistName}
                onChange={handleExpertChange}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Specialist firm
              <input
                name="specialistFirm"
                value={expertForm.specialistFirm}
                onChange={handleExpertChange}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Scope of work
              <textarea
                name="scopeOfWork"
                value={expertForm.scopeOfWork}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Competence evaluation
              <textarea
                name="competenceAssessment"
                value={expertForm.competenceAssessment}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Objectivity assessment
              <textarea
                name="objectivityAssessment"
                value={expertForm.objectivityAssessment}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Work performed
              <textarea
                name="workPerformed"
                value={expertForm.workPerformed}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Results summary
              <textarea
                name="resultsSummary"
                value={expertForm.resultsSummary}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Conclusion
              <textarea
                name="conclusion"
                value={expertForm.conclusion}
                onChange={handleExpertChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Status
              <select
                name="status"
                value={expertForm.status}
                onChange={handleExpertChange}
                className="rounded border border-border px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Standards (comma separated)
              <input
                value={expertStandardInput}
                onChange={(event) => updateStandardRefs('expert', event.target.value)}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExpertSave(false)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save expert evaluation
            </button>
            <button
              type="button"
              onClick={() => void handleExpertSave(true)}
              className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Mark concluded
            </button>
          </div>

          <section aria-label="Expert evidence" className="space-y-4">
            <h3 className="text-sm font-semibold">Evidence attachments</h3>
            {renderEvidenceList(expertEvidence, 'expert')}
            <form
              className="space-y-2 rounded border border-dashed border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleEvidenceCreate('expert');
              }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add new evidence
              </h4>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="expert-evidence-description">
                  Description
                </label>
                <input
                  id="expert-evidence-description"
                  name="description"
                  value={newEvidenceForms.expert.description}
                  onChange={(event) => handleEvidenceInputChange('expert', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="expert-evidence-document">
                  Document ID
                </label>
                <input
                  id="expert-evidence-document"
                  name="documentId"
                  value={newEvidenceForms.expert.documentId}
                  onChange={(event) => handleEvidenceInputChange('expert', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="expert-evidence-url">
                  Evidence URL
                </label>
                <input
                  id="expert-evidence-url"
                  name="evidenceUrl"
                  value={newEvidenceForms.expert.evidenceUrl}
                  onChange={(event) => handleEvidenceInputChange('expert', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="expert-evidence-notes">
                  Notes
                </label>
                <textarea
                  id="expert-evidence-notes"
                  name="notes"
                  value={newEvidenceForms.expert.notes}
                  onChange={(event) => handleEvidenceInputChange('expert', event)}
                  className="min-h-[60px] rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="expert-evidence-standards">
                  Standards (comma separated)
                </label>
                <input
                  id="expert-evidence-standards"
                  name="standards"
                  value={newEvidenceForms.expert.standards}
                  onChange={(event) => handleEvidenceInputChange('expert', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                Attach evidence
              </button>
            </form>
          </section>
        </article>

        <article className="flex flex-col gap-4 rounded border border-border p-4" aria-label="Internal audit">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Internal audit reliance (ISA 610)</h2>
              <p className="text-xs text-muted-foreground">
                Document the reliance strategy on the internal audit function and conclude on sufficiency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportMemo('internal')}
              className="rounded border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              Export memo
            </button>
          </header>

          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Reliance area
              <input
                name="relianceArea"
                value={internalForm.relianceArea}
                onChange={handleInternalChange}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Internal audit lead
              <input
                name="internalAuditLead"
                value={internalForm.internalAuditLead}
                onChange={handleInternalChange}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Scope of reliance
              <textarea
                name="scopeOfReliance"
                value={internalForm.scopeOfReliance}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Competence evaluation
              <textarea
                name="competenceEvaluation"
                value={internalForm.competenceEvaluation}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Objectivity evaluation
              <textarea
                name="objectivityEvaluation"
                value={internalForm.objectivityEvaluation}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Work evaluation
              <textarea
                name="workEvaluation"
                value={internalForm.workEvaluation}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Risk assessment
              <textarea
                name="riskAssessment"
                value={internalForm.riskAssessment}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Conclusion
              <textarea
                name="conclusion"
                value={internalForm.conclusion}
                onChange={handleInternalChange}
                className="min-h-[80px] rounded border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Status
              <select
                name="status"
                value={internalForm.status}
                onChange={handleInternalChange}
                className="rounded border border-border px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Standards (comma separated)
              <input
                value={internalStandardInput}
                onChange={(event) => updateStandardRefs('internal', event.target.value)}
                className="rounded border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleInternalSave(false)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save internal audit evaluation
            </button>
            <button
              type="button"
              onClick={() => void handleInternalSave(true)}
              className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Mark concluded
            </button>
          </div>

          <section aria-label="Internal audit evidence" className="space-y-4">
            <h3 className="text-sm font-semibold">Evidence attachments</h3>
            {renderEvidenceList(internalEvidence, 'internal')}
            <form
              className="space-y-2 rounded border border-dashed border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleEvidenceCreate('internal');
              }}
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add new evidence
              </h4>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="internal-evidence-description">
                  Description
                </label>
                <input
                  id="internal-evidence-description"
                  name="description"
                  value={newEvidenceForms.internal.description}
                  onChange={(event) => handleEvidenceInputChange('internal', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="internal-evidence-document">
                  Document ID
                </label>
                <input
                  id="internal-evidence-document"
                  name="documentId"
                  value={newEvidenceForms.internal.documentId}
                  onChange={(event) => handleEvidenceInputChange('internal', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="internal-evidence-url">
                  Evidence URL
                </label>
                <input
                  id="internal-evidence-url"
                  name="evidenceUrl"
                  value={newEvidenceForms.internal.evidenceUrl}
                  onChange={(event) => handleEvidenceInputChange('internal', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="internal-evidence-notes">
                  Notes
                </label>
                <textarea
                  id="internal-evidence-notes"
                  name="notes"
                  value={newEvidenceForms.internal.notes}
                  onChange={(event) => handleEvidenceInputChange('internal', event)}
                  className="min-h-[60px] rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="internal-evidence-standards">
                  Standards (comma separated)
                </label>
                <input
                  id="internal-evidence-standards"
                  name="standards"
                  value={newEvidenceForms.internal.standards}
                  onChange={(event) => handleEvidenceInputChange('internal', event)}
                  className="rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                Attach evidence
              </button>
            </form>
          </section>
        </article>
      </section>
    </main>
  );
}
