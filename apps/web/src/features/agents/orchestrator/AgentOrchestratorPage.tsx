'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@prisma-glow/ui';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  buildCreateSessionPayload,
  constraintsFromInput,
  useCompleteTaskMutation,
  useCreateSessionMutation,
  useDomainAgentsQuery,
  useGeneratePlanMutation,
  useSessionBoardQuery,
  useSessionsQuery,
} from './hooks';
import { useOrchestratorStore } from './store';
import type { OrchestrationTaskStatus } from '@prisma-glow/api-client';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const TASK_STATUS_OPTIONS: OrchestrationTaskStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  try {
    return DATE_FORMAT.format(new Date(value));
  } catch {
    return value;
  }
}

function OrchestratorContent() {
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);
  const {
    orgSlug,
    setOrgSlug,
    objective,
    setObjective,
    engagementId,
    setEngagementId,
    priority,
    setPriority,
    constraintsInput,
    setConstraintsInput,
    metadataJson,
    setMetadataJson,
    directorAgentKey,
    setDirectorAgentKey,
    safetyAgentKey,
    setSafetyAgentKey,
    includePlanTasks,
    setIncludePlanTasks,
    planPreview,
    selectedSessionId,
    setSelectedSessionId,
    taskUpdates,
    setTaskUpdate,
    taskUpdateInFlight,
  } = useOrchestratorStore();

  const constraints = useMemo(() => constraintsFromInput(constraintsInput), [constraintsInput]);

  const agentsQuery = useDomainAgentsQuery();
  const sessionsQuery = useSessionsQuery(orgSlug);
  const boardQuery = useSessionBoardQuery(selectedSessionId);
  const planMutation = useGeneratePlanMutation();
  const createSessionMutation = useCreateSessionMutation();
  const completeTaskMutation = useCompleteTaskMutation(selectedSessionId);

  if (agentsQuery.error) {
    throw agentsQuery.error;
  }
  if (sessionsQuery.error) {
    throw sessionsQuery.error;
  }
  if (boardQuery.error) {
    throw boardQuery.error;
  }

  const agents = agentsQuery.data?.agents ?? [];
  const trimmedOrgSlug = orgSlug.trim();
  const trimmedObjective = objective.trim();
  const board = boardQuery.data ?? null;
  const sessions = sessionsQuery.data?.sessions ?? [];
  const latestSessionStatus = board?.session?.status ?? null;

  const handleGeneratePlan = () => {
    if (!trimmedOrgSlug || !trimmedObjective) return;
    planMutation.mutate({
      orgSlug: trimmedOrgSlug,
      objective: trimmedObjective,
      priority,
      constraints: constraints.length ? constraints : undefined,
    });
  };

  const handleCreateSession = () => {
    setCreateSessionError(null);
    if (!trimmedOrgSlug || !trimmedObjective) return;
    try {
      const payload = buildCreateSessionPayload(trimmedOrgSlug, {
        objective,
        engagementId,
        directorAgentKey,
        safetyAgentKey,
        metadataJson,
        includePlanTasks,
        planPreview,
      });
      createSessionMutation.mutate(payload, {
        onError: (error) => {
          setCreateSessionError(error instanceof Error ? error.message : 'Failed to create session');
        },
      });
    } catch (error) {
      setCreateSessionError(error instanceof Error ? error.message : 'Session metadata JSON is invalid');
    }
  };

  const handleUpdateTaskStatus = (taskId: string) => {
    const status = taskUpdates[taskId];
    if (!status) return;
    setCreateSessionError(null);
    completeTaskMutation.mutate({ taskId, status }, {
      onError: (error) => {
        setCreateSessionError(error instanceof Error ? error.message : 'Failed to update task');
      },
    });
  };

  return (
    <main className="space-y-8 p-6" aria-labelledby="orchestrator-heading">
      <header className="space-y-2">
        <h1 id="orchestrator-heading" className="text-2xl font-semibold">
          Agent Orchestrator Console
        </h1>
        <p className="text-sm text-neutral-500">
          Experiment with multi-agent orchestration sessions managed by the Director and Safety agents. Use this console to
          preview plans, create sessions, inspect task boards, and forward status updates back to the MCP hub.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-100 p-4" aria-labelledby="plan-preview-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="plan-preview-heading" className="text-lg font-semibold">
              Plan Preview
            </h2>
            <p className="text-sm text-neutral-500">
              Generate a draft orchestration plan for the supplied objective before instantiating a session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={planMutation.isPending || !trimmedOrgSlug || !trimmedObjective}
            className="rounded-md border border-brand-500 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {planMutation.isPending ? 'Generating…' : 'Generate plan'}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Organisation slug
            <input
              value={orgSlug}
              onChange={(event) => setOrgSlug(event.target.value)}
              className="rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="org-slug"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Engagement ID (optional)
            <input
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              className="rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="engagement-uuid"
            />
          </label>
        </div>
        <div className="mt-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Objective
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="min-h-[64px] rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Coordinate FY24 audit automation"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
              className="rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Constraints (one per line)
            <textarea
              value={constraintsInput}
              onChange={(event) => setConstraintsInput(event.target.value)}
              className="min-h-[80px] rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={'Soft deadline: FY24 audit close\nEscalate: manual approvals'}
            />
          </label>
        </div>
        {planMutation.isError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {planMutation.error instanceof Error ? planMutation.error.message : 'Failed to generate plan'}
          </p>
        ) : null}
        <div className="mt-6 space-y-3">
          {planMutation.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : planPreview ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-600">Suggested tasks ({planPreview.tasks.length})</h3>
              <ol className="space-y-3 text-sm">
                {planPreview.tasks.map((task) => (
                  <li key={task.id} className="rounded-md border border-neutral-200 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-neutral-800">{task.title}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs uppercase text-neutral-500">
                        {task.agentKey}
                      </span>
                    </div>
                    <p className="mt-2 text-neutral-600">{task.description}</p>
                    <p className="mt-1 text-xs text-neutral-400">Requires review: {task.requiresHumanReview ? 'Yes' : 'No'}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Generate a plan to preview recommended tasks before creating a session.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-100 p-4" aria-labelledby="session-create-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="session-create-heading" className="text-lg font-semibold">
              Session Payload
            </h2>
            <p className="text-sm text-neutral-500">
              Configure optional metadata for the orchestration session before instantiating it.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateSession}
            disabled={createSessionMutation.isPending || !trimmedOrgSlug || !trimmedObjective}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-glass transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createSessionMutation.isPending ? 'Creating…' : 'Create session'}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={includePlanTasks}
              onChange={(event) => setIncludePlanTasks(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Include plan tasks in session payload
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Session metadata (JSON)
            <textarea
              value={metadataJson}
              onChange={(event) => setMetadataJson(event.target.value)}
              className="min-h-[80px] rounded-md border border-neutral-200 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={'{\n  "autonomyThreshold": "medium"\n}'}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Director agent key (optional)
            <input
              value={directorAgentKey}
              onChange={(event) => setDirectorAgentKey(event.target.value)}
              className="rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="director.core"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Safety agent key (optional)
            <input
              value={safetyAgentKey}
              onChange={(event) => setSafetyAgentKey(event.target.value)}
              className="rounded-md border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="safety.core"
            />
          </label>
        </div>
        {createSessionError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {createSessionError}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-neutral-100 p-4" aria-labelledby="sessions-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="sessions-heading" className="text-lg font-semibold">
              Sessions ({sessions.length})
            </h2>
            <p className="text-sm text-neutral-500">
              Load recent sessions for the organisation and select one to inspect its task board.
            </p>
          </div>
          <button
            type="button"
            onClick={() => sessionsQuery.refetch()}
            disabled={sessionsQuery.isFetching || !trimmedOrgSlug}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sessionsQuery.isFetching ? 'Loading…' : 'Refresh sessions'}
          </button>
        </div>
        {sessionsQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead>
                <tr className="bg-neutral-25 text-left">
                  <th className="px-3 py-2 font-medium">Session ID</th>
                  <th className="px-3 py-2 font-medium">Objective</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium" aria-label="Select" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sessions.map((session) => (
                  <tr key={session.id} className={selectedSessionId === session.id ? 'bg-neutral-50' : undefined}>
                    <td className="px-3 py-2 font-mono text-xs">{session.id}</td>
                    <td className="px-3 py-2">{session.objective}</td>
                    <td className="px-3 py-2">{session.status}</td>
                    <td className="px-3 py-2">{formatDate(session.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs transition hover:bg-neutral-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-neutral-500">
                      No sessions yet. Generate a plan and create one above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-neutral-100 p-4" aria-labelledby="board-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="board-heading" className="text-lg font-semibold">
              Session Board
            </h2>
            <p className="text-sm text-neutral-500">
              Inspect orchestration tasks and forward manual status updates back to the service. Use this to simulate domain
              agent execution or approvals.
            </p>
          </div>
          {selectedSessionId ? (
            <button
              type="button"
              onClick={() => boardQuery.refetch()}
              disabled={boardQuery.isFetching}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {boardQuery.isFetching ? 'Refreshing…' : 'Refresh board'}
            </button>
          ) : null}
        </div>
        {selectedSessionId ? null : (
          <p className="mt-4 text-sm text-neutral-500">Select a session to load its task board.</p>
        )}
        {boardQuery.isFetching ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}
        {board && board.tasks.length ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span className="rounded-full bg-neutral-50 px-3 py-1 text-neutral-600">
                Session status: {latestSessionStatus ?? 'Unknown'}
              </span>
              <span className="rounded-full bg-neutral-50 px-3 py-1 text-neutral-600">
                Tasks: {board.tasks.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead>
                  <tr className="bg-neutral-25 text-left">
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Agent</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {board.tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-neutral-800">{task.title}</p>
                        <p className="text-xs text-neutral-500">{task.id}</p>
                      </td>
                      <td className="px-3 py-2">{task.agentManifestId ?? '—'}</td>
                      <td className="px-3 py-2">
                        <select
                          value={taskUpdates[task.id] ?? task.status}
                          onChange={(event) => setTaskUpdate(task.id, event.target.value as OrchestrationTaskStatus)}
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
                        >
                          {TASK_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">{formatDate(task.completedAt ?? task.startedAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateTaskStatus(task.id)}
                          disabled={completeTaskMutation.isPending && taskUpdateInFlight === task.id}
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {completeTaskMutation.isPending && taskUpdateInFlight === task.id ? 'Updating…' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedSessionId && !boardQuery.isFetching ? (
          <p className="mt-4 text-sm text-neutral-500">No tasks yet for this session.</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-neutral-100 p-4" aria-labelledby="agents-heading">
        <h2 id="agents-heading" className="text-lg font-semibold">
          Domain Agents ({agents.length})
        </h2>
        <p className="text-sm text-neutral-500">
          Reference metadata for available domain agents. Use this catalogue to plan orchestration assignments.
        </p>
        {agentsQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <article key={agent.key} className="space-y-2 rounded-lg border border-neutral-100 p-4 shadow-sm">
                <header className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-neutral-800">{agent.title}</h3>
                    <span className="text-xs uppercase text-neutral-500">{agent.status}</span>
                  </div>
                  <p className="text-sm text-neutral-600">{agent.description}</p>
                </header>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-500">Owner</p>
                  <p className="text-sm text-neutral-700">{agent.owner}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-500">Capabilities</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-700">
                    {agent.capabilities.map((capability) => (
                      <li key={capability}>{capability}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AgentOrchestratorPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="space-y-4 p-6">
          <h1 className="text-xl font-semibold text-red-600">Unable to load orchestrator console</h1>
          <p className="text-sm text-neutral-600">
            Please refresh the page or contact support if the issue persists.
          </p>
        </div>
      }
    >
      <OrchestratorContent />
    </ErrorBoundary>
  );
}
