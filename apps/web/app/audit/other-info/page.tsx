'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  COMPARATIVE_STATUSES,
  DEFAULT_COMPARATIVE_CHECKS,
  FLAG_CATEGORIES,
  FLAG_SEVERITIES,
} from '@/lib/other-info';

type OtherInfoDocument = {
  id: string;
  title: string;
  status: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  uploaded_at: string;
  uploaded_by: string | null;
};

type OiFlag = {
  id: string;
  org_id: string;
  engagement_id: string;
  document_id: string | null;
  category: string;
  severity: string;
  status: string;
  description: string;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
};

type ComparativeCheck = {
  id: string;
  check_key: string;
  assertion: string;
  status: string;
  notes: string | null;
  linked_flag_id: string | null;
};

interface ApiError {
  error: string;
}

export default function OtherInformationWorkspace() {
  const [orgId, setOrgId] = useState('');
  const [engagementId, setEngagementId] = useState('');
  const [actorId, setActorId] = useState('');

  const [documents, setDocuments] = useState<OtherInfoDocument[]>([]);
  const [flags, setFlags] = useState<OiFlag[]>([]);
  const [checks, setChecks] = useState<ComparativeCheck[]>([]);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [reportPreview, setReportPreview] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const readyForActions = Boolean(orgId && engagementId && actorId);

  const selectedDocument = useMemo(() => {
    if (!selectedDocId) {
      return null;
    }
    return documents.find((doc) => doc.id === selectedDocId) ?? null;
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocId(null);
      return;
    }

    if (!selectedDocId || !documents.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const handleApiResponse = async <T,>(response: Response): Promise<T> => {
    if (!response.ok) {
      let message = response.statusText;
      try {
        const body = (await response.json()) as ApiError;
        if (body?.error) {
          message = body.error;
        }
      } catch {
        // ignore JSON parsing failure and fall back to status text
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  };

  const fetchDocuments = useCallback(async () => {
    if (!orgId || !engagementId) {
      setDocuments([]);
      return;
    }

    const response = await fetch(
      `/api/other-info/documents?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
    );
    const body = await handleApiResponse<{ documents: OtherInfoDocument[] }>(response);
    setDocuments(body.documents ?? []);
  }, [orgId, engagementId]);

  const fetchFlags = useCallback(async () => {
    if (!orgId || !engagementId) {
      setFlags([]);
      return;
    }

    const response = await fetch(
      `/api/other-info/flags?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
    );
    const body = await handleApiResponse<{ flags: OiFlag[] }>(response);
    setFlags(body.flags ?? []);
  }, [orgId, engagementId]);

  const fetchComparatives = useCallback(async () => {
    if (!orgId || !engagementId) {
      setChecks([]);
      return;
    }

    const response = await fetch(
      `/api/other-info/comparatives?orgId=${encodeURIComponent(orgId)}&engagementId=${encodeURIComponent(engagementId)}`,
    );
    const body = await handleApiResponse<{ checks: ComparativeCheck[] }>(response);
    setChecks(body.checks ?? []);
  }, [orgId, engagementId]);

  useEffect(() => {
    if (!orgId || !engagementId) {
      return;
    }

    setErrorMessage(null);
    Promise.all([fetchDocuments(), fetchFlags(), fetchComparatives()]).catch((error) => {
      setErrorMessage(error.message);
    });
  }, [orgId, engagementId, fetchDocuments, fetchFlags, fetchComparatives]);

  const resetMessages = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDocumentUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!readyForActions) {
      setErrorMessage('Set organisation, engagement, and actor identifiers before uploading.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const hasFile = formData.get('file');
    if (!hasFile) {
      setErrorMessage('Select a file to upload.');
      return;
    }

    formData.append('orgId', orgId);
    formData.append('engagementId', engagementId);
    formData.append('actorId', actorId);

    setIsUploading(true);
    try {
      const response = await fetch('/api/other-info/documents', {
        method: 'POST',
        body: formData,
      });
      await handleApiResponse(response);
      setStatusMessage('Document uploaded successfully.');
      (event.target as HTMLFormElement).reset();
      await fetchDocuments();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFlag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!readyForActions) {
      setErrorMessage('Set organisation, engagement, and actor identifiers before creating a flag.');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const description = String(formData.get('description') ?? '').trim();
    const category = String(formData.get('category') ?? FLAG_CATEGORIES[0]);
    const severity = String(formData.get('severity') ?? 'medium');
    const documentId = String(formData.get('documentId') ?? '');

    if (!description) {
      setErrorMessage('Provide a flag description.');
      return;
    }

    setIsSubmittingFlag(true);
    try {
      const response = await fetch('/api/other-info/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          engagementId,
          actorId,
          description,
          category,
          severity,
          documentId: documentId || null,
        }),
      });
      await handleApiResponse(response);
      form.reset();
      setStatusMessage('Flag created.');
      await fetchFlags();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  const resolveFlag = async (flagId: string) => {
    if (!readyForActions) {
      setErrorMessage('Set organisation, engagement, and actor identifiers before updating flags.');
      return;
    }

    resetMessages();
    try {
      const response = await fetch('/api/other-info/flags', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          actorId,
          flagId,
          status: 'resolved',
        }),
      });
      await handleApiResponse(response);
      setStatusMessage('Flag marked as resolved.');
      await fetchFlags();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const updateCheckStatus = async (check: ComparativeCheck, status: string) => {
    if (!readyForActions) {
      setErrorMessage('Set organisation, engagement, and actor identifiers before updating the checklist.');
      return;
    }

    resetMessages();
    try {
      const response = await fetch('/api/other-info/comparatives', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          actorId,
          checkId: check.id,
          status,
        }),
      });
      const body = await handleApiResponse<{ check: ComparativeCheck }>(response);
      setChecks((previous) => previous.map((item) => (item.id === body.check.id ? body.check : item)));
      setStatusMessage('Comparative checklist updated.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const updateCheckNotes = async (check: ComparativeCheck, notes: string) => {
    if (!readyForActions) {
      return;
    }

    try {
      const response = await fetch('/api/other-info/comparatives', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          actorId,
          checkId: check.id,
          notes,
        }),
      });
      const body = await handleApiResponse<{ check: ComparativeCheck }>(response);
      setChecks((previous) => previous.map((item) => (item.id === body.check.id ? body.check : item)));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const generateReportPreview = async () => {
    if (!readyForActions) {
      setErrorMessage('Set organisation, engagement, and actor identifiers before exporting.');
      return;
    }

    resetMessages();
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/other-info/report-wording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId, engagementId, actorId }),
      });
      const body = await handleApiResponse<{
        reportText: string;
        documents: OtherInfoDocument[];
        flags: OiFlag[];
        checks: ComparativeCheck[];
      }>(response);
      setReportPreview(body.reportText);
      setDocuments(body.documents ?? []);
      setFlags(body.flags ?? []);
      setChecks(body.checks ?? []);
      setStatusMessage('Report wording generated.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const comparativesFallback = useMemo(() => {
    if (checks.length > 0) {
      return [];
    }

    return DEFAULT_COMPARATIVE_CHECKS.map((item) => ({
      id: item.key,
      check_key: item.key,
      assertion: item.assertion,
      status: 'pending',
      notes: null,
      linked_flag_id: null,
    }));
  }, [checks]);

  return (
    <main className="p-6 space-y-8" aria-labelledby="other-information-heading">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 id="other-information-heading" className="text-2xl font-semibold text-gray-900">
              Other Information review
            </h1>
            <p className="text-sm text-gray-600">
              Track ISA 720 other information artefacts, reviewer flags, and ISA 710 comparative procedures.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3" role="group" aria-labelledby="context-heading">
          <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="org-id-input">
            Organisation ID
            <input
              id="org-id-input"
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value.trim())}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="engagement-id-input">
            Engagement ID
            <input
              id="engagement-id-input"
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Engagement UUID"
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value.trim())}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="actor-id-input">
            Actor (user) ID
            <input
              id="actor-id-input"
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reviewer UUID"
              value={actorId}
              onChange={(event) => setActorId(event.target.value.trim())}
            />
          </label>
        </div>

        {(statusMessage || errorMessage) && (
          <div className="mt-4">
            {statusMessage && (
              <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-5" aria-labelledby="documents-heading">
        <div className="lg:col-span-3 space-y-6">
          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="documents-heading" className="text-xl font-semibold text-gray-900">
                  Other information documents
                </h2>
                <p className="text-sm text-gray-600">
                  Upload narrative reports, management commentary, or other ISA 720 artefacts.
                </p>
              </div>
              <span className="text-sm text-gray-500">{documents.length} document(s)</span>
            </header>

            <form className="space-y-3" onSubmit={handleDocumentUpload}>
              <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="document-title-input">
                Title (optional)
                <input
                  id="document-title-input"
                  name="title"
                  className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Annual report 2024 narrative"
                  disabled={!readyForActions}
                />
              </label>
              <input
                type="file"
                name="file"
                aria-label="Upload other information document"
                className="w-full text-sm"
                disabled={!readyForActions}
                required
              />
              <Button type="submit" disabled={!readyForActions || isUploading}>
                {isUploading ? 'Uploading…' : 'Upload document'}
              </Button>
            </form>

            <ul className="mt-6 space-y-2" role="list">
              {documents.length === 0 && (
                <li className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  No documents uploaded yet.
                </li>
              )}
              {documents.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                const meta = (doc.metadata ?? {}) as Record<string, unknown>;
                const pageCount = typeof meta.pageCount === 'number' ? `${meta.pageCount} pages` : undefined;
                const sizeKb = typeof doc.file_size === 'number' ? `${(doc.file_size / 1024).toFixed(1)} KB` : undefined;

                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                      }`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{doc.title}</span>
                        <span className="text-xs uppercase tracking-wide text-gray-500">{doc.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {pageCount ? `${pageCount} • ` : ''}
                        {sizeKb ? `${sizeKb} • ` : ''}
                        {doc.mime_type || 'Unknown type'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-live="polite">
            <h3 className="text-lg font-semibold text-gray-900">Document details</h3>
            {selectedDocument ? (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div>
                  <dt className="font-medium text-gray-600">Title</dt>
                  <dd>{selectedDocument.title}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Status</dt>
                  <dd className="capitalize">{selectedDocument.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Checksum</dt>
                  <dd className="break-all text-xs text-gray-500">{selectedDocument.checksum ?? 'n/a'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Storage path</dt>
                  <dd className="break-all text-xs text-gray-500">{selectedDocument.storage_path}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Metadata</dt>
                  <dd className="text-xs text-gray-500">
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedDocument.metadata ?? {}, null, 2)}
                    </pre>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Select a document to view its metadata.</p>
            )}
          </article>
        </div>

        <article className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="flags-heading">
          <header className="mb-4">
            <h2 id="flags-heading" className="text-xl font-semibold text-gray-900">
              Reviewer flags
            </h2>
            <p className="text-sm text-gray-600">
              Capture inconsistencies, omissions, or presentation issues identified during ISA 720 review.
            </p>
          </header>

          <form className="space-y-3" onSubmit={handleCreateFlag}>
            <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="flag-document">
              Related document
              <select
                id="flag-document"
                name="documentId"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={!readyForActions || documents.length === 0}
                defaultValue={selectedDocId ?? ''}
              >
                <option value="">(not linked)</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="flag-category">
              Category
              <select
                id="flag-category"
                name="category"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={!readyForActions}
              >
                {FLAG_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="flag-severity">
              Severity
              <select
                id="flag-severity"
                name="severity"
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                defaultValue="medium"
                disabled={!readyForActions}
              >
                {FLAG_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700" htmlFor="flag-description">
              Description
              <textarea
                id="flag-description"
                name="description"
                className="mt-1 min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Outline the inconsistency or issue identified"
                required
                disabled={!readyForActions}
              />
            </label>
            <Button type="submit" disabled={!readyForActions || isSubmittingFlag}>
              {isSubmittingFlag ? 'Creating flag…' : 'Create flag'}
            </Button>
          </form>

          <ul className="mt-6 space-y-3" role="list">
            {flags.length === 0 && (
              <li className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No reviewer flags recorded.
              </li>
            )}
            {flags.map((flag) => (
              <li key={flag.id} className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{flag.category}</p>
                    <p className="text-xs text-gray-500">
                      Severity: {flag.severity} • Status: {flag.status}
                    </p>
                  </div>
                  {flag.status !== 'resolved' && (
                    <Button variant="outline" size="sm" onClick={() => resolveFlag(flag.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-700">{flag.description}</p>
                {flag.resolution_notes && (
                  <p className="mt-2 text-xs text-gray-500">Resolution: {flag.resolution_notes}</p>
                )}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-5" aria-labelledby="comparatives-heading">
        <article className="lg:col-span-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="comparatives-heading" className="text-xl font-semibold text-gray-900">
                ISA 710 comparatives checklist
              </h2>
              <p className="text-sm text-gray-600">
                Document the reconciliation of comparative figures across narrative and financial sections.
              </p>
            </div>
            <span className="text-sm text-gray-500">{checks.length || comparativesFallback.length} item(s)</span>
          </header>

          <div className="space-y-4">
            {(checks.length > 0 ? checks : comparativesFallback).map((check) => (
              <div key={check.id} className="rounded-md border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900">{check.assertion}</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <label className="text-xs uppercase tracking-wide text-gray-500">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-48"
                      value={check.status}
                      onChange={(event) => updateCheckStatus(check, event.target.value)}
                      disabled={!readyForActions || checks.length === 0}
                    >
                      {COMPARATIVE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 text-xs uppercase tracking-wide text-gray-500 md:pl-4">
                    Notes
                    <textarea
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={check.notes ?? ''}
                      placeholder="Evidence references or observations"
                      onBlur={(event) => updateCheckNotes(check, event.target.value)}
                      disabled={!readyForActions || checks.length === 0}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="report-heading">
          <header className="mb-4">
            <h2 id="report-heading" className="text-xl font-semibold text-gray-900">
              Push to audit report
            </h2>
            <p className="text-sm text-gray-600">
              Generate suggested wording for the Other Information section of the auditor&apos;s report.
            </p>
          </header>

          <Button onClick={generateReportPreview} disabled={!readyForActions || isGeneratingReport}>
            {isGeneratingReport ? 'Generating…' : 'Generate report wording'}
          </Button>

          <textarea
            aria-label="Report wording preview"
            className="mt-4 h-64 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={reportPreview}
            onChange={(event) => setReportPreview(event.target.value)}
            placeholder="Generated report wording will appear here."
          />
        </article>
      </section>
    </main>
  );
}
