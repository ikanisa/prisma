import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuditWorkspaceLayout } from './layout';

type OIDocStatus = 'UPLOADED' | 'IN_REVIEW' | 'READY_FOR_REVIEW' | 'ARCHIVED';
type OIFlagStatus = 'OPEN' | 'RESOLVED';
type OIFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

type OtherInformationFlag = {
  id: string;
  description: string;
  severity: OIFlagSeverity | string;
  status: OIFlagStatus | string;
  raised_by_user_id: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

type OtherInformationDoc = {
  id: string;
  org_id: string;
  engagement_id: string;
  title: string;
  summary: string | null;
  status: OIDocStatus | string;
  uploaded_at: string;
  uploaded_by_user_id: string | null;
  document_id: string | null;
  comparatives_consistent: boolean | null;
  comparatives_note: string | null;
  flags: OtherInformationFlag[];
};

type DocFormState = {
  title: string;
  summary: string;
  bucket: string;
  path: string;
  name: string;
};

type FlagFormState = {
  description: string;
  severity: OIFlagSeverity;
};

type ComparativesState = {
  priorPeriodConsistent: boolean;
  disclosuresConsistent: boolean;
  notes: string;
};

function normalizeDocuments(records: any[]): OtherInformationDoc[] {
  return (records ?? []).map((record) => ({
    ...record,
    flags: (record.flags ?? []).map((flag: any) => ({
      ...flag,
    })),
  }));
}

export default function OtherInformationWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [userId, setUserId] = useState('demo-user');

  const [documents, setDocuments] = useState<OtherInformationDoc[]>(demoDocuments);
  const [selectedDocId, setSelectedDocId] = useState<string>(demoDocuments[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>('Showing deterministic demo data.');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [docForm, setDocForm] = useState<DocFormState>({
    title: '',
    summary: '',
    bucket: 'other-information',
    path: '',
    name: '',
  });
  const [flagForm, setFlagForm] = useState<FlagFormState>({ description: '', severity: 'LOW' });
  const [resolveNote, setResolveNote] = useState('');
  const [comparatives, setComparatives] = useState<ComparativesState>({
    priorPeriodConsistent: true,
    disclosuresConsistent: true,
    notes: '',
  });

  const selectedDoc = useMemo(
    () => documents.find((doc) => doc.id === selectedDocId) ?? null,
    [documents, selectedDocId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setDocuments(demoDocuments);
      setSelectedDocId(demoDocuments[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull other information from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId) {
      setStatusMessage('Provide organisation and engagement identifiers to load live other information.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, engagementId });
        const response = await fetch(`/api/oi?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load other information documents');
        }
        const body = (await response.json()) as { documents: OtherInformationDoc[] };
        const normalised = normalizeDocuments(body.documents ?? []);
        setDocuments(normalised);
        setSelectedDocId((prev) => (normalised.some((doc) => doc.id === prev) ? prev : normalised[0]?.id ?? ''));
        setStatusMessage(normalised.length ? 'Other information loaded from Supabase.' : 'No other information documents yet.');
        setStatusTone(normalised.length ? 'success' : 'info');
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch other information';
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

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to upload documents.', 'error');
      return;
    }
    if (!orgId || !engagementId || !userId) {
      showStatus('Provide organisation, engagement, and user identifiers.', 'error');
      return;
    }
    if (!docForm.path || !docForm.name || !docForm.title) {
      showStatus('Provide title, object path, and filename.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/oi/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          userId,
          title: docForm.title,
          summary: docForm.summary || undefined,
          documentBucket: docForm.bucket,
          documentPath: docForm.path,
          documentName: docForm.name,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to upload other information');
      }
      await refreshDocs();
      showStatus('Other information document uploaded.', 'success');
      setDocForm({ title: '', summary: '', bucket: docForm.bucket, path: '', name: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload document';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlag = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to raise flags.', 'error');
      return;
    }
    if (!selectedDoc) {
      showStatus('Select a document first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/oi/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          documentId: selectedDoc.id,
          description: flagForm.description,
          severity: flagForm.severity,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to create flag');
      }
      setFlagForm({ description: '', severity: 'LOW' });
      await refreshDocs();
      showStatus('Flag raised for review.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to raise flag';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    if (mode !== 'live') {
      showStatus('Switch to live mode to resolve flags.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/oi/flag/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          flagId,
          resolutionNote: resolveNote || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to resolve flag');
      }
      setResolveNote('');
      await refreshDocs();
      showStatus('Flag resolved.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resolve flag';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComparatives = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to record comparatives.', 'error');
      return;
    }
    if (!selectedDoc) {
      showStatus('Select a document first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/oi/comparatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          documentId: selectedDoc.id,
          priorPeriodConsistent: comparatives.priorPeriodConsistent,
          disclosuresConsistent: comparatives.disclosuresConsistent,
          notes: comparatives.notes || undefined,
          userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to save comparatives');
      }
      await refreshDocs();
      showStatus('Comparatives assessment saved.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save comparatives';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshDocs = async () => {
    if (mode !== 'live') {
      setDocuments(demoDocuments);
      setSelectedDocId(demoDocuments[0]?.id ?? '');
      return;
    }
    const params = new URLSearchParams({ orgId, engagementId });
    const response = await fetch(`/api/oi?${params}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load other information documents');
    }
    const body = (await response.json()) as { documents: OtherInformationDoc[] };
    const normalised = normalizeDocuments(body.documents ?? []);
    setDocuments(normalised);
    setSelectedDocId((prev) => (normalised.some((doc) => doc.id === prev) ? prev : normalised[0]?.id ?? ''));
  };

  return (
    <AuditWorkspaceLayout>
      <section className="space-y-6">
        <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Other information</h2>
        <p className="text-sm text-slate-600">Track other information documents, exceptions, and comparatives checks before issuing the report.</p>
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
            <h3 className="text-sm font-semibold text-slate-900">Upload document</h3>
            <form className="mt-3 space-y-3" onSubmit={handleUpload}>
              <label className="flex flex-col text-xs text-slate-600">
                Title
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={docForm.title}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Summary
                <textarea
                  rows={2}
                  className="mt-1 rounded border px-2 py-1"
                  value={docForm.summary}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, summary: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Storage bucket
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={docForm.bucket}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, bucket: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Object path
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={docForm.path}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="other-info/annual-report.pdf"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                File name
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={docForm.name}
                  onChange={(event) => setDocForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Working…' : 'Upload document'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Raise flag</h3>
            {selectedDoc ? (
              <form className="mt-3 space-y-3" onSubmit={handleCreateFlag}>
                <label className="flex flex-col text-xs text-slate-600">
                  Description
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={flagForm.description}
                    onChange={(event) => setFlagForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Severity
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={flagForm.severity}
                    onChange={(event) => setFlagForm((prev) => ({ ...prev, severity: event.target.value as OIFlagSeverity }))}
                  >
                    {['LOW', 'MEDIUM', 'HIGH'].map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading || !flagForm.description}
                >
                  {loading ? 'Working…' : 'Raise flag'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a document to raise a flag.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Comparatives check</h3>
            {selectedDoc ? (
              <form className="mt-3 space-y-3" onSubmit={handleSaveComparatives}>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={comparatives.priorPeriodConsistent}
                    onChange={(event) => setComparatives((prev) => ({ ...prev, priorPeriodConsistent: event.target.checked }))}
                  />
                  Prior-period information consistent
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={comparatives.disclosuresConsistent}
                    onChange={(event) => setComparatives((prev) => ({ ...prev, disclosuresConsistent: event.target.checked }))}
                  />
                  Disclosures aligned to financial statements
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Notes
                  <textarea
                    rows={2}
                    className="mt-1 rounded border px-2 py-1"
                    value={comparatives.notes}
                    onChange={(event) => setComparatives((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Working…' : 'Save comparatives'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a document to record comparatives.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Document register</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedDocId === doc.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{doc.title}</span>
                    <span className="text-xs uppercase text-slate-500">{doc.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Flags {doc.flags.filter((flag) => flag.status === 'OPEN').length} • Comparatives {formatBoolean(doc.comparatives_consistent)}</div>
                </button>
              ))}
              {documents.length === 0 && <p className="text-sm text-slate-500">No other information documents yet.</p>}
            </div>
          </div>

          {selectedDoc && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
                <h4 className="text-lg font-semibold text-slate-900">{selectedDoc.title}</h4>
                {selectedDoc.summary && <p className="text-xs text-slate-600">{selectedDoc.summary}</p>}
                <p className="text-xs text-slate-500">Uploaded by {selectedDoc.uploaded_by_user_id ?? 'n/a'} on {new Date(selectedDoc.uploaded_at).toLocaleString()}</p>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <header className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-slate-900">Flags</h5>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-48 rounded border px-2 py-1 text-xs"
                      placeholder="Resolution note"
                      value={resolveNote}
                      onChange={(event) => setResolveNote(event.target.value)}
                    />
                  </div>
                </header>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Description</th>
                      <th className="py-1 text-left">Severity</th>
                      <th className="py-1 text-left">Status</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.flags.map((flag) => (
                      <tr key={flag.id} className="border-b last:border-0">
                        <td className="py-1">{flag.description}</td>
                        <td className="py-1 text-slate-500">{flag.severity}</td>
                        <td className="py-1 text-slate-500">{flag.status}</td>
                        <td className="py-1 text-right">
                          {flag.status === 'OPEN' && (
                            <button
                              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                              onClick={() => void handleResolveFlag(flag.id)}
                              disabled={loading}
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {selectedDoc.flags.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-slate-500">
                          No flags raised.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2 text-xs text-slate-600">
                <p>
                  Comparatives consistent with financial statements:{' '}
                  <span className="font-semibold text-slate-900">{formatBoolean(selectedDoc.comparatives_consistent)}</span>
                </p>
                {selectedDoc.comparatives_note && <p>Notes: {selectedDoc.comparatives_note}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
    </AuditWorkspaceLayout>
  );
}

const demoDocuments: OtherInformationDoc[] = [
  {
    id: 'oi-demo-1',
    org_id: 'demo-org',
    engagement_id: 'demo-engagement',
    title: 'Annual report 2024',
    summary: 'Draft annual report shared by management for ISA 720 review.',
    status: 'IN_REVIEW',
    uploaded_at: new Date().toISOString(),
    uploaded_by_user_id: 'demo-user',
    document_id: null,
    comparatives_consistent: true,
    comparatives_note: 'Comparatives agree to prior year FS.',
    flags: [
      {
        id: 'flag-demo-1',
        description: 'MD&A references revenue growth of 25% (FS shows 22%).',
        severity: 'MEDIUM',
        status: 'OPEN',
        raised_by_user_id: 'demo-user',
        resolved_by_user_id: null,
        resolved_at: null,
        resolution_note: null,
      },
    ],
  },
];

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return 'n/a';
  return value ? 'Yes' : 'No';
}
