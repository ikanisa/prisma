import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuditWorkspaceLayout } from './layout';

type SpecialistKind = 'EXTERNAL_SPECIALIST' | 'INTERNAL_AUDIT';
type SpecialistConclusion = 'RELIED' | 'PARTIAL' | 'NOT_RELIED' | 'PENDING';

type SpecialistAssessment = {
  id: string;
  org_id: string;
  engagement_id: string;
  specialist_kind: SpecialistKind | string;
  name: string;
  firm: string | null;
  scope: string | null;
  competence_rationale: string | null;
  objectivity_rationale: string | null;
  work_performed: string | null;
  conclusion: SpecialistConclusion | string;
  conclusion_notes: string | null;
  memo_document_id: string | null;
  prepared_by_user_id: string | null;
  prepared_at: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
};

type AssessmentForm = {
  assessmentId?: string;
  specialistKind: SpecialistKind;
  name: string;
  firm: string;
  scope: string;
  competenceRationale: string;
  objectivityRationale: string;
  workPerformed: string;
  conclusion: SpecialistConclusion;
  conclusionNotes: string;
  memoDocumentId: string;
};

const demoAssessments: SpecialistAssessment[] = [
  {
    id: 'exp-demo-1',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    specialist_kind: 'EXTERNAL_SPECIALIST',
    name: 'Valuation expert',
    firm: 'ValuCo Ltd',
    scope: 'Impairment model review',
    competence_rationale: 'IFRS valuation credentials, industry experience.',
    objectivity_rationale: 'Independent from client, no conflicts identified.',
    work_performed: 'Reviewed cash flow model assumptions and recalculated discount rates.',
    conclusion: 'PARTIAL',
    conclusion_notes: 'Adequate for key assumptions; management to provide additional evidence over terminal growth.',
    memo_document_id: null,
    prepared_by_user_id: 'demo-user',
    prepared_at: new Date().toISOString(),
    reviewed_by_user_id: null,
    reviewed_at: null,
  },
  {
    id: 'exp-demo-2',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    specialist_kind: 'INTERNAL_AUDIT',
    name: 'Internal audit function',
    firm: null,
    scope: 'Procurement cycle testing',
    competence_rationale: 'Team includes CIA and ACCA qualified staff.',
    objectivity_rationale: 'Reports to audit committee; charter reviewed.',
    work_performed: 'Walkthroughs and sample testing of purchase orders.',
    conclusion: 'RELIED',
    conclusion_notes: 'Results leveraged for procurement controls; limited re-performance required.',
    memo_document_id: null,
    prepared_by_user_id: 'demo-user',
    prepared_at: new Date().toISOString(),
    reviewed_by_user_id: 'manager-demo',
    reviewed_at: new Date().toISOString(),
  },
];

