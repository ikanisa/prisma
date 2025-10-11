'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ApprovalItem = {
  id: string;
  orgId: string;
  kind: string;
  stage: string;
  status: string;
  requestedAt: string;
  requestedByUserId: string | null;
  approvedByUserId: string | null;
  decisionAt: string | null;
  decisionComment: string | null;
  sessionId: string | null;
  actionId: string | null;
  toolKey?: string;
  description?: string;
  orgSlug?: string;
  standards?: string[];
  evidenceCount?: number;
  context: Record<string, unknown>;
};

type ApprovalsResponse = {
  pending: ApprovalItem[];
  history: ApprovalItem[];
};

type ToolRegistryRow = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  minRole: string;
  sensitive: boolean;
  enabled: boolean;
  standardsRefs: string[];
  orgId: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
};

type ToolsResponse = {
  tools: ToolRegistryRow[];
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return DATE_FORMAT.format(new Date(value));
  } catch {
    return value;
  }
}

export default function AgentApprovalsPage() {
  const [orgId, setOrgId] = useState<string>('');
  const [pending, setPending] = useState<ApprovalItem[]>([]);
  const [history, setHistory] = useState<ApprovalItem[]>([]);
  const [tools, setTools] = useState<ToolRegistryRow[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState<Record<string, string>>({});
  const [submittingDecisionId, setSubmittingDecisionId] = useState<string | null>(null);

  const hasOrgId = orgId.trim().length > 0;

  const activeOrgLabel = useMemo(() => {
    if (!hasOrgId) return 'Unset';
    return orgId.trim();
  }, [hasOrgId, orgId]);

  const loadApprovals = useCallback(async () => {
    if (!hasOrgId) {
      setPending([]);
      setHistory([]);
      return;
    }
    setIsLoadingApprovals(true);
    setError(null);
    try {
      const params = new URLSearchParams({ orgId: orgId.trim() });
      const response = await fetch(`/api/agent/approvals?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to fetch approvals');
      }
      const body = (await response.json()) as ApprovalsResponse;
      setPending(body.pending);
      setHistory(body.history);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch approvals';
      setError(message);
      setPending([]);
      setHistory([]);
    } finally {
      setIsLoadingApprovals(false);
    }
  }, [hasOrgId, orgId]);

  const loadTools = useCallback(async () => {
    setIsLoadingTools(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (hasOrgId) {
        params.set('orgId', orgId.trim());
      }
      const response = await fetch(`/api/agent/tool-registry?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to fetch tool registry');
      }
      const body = (await response.json()) as ToolsResponse;
      setTools(body.tools);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tool registry';
      setError(message);
      setTools([]);
    } finally {
      setIsLoadingTools(false);
    }
  }, [hasOrgId, orgId]);

  useEffect(() => {
    if (hasOrgId) {
      void loadApprovals();
    }
  }, [hasOrgId, loadApprovals]);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const toggleToolEnabled = useCallback(async (tool: ToolRegistryRow) => {
    setIsLoadingTools(true);
    setError(null);
    try {
      const response = await fetch('/api/agent/tool-registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tool.id, enabled: !tool.enabled }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to update tool status');
      }
      await loadTools();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tool';
      setError(message);
    } finally {
      setIsLoadingTools(false);
    }
  }, [loadTools]);

  const submitDecision = useCallback(
    async (approval: ApprovalItem, decision: 'APPROVED' | 'CHANGES_REQUESTED') => {
      setSubmittingDecisionId(approval.id);
      setError(null);
      const comment = decisionComment[approval.id]?.trim() ?? '';
      try {
        const response = await fetch(`/api/agent/approvals/${approval.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            comment: comment.length > 0 ? comment : undefined,
            orgSlug: approval.orgSlug ?? null,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to submit decision (${response.status})`);
        }
        setDecisionComment((prev) => ({ ...prev, [approval.id]: '' }));
        await loadApprovals();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit decision';
        setError(message);
      } finally {
        setSubmittingDecisionId(null);
      }
    },
    [decisionComment, loadApprovals],
  );

  const pendingAgentActions = pending.filter((item) => item.kind === 'AGENT_ACTION');

  return (
    <main className="space-y-8 p-6" aria-labelledby="agent-approvals-heading">
      <header className="space-y-2">
        <h1 id="agent-approvals-heading" className="text-2xl font-semibold">
          Agent Approvals Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor pending agent tool approvals and manage the tool registry to enforce human-in-the-loop guardrails.
        </p>
        <div className="flex flex-wrap gap-3" aria-label="Context controls">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Organisation ID</span>
            <input
              type="text"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              placeholder="org UUID"
              className="rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              void loadApprovals();
              void loadTools();
            }}
            className="rounded-md border px-3 py-2 text-sm shadow-sm hover:bg-muted"
          >
            Refresh
          </button>
          <Link className="text-sm text-blue-600 underline" href="/">
            Back to index
          </Link>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <dt className="text-xs uppercase text-muted-foreground">Active Org</dt>
            <dd className="text-lg font-semibold">{activeOrgLabel}</dd>
          </div>
          <div className="rounded-lg border p-4">
            <dt className="text-xs uppercase text-muted-foreground">Pending approvals</dt>
            <dd className="text-lg font-semibold">{pending.length}</dd>
          </div>
          <div className="rounded-lg border p-4">
            <dt className="text-xs uppercase text-muted-foreground">Agent actions awaiting review</dt>
            <dd className="text-lg font-semibold">{pendingAgentActions.length}</dd>
          </div>
        </dl>
        {error ? (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="tool-registry-heading" className="rounded-lg border p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="tool-registry-heading" className="text-lg font-semibold">
              Tool Registry
            </h2>
            <p className="text-sm text-muted-foreground">
              Toggle sensitive tools and review minimum role thresholds that trigger human approvals.
            </p>
          </div>
          {isLoadingTools ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Min Role</th>
                <th className="px-3 py-2 font-medium">Sensitive</th>
                <th className="px-3 py-2 font-medium">Standards</th>
                <th className="px-3 py-2 font-medium">Enabled</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tools.map((tool) => (
                <tr key={tool.id}>
                  <td className="px-3 py-2 font-mono text-xs">{tool.key}</td>
                  <td className="px-3 py-2">{tool.label ?? '—'}</td>
                  <td className="px-3 py-2">{tool.minRole}</td>
                  <td className="px-3 py-2">{tool.sensitive ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {tool.standardsRefs.length > 0 ? tool.standardsRefs.join(', ') : '—'}
                  </td>
                  <td className="px-3 py-2">{tool.enabled ? 'Enabled' : 'Disabled'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {tool.orgId ? 'Org-specific' : 'Global'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleToolEnabled(tool)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {tool.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {hasOrgId
                      ? 'No tool registry entries found for this organisation yet.'
                      : 'Provide an organisation ID to scope tool registry settings.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pending-approvals-heading" className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 id="pending-approvals-heading" className="text-lg font-semibold">
            Pending Approvals
          </h2>
          {isLoadingApprovals ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          The list includes all approval queue entries for the selected organisation. Agent actions display additional
          context such as tool key, captured evidence, and session references.
        </p>
        <div className="mt-4 space-y-4">
          {pending.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-sm">No approvals pending review.</p>
          ) : null}
          {pending.map((approval) => (
            <article key={approval.id} className="rounded-lg border p-4" aria-labelledby={`approval-${approval.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`approval-${approval.id}`} className="text-base font-semibold">
                  {approval.kind}
                </h3>
                <span className="rounded-full border px-2 py-1 text-xs font-medium">
                  Stage: {approval.stage}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Requested</dt>
                  <dd className="text-sm">{formatDate(approval.requestedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Requested by</dt>
                  <dd className="text-sm">{approval.requestedByUserId ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Tool Key</dt>
                  <dd className="text-sm">{approval.toolKey ?? 'n/a'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Session</dt>
                  <dd className="text-sm">{approval.sessionId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Action</dt>
                  <dd className="text-sm">{approval.actionId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Standards</dt>
                  <dd className="text-sm">
                    {approval.standards && approval.standards.length > 0
                      ? approval.standards.join(', ')
                      : '—'}
                  </dd>
                </div>
              </dl>
              {approval.description ? (
                <p className="mt-3 text-sm text-muted-foreground">{approval.description}</p>
              ) : null}
              <div className="mt-4 space-y-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span>Decision comment (optional)</span>
                  <textarea
                    className="min-h-[80px] rounded-md border px-3 py-2 text-sm"
                    value={decisionComment[approval.id] ?? ''}
                    onChange={(event) =>
                      setDecisionComment((prev) => ({ ...prev, [approval.id]: event.target.value }))
                    }
                    placeholder="Document reviewer reasoning or evidence references"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-green-500 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void submitDecision(approval, 'APPROVED')}
                    disabled={submittingDecisionId === approval.id}
                  >
                    {submittingDecisionId === approval.id ? 'Submitting…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-amber-500 px-3 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void submitDecision(approval, 'CHANGES_REQUESTED')}
                    disabled={submittingDecisionId === approval.id}
                  >
                    {submittingDecisionId === approval.id ? 'Submitting…' : 'Request changes'}
                  </button>
                </div>
              </div>
              <details className="mt-3 rounded border bg-muted/40 p-3">
                <summary className="cursor-pointer text-sm font-medium">View raw context</summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-white p-3 text-xs">
                  {JSON.stringify(approval.context, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="history-heading" className="rounded-lg border p-4">
        <h2 id="history-heading" className="text-lg font-semibold">
          Recent Decisions
        </h2>
        <p className="text-sm text-muted-foreground">
          A trailing view of the latest 25 approvals for the selected organisation.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Reviewer</th>
                <th className="px-3 py-2 font-medium">Decision At</th>
                <th className="px-3 py-2 font-medium">Comment</th>
                <th className="px-3 py-2 font-medium">Tool Key</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.slice(0, 25).map((approval) => (
                <tr key={approval.id}>
                  <td className="px-3 py-2">{approval.kind}</td>
                  <td className="px-3 py-2">{approval.status}</td>
                  <td className="px-3 py-2">{approval.approvedByUserId ?? '—'}</td>
                  <td className="px-3 py-2">{formatDate(approval.decisionAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {approval.decisionComment ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{approval.toolKey ?? '—'}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No previous approval decisions captured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
