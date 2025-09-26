'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const demoComponents: GroupComponent[] = [
  {
    id: 'grp-demo-1',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    name: 'Subsidiary A',
    country: 'MT',
    significance: 'SIGNIFICANT',
    materiality: 450000,
    assigned_firm: 'Local CPA Malta',
    notes: 'Focus on revenue recognition and IT controls.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    instructions: [
      {
        id: 'inst-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        title: 'Perform walkthroughs over order-to-cash',
        status: 'SENT',
        sent_at: new Date().toISOString(),
        acknowledged_at: null,
        due_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    workpapers: [
      {
        id: 'wp-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        instruction_id: 'inst-demo-1',
        document_id: null,
        title: 'Inventory observation memo',
        uploaded_by_user_id: 'demo-user',
        uploaded_at: new Date().toISOString(),
        notes: 'Shared via Teams – attach final when ready.',
      },
    ],
    reviews: [
      {
        id: 'rev-demo-1',
        org_id: 'demo-org',
        engagement_id: 'demo-engagement',
        component_id: 'grp-demo-1',
        reviewer_user_id: 'manager-demo',
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        completed_at: null,
        notes: 'Awaiting testing completion.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
];

type GroupInstructionStatus = 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'COMPLETE';
type GroupReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
type GroupSignificance = 'INSIGNIFICANT' | 'SIGNIFICANT' | 'KEY';

type GroupInstruction = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  title: string;
  status: GroupInstructionStatus | string;
  sent_at: string | null;
  acknowledged_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type GroupWorkpaper = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  instruction_id: string | null;
  document_id: string | null;
  title: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  notes: string | null;
};

type GroupReview = {
  id: string;
  org_id: string;
  engagement_id: string;
  component_id: string;
  reviewer_user_id: string | null;
  status: GroupReviewStatus | string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type GroupComponent = {
  id: string;
  org_id: string;
  engagement_id: string;
  name: string;
  country: string | null;
  significance: GroupSignificance | string;
  materiality: number | null;
  assigned_firm: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  instructions: GroupInstruction[];
  workpapers: GroupWorkpaper[];
  reviews: GroupReview[];
};

const significanceOptions: GroupSignificance[] = ['INSIGNIFICANT', 'SIGNIFICANT', 'KEY'];
const instructionStatusOptions: GroupInstructionStatus[] = ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETE'];
const reviewStatusOptions: GroupReviewStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETE'];

export default function GroupAuditWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [userId, setUserId] = useState('demo-user');

  const [components, setComponents] = useState<GroupComponent[]>(demoComponents);
  const [selectedComponentId, setSelectedComponentId] = useState<string>(demoComponents[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>('Showing deterministic demo data.');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [componentForm, setComponentForm] = useState({
    name: '',
    country: '',
    significance: 'INSIGNIFICANT' as GroupSignificance,
    materiality: '',
    assignedFirm: '',
    notes: '',
  });

  const [instructionForm, setInstructionForm] = useState({
    title: '',
    status: 'DRAFT' as GroupInstructionStatus,
    dueAt: '',
  });

  const [reviewForm, setReviewForm] = useState({
    reviewerUserId: '',
    status: 'IN_PROGRESS' as GroupReviewStatus,
    notes: '',
  });

  const [workpaperForm, setWorkpaperForm] = useState({
    bucket: 'group-workpapers',
    path: '',
    name: '',
    note: '',
    instructionId: '',
  });

  const selectedComponent = useMemo(
    () => components.find((component) => component.id === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setComponents(demoComponents);
      setSelectedComponentId(demoComponents[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull group components from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId) {
      setStatusMessage('Provide organisation and engagement identifiers to load live group audit data.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, engagementId });
        const response = await fetch(`/api/group?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load group components');
        }
        const body = (await response.json()) as { components: GroupComponent[] };
        const normalised = normalizeComponents(body.components ?? []);
        setComponents(normalised);
        setSelectedComponentId((prev) => (normalised.some((component) => component.id === prev) ? prev : normalised[0]?.id ?? ''));
        setStatusMessage(normalised.length ? 'Group components loaded from Supabase.' : 'No group components defined yet.');
        setStatusTone(normalised.length ? 'success' : 'info');
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch group audit data';
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

  const resetStatus = () => {
    setStatusMessage(null);
  };

  const handleCreateComponent = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to create group components.', 'error');
      return;
    }
    if (!orgId || !engagementId || !userId) {
      showStatus('Provide organisation, engagement, and user identifiers.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          userId,
          name: componentForm.name,
          country: componentForm.country || undefined,
          significance: componentForm.significance,
          materiality: componentForm.materiality ? Number(componentForm.materiality) : undefined,
          assignedFirm: componentForm.assignedFirm || undefined,
          notes: componentForm.notes || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { component?: GroupComponent; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to create component');
      }
      await refreshComponents();
      showStatus('Group component created.', 'success');
      if (body.component?.id) setSelectedComponentId(body.component.id);
      setComponentForm({ name: '', country: '', significance: 'INSIGNIFICANT', materiality: '', assignedFirm: '', notes: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create component';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInstruction = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to send instructions.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          userId,
          title: instructionForm.title,
          status: instructionForm.status,
          dueAt: instructionForm.dueAt || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to send instruction');
      }
      setInstructionForm({ title: '', status: 'DRAFT', dueAt: '' });
      await refreshComponents();
      showStatus('Instruction recorded.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send instruction';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReview = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to update reviews.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          reviewerUserId: reviewForm.reviewerUserId,
          status: reviewForm.status,
          notes: reviewForm.notes || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to update review');
      }
      await refreshComponents();
      showStatus('Review updated.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update review';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadWorkpaper = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to log workpapers.', 'error');
      return;
    }
    if (!selectedComponentId) {
      showStatus('Select a component first.', 'error');
      return;
    }
    if (!workpaperForm.path || !workpaperForm.name) {
      showStatus('Provide object path and workpaper name.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/group/workpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          componentId: selectedComponentId,
          instructionId: workpaperForm.instructionId || undefined,
          documentBucket: workpaperForm.bucket,
          documentPath: workpaperForm.path,
          documentName: workpaperForm.name,
          note: workpaperForm.note || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { workpaper?: unknown; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to register workpaper');
      }
      setWorkpaperForm({ bucket: 'group-workpapers', path: '', name: '', note: '', instructionId: '' });
      await refreshComponents();
      showStatus('Workpaper logged.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log workpaper';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshComponents = async () => {
    if (mode !== 'live') {
      setComponents(demoComponents);
      setSelectedComponentId(demoComponents[0]?.id ?? '');
      return;
    }
    if (!orgId || !engagementId) return;
    const params = new URLSearchParams({ orgId, engagementId });
    const response = await fetch(`/api/group?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load group components');
    }
    const body = (await response.json()) as { components: GroupComponent[] };
    const normalised = normalizeComponents(body.components ?? []);
    setComponents(normalised);
    setSelectedComponentId((prev) => (normalised.some((component) => component.id === prev) ? prev : normalised[0]?.id ?? ''));
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Group components</h2>
        <p className="text-sm text-slate-600">
          Track component scoping, instructions, workpapers, and review status across the group audit.
        </p>
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
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
            <h3 className="text-sm font-semibold text-slate-900">Add component</h3>
            <form className="mt-3 space-y-3" onSubmit={handleCreateComponent}>
              <label className="flex flex-col text-xs text-slate-600">
                Name
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.name}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Country
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.country}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, country: event.target.value }))}
                  placeholder="ISO country"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Significance
                <select
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.significance}
                  onChange={(event) =>
                    setComponentForm((prev) => ({ ...prev, significance: event.target.value as GroupSignificance }))
                  }
                >
                  {significanceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Materiality
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.materiality}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, materiality: event.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Assigned firm
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.assignedFirm}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, assignedFirm: event.target.value }))}
                  placeholder="Component auditor"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Notes
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={componentForm.notes}
                  onChange={(event) => setComponentForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading || !componentForm.name}
              >
                {loading ? 'Working…' : 'Add component'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Send instruction</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleSendInstruction}>
                <label className="flex flex-col text-xs text-slate-600">
                  Instruction
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={instructionForm.title}
                    onChange={(event) => setInstructionForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Status
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={instructionForm.status}
                    onChange={(event) => setInstructionForm((prev) => ({ ...prev, status: event.target.value as GroupInstructionStatus }))}
                  >
                    {instructionStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Due date
                  <input
                    type="datetime-local"
                    className="mt-1 rounded border px-2 py-1"
                    value={instructionForm.dueAt}
                    onChange={(event) => setInstructionForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading || !instructionForm.title}
                >
                  {loading ? 'Working…' : 'Send instruction'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to draft an instruction.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Update review</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleUpdateReview}>
                <label className="flex flex-col text-xs text-slate-600">
                  Reviewer user ID
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={reviewForm.reviewerUserId}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewerUserId: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Review status
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={reviewForm.status}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, status: event.target.value as GroupReviewStatus }))}
                  >
                    {reviewStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={reviewForm.notes}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading || !reviewForm.reviewerUserId}
                >
                  {loading ? 'Working…' : 'Save review'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to update review status.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Log workpaper</h3>
            {selectedComponent ? (
              <form className="mt-3 space-y-3" onSubmit={handleUploadWorkpaper}>
                <label className="flex flex-col text-xs text-slate-600">
                  Storage bucket
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={workpaperForm.bucket}
                    onChange={(event) => setWorkpaperForm((prev) => ({ ...prev, bucket: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Object path
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={workpaperForm.path}
                    onChange={(event) => setWorkpaperForm((prev) => ({ ...prev, path: event.target.value }))}
                    placeholder="workpapers/filename.pdf"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Workpaper title
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={workpaperForm.name}
                    onChange={(event) => setWorkpaperForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Link instruction (optional)
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={workpaperForm.instructionId}
                    onChange={(event) => setWorkpaperForm((prev) => ({ ...prev, instructionId: event.target.value }))}
                  >
                    <option value="">Not linked</option>
                    {selectedComponent.instructions.map((instruction) => (
                      <option key={instruction.id} value={instruction.id}>
                        {instruction.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={workpaperForm.note}
                    onChange={(event) => setWorkpaperForm((prev) => ({ ...prev, note: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading || !workpaperForm.path || !workpaperForm.name}
                >
                  {loading ? 'Working…' : 'Log workpaper'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a component to attach workpapers.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Component register</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {components.map((component) => (
                <button
                  key={component.id}
                  type="button"
                  onClick={() => setSelectedComponentId(component.id)}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedComponentId === component.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{component.name}</span>
                    <span className="text-xs uppercase text-slate-500">{component.significance}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {component.country ?? 'Country n/a'} • Materiality {formatCurrency(component.materiality ?? 0)} • Workpapers {component.workpapers.length}
                  </div>
                </button>
              ))}
              {components.length === 0 && <p className="text-sm text-slate-500">No group components yet.</p>}
            </div>
          </div>

          {selectedComponent && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{selectedComponent.name}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedComponent.country ?? 'Country n/a'} • Assigned firm {selectedComponent.assigned_firm ?? 'n/a'} • Materiality
                      <span className="ml-1 font-semibold text-slate-700">{formatCurrency(selectedComponent.materiality ?? 0)}</span>
                    </p>
                  </div>
                </header>
                {selectedComponent.notes && <p className="text-xs text-slate-600">{selectedComponent.notes}</p>}
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Instructions</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Title</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.instructions.map((instruction) => (
                      <tr key={instruction.id} className="border-b last:border-0">
                        <td className="py-1">{instruction.title}</td>
                        <td className="py-1 text-slate-500">{instruction.status}</td>
                        <td className="py-1 text-slate-500">
                          {instruction.due_at ? new Date(instruction.due_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {selectedComponent.instructions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">
                          No instructions sent yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Workpapers</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Title</th>
                      <th className="py-1 text-left">Uploaded by</th>
                      <th className="py-1 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.workpapers.map((workpaper) => (
                      <tr key={workpaper.id} className="border-b last:border-0">
                        <td className="py-1">{workpaper.title}</td>
                        <td className="py-1 text-slate-500">{workpaper.uploaded_by_user_id ?? 'n/a'}</td>
                        <td className="py-1 text-slate-500">{workpaper.notes ?? '—'}</td>
                      </tr>
                    ))}
                    {selectedComponent.workpapers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">
                          No workpapers logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-slate-900">Review status</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Reviewer</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComponent.reviews.map((review) => (
                      <tr key={review.id} className="border-b last:border-0">
                        <td className="py-1">{review.reviewer_user_id ?? 'n/a'}</td>
                        <td className="py-1 text-slate-500">{review.status}</td>
                        <td className="py-1 text-slate-500">
                          {review.updated_at ? new Date(review.updated_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {selectedComponent.reviews.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2 text-center text-slate-500">
                          No review activity recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function normalizeComponents(records: any[]): GroupComponent[] {
  return (records ?? []).map((record) => ({
    ...record,
    materiality: record.materiality !== null ? Number(record.materiality) : null,
    instructions: (record.instructions ?? []).map((instruction: any) => ({
      ...instruction,
      due_at: instruction?.due_at ?? null,
    })),
    workpapers: (record.workpapers ?? []).map((workpaper: any) => ({
      ...workpaper,
      uploaded_at: workpaper.uploaded_at ?? new Date().toISOString(),
    })),
    reviews: (record.reviews ?? []).map((review: any) => ({
      ...review,
    })),
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
}
