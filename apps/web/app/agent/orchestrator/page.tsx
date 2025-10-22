'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type DomainAgentStatus = 'implemented' | 'in_progress' | 'planned';

type DomainAgent = {
  key: string;
  title: string;
  description: string;
  status: DomainAgentStatus;
  owner: string;
  capabilities: string[];
  dependencies?: string[];
  toolCatalog?: string[];
  datasetKeys?: string[];
  knowledgeBases?: string[];
  tooling?: Array<{
    name: string;
    summary: string;
    apis: string[];
    notes?: string;
  }>;
  notes?: string;
};

type OrchestrationSessionStatus = 'PENDING' | 'RUNNING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED';

type OrchestrationTaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED';

type OrchestrationSession = {
  id: string;
  orgId: string;
  objective: string;
  status: OrchestrationSessionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type OrchestrationTask = {
  id: string;
  sessionId: string;
  agentManifestId: string | null;
  title: string;
  status: OrchestrationTaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  dependsOn: string[];
  startedAt: string | null;
  completedAt: string | null;
};

type OrchestrationPlanTask = {
  id: string;
  agentKey: string;
  title: string;
  description: string;
  inputs?: Record<string, unknown>;
  status: OrchestrationTaskStatus;
  requiresHumanReview: boolean;
  metadata?: Record<string, unknown>;
};

type OrchestrationPlan = {
  objective: string;
  tasks: OrchestrationPlanTask[];
  createdAt: string;
  createdBy: string;
};

type SessionBoard = {
  session: OrchestrationSession | null;
  tasks: OrchestrationTask[];
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  try {
    return DATE_FORMAT.format(new Date(value));
  } catch {
    return value;
  }
}

function convertPlanTaskToPayload(task: OrchestrationPlanTask) {
  const metadata: Record<string, unknown> = {
    description: task.description,
    requiresHumanReview: task.requiresHumanReview,
  };
  if (task.metadata && Object.keys(task.metadata).length > 0) {
    Object.assign(metadata, task.metadata);
  }
  return {
    agentKey: task.agentKey,
    title: task.title,
    input: task.inputs && Object.keys(task.inputs).length > 0 ? task.inputs : undefined,
    metadata,
  };
}

const TASK_STATUS_OPTIONS: OrchestrationTaskStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
];