export default function SpecialistsWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [userId, setUserId] = useState('demo-user');

  const [assessments, setAssessments] = useState<SpecialistAssessment[]>(demoAssessments);
  const [selectedId, setSelectedId] = useState<string>(demoAssessments[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>('Showing deterministic demo data.');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formState, setFormState] = useState<AssessmentForm>({
    specialistKind: 'EXTERNAL_SPECIALIST',
    name: '',
    firm: '',
    scope: '',
    competenceRationale: '',
    objectivityRationale: '',
    workPerformed: '',
    conclusion: 'PENDING',
    conclusionNotes: '',
    memoDocumentId: '',
  });

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === selectedId) ?? null,
    [assessments, selectedId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setAssessments(demoAssessments);
      setSelectedId(demoAssessments[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull assessments from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId) {
      setStatusMessage('Provide organisation and engagement identifiers to load live data.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, engagementId });
        const response = await fetch(`/api/exp/assessments?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load assessments');
        }
        const body = (await response.json()) as { assessments: SpecialistAssessment[] };
        const normalised = normalizeAssessment(body.assessments ?? []);
        setAssessments(normalised);
        setSelectedId((prev) => (normalised.some((assessment) => assessment.id === prev) ? prev : normalised[0]?.id ?? ''));
        setStatusMessage(normalised.length ? 'Specialist assessments loaded.' : 'No specialist assessments recorded yet.');
        setStatusTone(normalised.length ? 'success' : 'info');
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch assessments';
        setFetchError(message);
        setStatusMessage('Fell back to last known data.');
        setStatusTone('error');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [mode, orgId, engagementId]);

  const showStatus = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };
  const resetStatus = () => setStatusMessage(null);

  const handleSaveAssessment = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to record assessments.', 'error');
      return;
    }
    if (!orgId || !engagementId || !userId) {
      showStatus('Provide organisation, engagement, and user identifiers.', 'error');
      return;
    }
    if (!formState.name) {
      showStatus('Provide the specialist name.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/exp/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          userId,
          assessmentId: formState.assessmentId,
          specialistKind: formState.specialistKind,
          name: formState.name,
          firm: formState.firm || undefined,
          scope: formState.scope || undefined,
          competenceRationale: formState.competenceRationale || undefined,
          objectivityRationale: formState.objectivityRationale || undefined,
          workPerformed: formState.workPerformed || undefined,
          conclusion: formState.conclusion,
          conclusionNotes: formState.conclusionNotes || undefined,
          memoDocumentId: formState.memoDocumentId || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; assessmentId?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to record assessment');
      }
      await refreshAssessments();
      showStatus('Assessment saved.', 'success');
      setFormState({ specialistKind: 'EXTERNAL_SPECIALIST', name: '', firm: '', scope: '', competenceRationale: '', objectivityRationale: '', workPerformed: '', conclusion: 'PENDING', conclusionNotes: '', memoDocumentId: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record assessment';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConclude = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to conclude reliance.', 'error');
      return;
    }
    if (!selectedAssessment) {
      showStatus('Select an assessment first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/exp/assessments/conclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          assessmentId: selectedAssessment.id,
          conclusion: formState.conclusion,
          conclusionNotes: formState.conclusionNotes || undefined,
          memoDocumentId: formState.memoDocumentId || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to conclude assessment');
      }
      await refreshAssessments();
      showStatus('Conclusion queued for approval.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to conclude assessment';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshAssessments = async () => {
    if (mode !== 'live') {
      setAssessments(demoAssessments);
      setSelectedId(demoAssessments[0]?.id ?? '');
      return;
    }
    const params = new URLSearchParams({ orgId, engagementId });
    const response = await fetch(`/api/exp/assessments?${params}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load assessments');
    }
    const body = (await response.json()) as { assessments: SpecialistAssessment[] };
    const normalised = normalizeAssessment(body.assessments ?? []);
    setAssessments(normalised);
    setSelectedId((prev) => (normalised.some((assessment) => assessment.id === prev) ? prev : normalised[0]?.id ?? ''));
  };

  return (
    <AuditWorkspaceLayout>
      <section className="space-y-6">
        <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Specialists & internal audit</h2>
        <p className="text-sm text-slate-600">Document reliance assessments, evidence, and approvals for external specialists and the internal audit function.</p>
      </header>

      <div className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'demo' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('demo')}
          >
            Demo data
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'live' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('live')}
          >
            Live Supabase
          </button>
          {fetchError && <span className="text-xs text-destructive">{fetchError}</span>}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input className="mt-1 rounded border px-2 py-1" value={orgId} onChange={(event) => setOrgId(event.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input className="mt-1 rounded border px-2 py-1" value={engagementId} onChange={(event) => setEngagementId(event.target.value)} />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input className="mt-1 rounded border px-2 py-1" value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            statusTone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusTone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Record assessment</h3>
            <form className="mt-3 space-y-3" onSubmit={handleSaveAssessment}>
              <label className="flex flex-col text-xs text-slate-600">
                Specialist
                <select
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.specialistKind}
                  onChange={(event) => setFormState((prev) => ({ ...prev, specialistKind: event.target.value as SpecialistKind }))}
                >
                  <option value="EXTERNAL_SPECIALIST">External specialist</option>
                  <option value="INTERNAL_AUDIT">Internal audit</option>
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Name
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Firm
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.firm}
                  onChange={(event) => setFormState((prev) => ({ ...prev, firm: event.target.value }))}
                  placeholder="n/a for internal audit"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Scope
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.scope}
                  onChange={(event) => setFormState((prev) => ({ ...prev, scope: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Competence rationale
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.competenceRationale}
                  onChange={(event) => setFormState((prev) => ({ ...prev, competenceRationale: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Objectivity rationale
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.objectivityRationale}
                  onChange={(event) => setFormState((prev) => ({ ...prev, objectivityRationale: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Work performed
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={formState.workPerformed}
                  onChange={(event) => setFormState((prev) => ({ ...prev, workPerformed: event.target.value }))}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Working…' : 'Save assessment'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Finalise conclusion</h3>
            {selectedAssessment ? (
              <form className="mt-3 space-y-3" onSubmit={handleConclude}>
                <label className="flex flex-col text-xs text-slate-600">
                  Conclusion
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={formState.conclusion}
                    onChange={(event) => setFormState((prev) => ({ ...prev, conclusion: event.target.value as SpecialistConclusion }))}
                  >
                    <option value="RELIED">Relied</option>
                    <option value="PARTIAL">Partial reliance</option>
                    <option value="NOT_RELIED">Not relied upon</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Conclusion notes
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={formState.conclusionNotes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, conclusionNotes: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Memo document ID
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={formState.memoDocumentId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, memoDocumentId: event.target.value }))}
                    placeholder="Optional"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Working…' : 'Submit conclusion'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select an assessment to finalise the conclusion.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Assessments</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {assessments.map((assessment) => (
                <button
                  key={assessment.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(assessment.id);
                    setFormState((prev) => ({
                      ...prev,
                      assessmentId: assessment.id,
                      specialistKind: assessment.specialist_kind as SpecialistKind,
                      name: assessment.name,
                      firm: assessment.firm ?? '',
                      scope: assessment.scope ?? '',
                      competenceRationale: assessment.competence_rationale ?? '',
                      objectivityRationale: assessment.objectivity_rationale ?? '',
                      workPerformed: assessment.work_performed ?? '',
                      conclusion: assessment.conclusion as SpecialistConclusion,
                      conclusionNotes: assessment.conclusion_notes ?? '',
                      memoDocumentId: assessment.memo_document_id ?? '',
                    }));
                  }}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedId === assessment.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{assessment.name}</span>
                    <span className="text-xs uppercase text-slate-500">{assessment.specialist_kind}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Conclusion: {assessment.conclusion}</div>
                </button>
              ))}
              {assessments.length === 0 && <p className="text-sm text-slate-500">No assessments recorded.</p>}
            </div>
          </div>

          {selectedAssessment && (
            <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
              <h4 className="text-lg font-semibold text-slate-900">{selectedAssessment.name}</h4>
              <p className="text-xs text-slate-600">Scope: {selectedAssessment.scope ?? 'n/a'}</p>
              <p className="text-xs text-slate-600">Firm: {selectedAssessment.firm ?? 'n/a'}</p>
              <p className="text-xs text-slate-600">Competence: {selectedAssessment.competence_rationale ?? 'n/a'}</p>
              <p className="text-xs text-slate-600">Objectivity: {selectedAssessment.objectivity_rationale ?? 'n/a'}</p>
              <p className="text-xs text-slate-600">Work performed: {selectedAssessment.work_performed ?? 'n/a'}</p>
              <p className="text-xs text-slate-600">Conclusion: {selectedAssessment.conclusion} {selectedAssessment.conclusion_notes ? `– ${selectedAssessment.conclusion_notes}` : ''}</p>
            </div>
          )}
        </div>
      </div>
    </section>
    </AuditWorkspaceLayout>
  );
}

function normalizeAssessment(records: any[]): SpecialistAssessment[] {
  return (records ?? []).map((record) => ({ ...record }));
}