export default function AgentOrchestratorPage() {
  const [orgSlug, setOrgSlug] = useState('demo');
  const [objective, setObjective] = useState('Coordinate FY24 audit automation');
  const [engagementId, setEngagementId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [constraintsInput, setConstraintsInput] = useState('');
  const [metadataJson, setMetadataJson] = useState('{}');
  const [directorAgentKey, setDirectorAgentKey] = useState('');
  const [safetyAgentKey, setSafetyAgentKey] = useState('');
  const [includePlanTasks, setIncludePlanTasks] = useState(true);

  const [planPreview, setPlanPreview] = useState<OrchestrationPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<OrchestrationSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [board, setBoard] = useState<SessionBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [agents, setAgents] = useState<DomainAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [taskUpdates, setTaskUpdates] = useState<Record<string, OrchestrationTaskStatus>>({});
  const [taskUpdateInFlight, setTaskUpdateInFlight] = useState<string | null>(null);
  const [taskUpdateError, setTaskUpdateError] = useState<string | null>(null);

  const constraints = useMemo(() => {
    return constraintsInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [constraintsInput]);

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const res = await fetch('/api/agent/orchestrator/agents', { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load agents (${res.status})`);
      }
      const body = (await res.json()) as { agents: DomainAgent[] };
      setAgents(body.agents ?? []);
    } catch (error) {
      setAgentsError(error instanceof Error ? error.message : 'Failed to load agents');
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const generatePlan = useCallback(async () => {
    if (!orgSlug.trim() || !objective.trim()) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch('/api/agent/orchestrator/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug: orgSlug.trim(),
          objective: objective.trim(),
          priority,
          constraints: constraints.length ? constraints : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to generate plan (${res.status})`);
      }
      const body = (await res.json()) as { plan: OrchestrationPlan };
      setPlanPreview(body.plan);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : 'Failed to generate plan');
      setPlanPreview(null);
    } finally {
      setPlanLoading(false);
    }
  }, [orgSlug, objective, priority, constraints]);

  const loadSessions = useCallback(async () => {
    if (!orgSlug.trim()) return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const params = new URLSearchParams({ orgSlug: orgSlug.trim(), limit: '20' });
      const res = await fetch(`/api/agent/orchestrator/sessions?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load sessions (${res.status})`);
      }
      const body = (await res.json()) as { sessions: OrchestrationSession[] };
      setSessions(body.sessions ?? []);
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : 'Failed to load sessions');
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [orgSlug]);

  const loadBoard = useCallback(
    async (sessionId: string) => {
      setBoardLoading(true);
      setBoardError(null);
      try {
        const res = await fetch(`/api/agent/orchestrator/session/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to load session board (${res.status})`);
        }
        const body = (await res.json()) as SessionBoard;
        setBoard(body);
        const nextUpdates: Record<string, OrchestrationTaskStatus> = {};
        for (const task of body.tasks ?? []) {
          nextUpdates[task.id] = task.status;
        }
        setTaskUpdates(nextUpdates);
      } catch (error) {
        setBoardError(error instanceof Error ? error.message : 'Failed to load session board');
        setBoard(null);
      } finally {
        setBoardLoading(false);
      }
    },
    [],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setSelectedSessionId(sessionId);
      void loadBoard(sessionId);
    },
    [loadBoard],
  );

  const createSession = useCallback(async () => {
    if (!orgSlug.trim() || !objective.trim()) return;
    setBoardError(null);
    try {
      const payload: Record<string, unknown> = {
        orgSlug: orgSlug.trim(),
        objective: objective.trim(),
      };
      if (engagementId.trim()) {
        payload.engagementId = engagementId.trim();
      }
      if (directorAgentKey.trim()) {
        payload.directorAgentKey = directorAgentKey.trim();
      }
      if (safetyAgentKey.trim()) {
        payload.safetyAgentKey = safetyAgentKey.trim();
      }
      if (metadataJson.trim().length > 0) {
        try {
          const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
          if (Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
          }
        } catch {
          setBoardError('Session metadata JSON is invalid');
          return;
        }
      }
      if (includePlanTasks && planPreview) {
        payload.tasks = planPreview.tasks.map(convertPlanTaskToPayload);
      }

      const res = await fetch('/api/agent/orchestrator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to create session (${res.status})`);
      }

      const boardResponse = (await res.json()) as SessionBoard;
      setBoard(boardResponse);
      setSelectedSessionId(boardResponse.session?.id ?? null);
      await loadSessions();
      if (boardResponse.session?.id) {
        const nextUpdates: Record<string, OrchestrationTaskStatus> = {};
        for (const task of boardResponse.tasks ?? []) {
          nextUpdates[task.id] = task.status;
        }
        setTaskUpdates(nextUpdates);
      }
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : 'Failed to create session');
    }
  }, [
    orgSlug,
    objective,
    engagementId,
    directorAgentKey,
    safetyAgentKey,
    metadataJson,
    includePlanTasks,
    planPreview,
    loadSessions,
  ]);

  const updateTaskStatus = useCallback(
    async (taskId: string) => {
      const nextStatus = taskUpdates[taskId];
      if (!nextStatus) return;
      setTaskUpdateError(null);
      setTaskUpdateInFlight(taskId);
      try {
        const res = await fetch(`/api/agent/orchestrator/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to update task (${res.status})`);
        }
        if (selectedSessionId) {
          await loadBoard(selectedSessionId);
        }
      } catch (error) {
        setTaskUpdateError(error instanceof Error ? error.message : 'Failed to update task');
      } finally {
        setTaskUpdateInFlight(null);
      }
    },
    [taskUpdates, selectedSessionId, loadBoard],
  );

  const latestSessionStatus = board?.session?.status ?? null;

  return (
    <main className="space-y-8 p-6" aria-labelledby="orchestrator-heading">
      <header className="space-y-2">
        <h1 id="orchestrator-heading" className="text-2xl font-semibold">
          Agent Orchestrator Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Experiment with multi-agent orchestration sessions managed by the Director and Safety agents. Use this console to
          preview plans, create sessions, inspect task boards, and forward status updates back to the MCP hub.
        </p>
      </header>

      <section className="rounded-lg border p-4" aria-labelledby="plan-preview-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="plan-preview-heading" className="text-lg font-semibold">
              Plan Preview
            </h2>
            <p className="text-sm text-muted-foreground">
              Generate a draft orchestration plan for the supplied objective before instantiating a session.
            </p>
          </div>
      <button
        type="button"
        onClick={() => void generatePlan()}
        disabled={planLoading || !orgSlug.trim() || !objective.trim()}
        className="rounded-md border border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {planLoading ? 'Generating...' : 'Generate plan'}
      </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Organisation slug
            <input
              value={orgSlug}
              onChange={(event) => setOrgSlug(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="org-slug"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Engagement ID (optional)
            <input
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="engagement-uuid"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
              className="rounded-md border px-3 py-2"
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
              className="min-h-[80px] rounded-md border px-3 py-2"
              placeholder="Soft deadline: FY24 audit close\nEscalate: manual approvals"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
          Objective
          <textarea
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            className="min-h-[120px] rounded-md border px-3 py-2"
            placeholder="Summarise the orchestration goal..."
          />
        </label>
        {planError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {planError}
          </p>
        ) : null}
        {planPreview ? (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">Generated tasks ({planPreview.tasks.length})</h3>
            <div className="space-y-3">
              {planPreview.tasks.map((task) => (
                <article key={task.id} className="rounded-lg border p-3 text-sm" aria-label={task.title}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{task.title}</span>
                    <span className="rounded-full border px-2 py-1 text-xs">{task.agentKey}</span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{task.description}</p>
                  <dl className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <dt className="text-[11px] uppercase text-muted-foreground">Requires human review</dt>
                      <dd>{task.requiresHumanReview ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase text-muted-foreground">Initial status</dt>
                      <dd>{task.status}</dd>
                    </div>
                  </dl>
                  {task.inputs ? (
                    <details className="mt-2 rounded-md border bg-muted/40 p-2">
                      <summary className="cursor-pointer text-xs font-medium">Inputs</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(task.inputs, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="session-create-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="session-create-heading" className="text-lg font-semibold">
              Create Orchestration Session
            </h2>
            <p className="text-sm text-muted-foreground">
              Sessions persist in Supabase. Optionally include the plan tasks as initial MCP tasks or let the service seed
              defaults based on the objective.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createSession()}
            disabled={!orgSlug.trim() || !objective.trim()}
            className="rounded-md border border-green-500 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create session
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={includePlanTasks}
              onChange={(event) => setIncludePlanTasks(event.target.checked)}
              className="h-4 w-4 rounded border"
            />
            Include plan tasks in session payload
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Session metadata (JSON)
            <textarea
              value={metadataJson}
              onChange={(event) => setMetadataJson(event.target.value)}
              className="min-h-[80px] rounded-md border px-3 py-2 font-mono text-xs"
              placeholder={'{\n  "autonomyThreshold": "medium"\n}'}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Director agent key (optional)
            <input
              value={directorAgentKey}
              onChange={(event) => setDirectorAgentKey(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="director.core"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Safety agent key (optional)
            <input
              value={safetyAgentKey}
              onChange={(event) => setSafetyAgentKey(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="safety.core"
            />
          </label>
        </div>
        {boardError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {boardError}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="sessions-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="sessions-heading" className="text-lg font-semibold">
              Sessions ({sessions.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Load recent sessions for the organisation and select one to inspect its task board.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={sessionsLoading || !orgSlug.trim()}
            className="rounded-md border border-slate-400 px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sessionsLoading ? 'Loading...' : 'Refresh sessions'}
          </button>
        </div>
        {sessionsError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {sessionsError}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Session ID</th>
                <th className="px-3 py-2 font-medium">Objective</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium" aria-label="Select" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map((session) => (
                <tr key={session.id} className={selectedSessionId === session.id ? 'bg-muted/40' : undefined}>
                  <td className="px-3 py-2 font-mono text-xs">{session.id}</td>
                  <td className="px-3 py-2">{session.objective}</td>
                  <td className="px-3 py-2">{session.status}</td>
                  <td className="px-3 py-2">{formatDate(session.updatedAt)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No sessions yet. Generate a plan and create one above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="board-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="board-heading" className="text-lg font-semibold">
              Session Board
            </h2>
            <p className="text-sm text-muted-foreground">
              Inspect orchestration tasks and forward manual status updates back to the service. Use this to simulate domain
              agent execution or approvals.
            </p>
          </div>
          {selectedSessionId ? (
            <button
              type="button"
              onClick={() => void loadBoard(selectedSessionId)}
              disabled={boardLoading}
              className="rounded-md border border-slate-400 px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
            {boardLoading ? 'Refreshing...' : 'Refresh board'}
            </button>
          ) : null}
        </div>
        {boardLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading board...</p>
        ) : null}
        {latestSessionStatus ? (
          <p className="mt-3 text-sm">
            <span className="font-medium">Session status:</span> {latestSessionStatus}
          </p>
        ) : null}
        {taskUpdateError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {taskUpdateError}
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {board?.tasks?.map((task) => (
            <article key={task.id} className="rounded-lg border p-4" aria-labelledby={`task-${task.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`task-${task.id}`} className="text-base font-semibold">
                  {task.title}
                </h3>
                <span className="rounded-full border px-2 py-1 text-xs font-medium">{task.status}</span>
              </div>
              <dl className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Task ID</dt>
                  <dd className="font-mono text-xs">{task.id}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Depends on</dt>
                  <dd className="text-sm">{task.dependsOn.length ? task.dependsOn.length : '--'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Started</dt>
                  <dd className="text-sm">{formatDate(task.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Completed</dt>
                  <dd className="text-sm">{formatDate(task.completedAt)}</dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Update status
                  <select
                    value={taskUpdates[task.id] ?? task.status}
                    onChange={(event) =>
                      setTaskUpdates((prev) => ({ ...prev, [task.id]: event.target.value as OrchestrationTaskStatus }))
                    }
                    className="rounded-md border px-3 py-2"
                  >
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void updateTaskStatus(task.id)}
                    disabled={taskUpdateInFlight === task.id}
                    className="rounded-md border border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {taskUpdateInFlight === task.id ? 'Updating...' : 'Submit update'}
                  </button>
                </div>
              </div>
              <details className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-medium">Input</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(task.input ?? {}, null, 2)}
                </pre>
              </details>
              <details className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-medium">Metadata</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(task.metadata ?? {}, null, 2)}
                </pre>
              </details>
              <details className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-medium">Output</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(task.output ?? {}, null, 2)}
                </pre>
              </details>
            </article>
          ))}
          {!board?.tasks?.length && !boardLoading ? (
            <p className="text-sm text-muted-foreground">Select a session to view its tasks.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="agents-heading">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="agents-heading" className="text-lg font-semibold">
              Domain Agents
            </h2>
            <p className="text-sm text-muted-foreground">
              Reference metadata for the available agent personas used by the Director during orchestration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAgents()}
            disabled={agentsLoading}
            className="rounded-md border border-slate-400 px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {agentsLoading ? 'Refreshing...' : 'Refresh agents'}
          </button>
        </div>
        {agentsError ? (
          <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {agentsError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {agents.map((agent) => (
            <article key={agent.key} className="rounded-lg border p-4" aria-label={agent.title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold">{agent.title}</h3>
                <span className="rounded-full border px-2 py-1 text-xs font-medium">{agent.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{agent.description}</p>
              <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                <div>
                  <dt className="uppercase text-muted-foreground">Key</dt>
                  <dd className="font-mono text-xs">{agent.key}</dd>
                </div>
                <div>
                  <dt className="uppercase text-muted-foreground">Owner</dt>
                  <dd>{agent.owner}</dd>
                </div>
                <div>
                  <dt className="uppercase text-muted-foreground">Capabilities</dt>
                  <dd>{agent.capabilities.join(', ')}</dd>
                </div>
                <div>
                  <dt className="uppercase text-muted-foreground">Dependencies</dt>
                  <dd>{agent.dependencies?.length ? agent.dependencies.join(', ') : '--'}</dd>
                </div>
                {agent.toolCatalog?.length ? (
                  <div>
                    <dt className="uppercase text-muted-foreground">Tool Catalog</dt>
                    <dd>{agent.toolCatalog.join(', ')}</dd>
                  </div>
                ) : null}
                {agent.datasetKeys?.length ? (
                  <div>
                    <dt className="uppercase text-muted-foreground">Datasets</dt>
                    <dd>{agent.datasetKeys.join(', ')}</dd>
                  </div>
                ) : null}
                {agent.knowledgeBases?.length ? (
                  <div>
                    <dt className="uppercase text-muted-foreground">Knowledge Bases</dt>
                    <dd>{agent.knowledgeBases.join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
              {agent.tooling?.length ? (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Tooling</h4>
                  <ul className="space-y-2">
                    {agent.tooling.map((tool) => (
                      <li key={`${agent.key}-${tool.name}`} className="rounded-md border border-dashed border-slate-300 p-2">
                        <div className="text-xs font-semibold">{tool.name}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{tool.summary}</p>
                        <p className="mt-1 text-[11px]"><span className="font-semibold">APIs:</span> {tool.apis.join(', ')}</p>
                        {tool.notes ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">Notes: {tool.notes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {agent.notes ? (
                <p className="mt-2 text-xs text-muted-foreground">Notes: {agent.notes}</p>
              ) : null}
            </article>
          ))}
          {agents.length === 0 && !agentsLoading ? (
            <p className="text-sm text-muted-foreground">No agents registered yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
