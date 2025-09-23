'use client';

import { useMemo, useState } from 'react';
import type {
  AccountingModule,
  AccountingModuleDefinition,
  ModuleExecutionResult,
} from '../../lib/accounting/types';
import { ACCOUNTING_MODULES } from '../../lib/accounting/metadata';

type ModuleKey = AccountingModule;

type ModuleResponseMap = Partial<Record<ModuleKey, ModuleExecutionResult>>;
type ModulePayloadState = Record<ModuleKey, string>;
type ModuleBooleanState = Record<ModuleKey, boolean>;
type ModuleErrorState = Partial<Record<ModuleKey, string>>;

const DEFAULT_ORG_ID = 'org-demo';
const DEFAULT_ACTOR_ID = 'user-analyst';

function buildInitialPayloads(modules: AccountingModuleDefinition[]): ModulePayloadState {
  return modules.reduce((acc, module) => {
    return {
      ...acc,
      [module.key]: JSON.stringify(module.defaultPayload, null, 2),
    };
  }, {} as ModulePayloadState);
}

function buildInitialBoolean(modules: AccountingModuleDefinition[]): ModuleBooleanState {
  return modules.reduce((acc, module) => ({ ...acc, [module.key]: false }), {} as ModuleBooleanState);
}

export default function AccountingWorkspace() {
  const modules = useMemo(() => ACCOUNTING_MODULES, []);
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID);
  const [actorId, setActorId] = useState<string>(DEFAULT_ACTOR_ID);
  const [payloads, setPayloads] = useState<ModulePayloadState>(() => buildInitialPayloads(modules));
  const [responses, setResponses] = useState<ModuleResponseMap>({});
  const [isSubmitting, setIsSubmitting] = useState<ModuleBooleanState>(() => buildInitialBoolean(modules));
  const [errors, setErrors] = useState<ModuleErrorState>({});
  const [globalMessage, setGlobalMessage] = useState<string>('Ready to orchestrate accounting workflows.');

  const handlePayloadChange = (module: ModuleKey, value: string) => {
    setPayloads((prev) => ({ ...prev, [module]: value }));
  };

  const resetMessage = () => {
    setGlobalMessage('');
  };

  const submitModule = async (module: ModuleKey) => {
    resetMessage();
    setIsSubmitting((prev) => ({ ...prev, [module]: true }));
    setErrors((prev) => ({ ...prev, [module]: undefined }));

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payloads[module]);
    } catch (error) {
      setErrors((prev) => ({ ...prev, [module]: 'Payload must be valid JSON.' }));
      setIsSubmitting((prev) => ({ ...prev, [module]: false }));
      return;
    }

    try {
      const response = await fetch(`/api/accounting/${module}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          actorId,
          payload: parsedPayload,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, [module]: body.error ?? 'Unexpected response from server.' }));
        setGlobalMessage('One or more modules require attention.');
        return;
      }

      setResponses((prev) => ({ ...prev, [module]: body as ModuleExecutionResult }));
      setGlobalMessage(`Updated ${module} module at ${new Date().toLocaleTimeString()}.`);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [module]: error instanceof Error ? error.message : 'Failed to reach API.',
      }));
      setGlobalMessage('Could not complete the requested module run.');
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [module]: false }));
    }
  };

  return (
    <main className="space-y-8 p-6" aria-labelledby="accounting-workspace-heading">
      <section className="space-y-2">
        <h1 id="accounting-workspace-heading" className="text-2xl font-semibold">
          Accounting Control Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Drive group consolidation, IFRS automation, tax orchestration, disclosure drafting and digital reporting packs
          from a single traceable control room.
        </p>
        {globalMessage ? (
          <p className="rounded-md bg-muted p-3 text-sm" role="status">
            {globalMessage}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="accounting-context-heading" className="rounded-lg border p-4">
        <h2 id="accounting-context-heading" className="text-lg font-semibold">
          Engagement Context
        </h2>
        <p className="text-sm text-muted-foreground">
          Provide organisational identifiers once. Each module inherits the context to ensure traceability and audit ready
          payloads.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Organisation Identifier
            <input
              type="text"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="org-uuid"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Actor Identifier
            <input
              type="text"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="user-uuid"
            />
          </label>
        </div>
      </section>

      <section aria-label="Accounting modules" className="space-y-6">
        {modules.map((module) => {
          const response = responses[module.key];
          const hasError = errors[module.key];
          return (
            <article key={module.key} className="rounded-lg border p-4" aria-labelledby={`${module.key}-title`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h3 id={`${module.key}-title`} className="text-lg font-semibold">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 md:mt-0"
                  onClick={() => submitModule(module.key)}
                  disabled={isSubmitting[module.key]}
                  aria-busy={isSubmitting[module.key]}
                >
                  {isSubmitting[module.key] ? 'Running…' : 'Run Module'}
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2" role="group" aria-labelledby={`${module.key}-payload`}>
                <div className="space-y-2">
                  <h4 id={`${module.key}-payload`} className="text-sm font-semibold">
                    Payload
                  </h4>
                  <textarea
                    value={payloads[module.key]}
                    onChange={(event) => handlePayloadChange(module.key, event.target.value)}
                    className="h-48 w-full rounded-md border p-3 font-mono text-xs"
                    aria-describedby={`${module.key}-payload-help`}
                  />
                  <p id={`${module.key}-payload-help`} className="text-xs text-muted-foreground">
                    Update the JSON payload before submitting. Refer to the acceptance criteria for mandatory data points.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Acceptance Checklist</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {module.acceptanceCriteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {hasError ? (
                <p role="alert" className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {hasError}
                </p>
              ) : null}

              {response ? (
                <div className="mt-4 space-y-4" aria-live="polite">
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-sm font-medium">Status: {response.status}</p>
                    <p className="mt-1 text-sm">{response.summary}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <section aria-label="Metrics" className="rounded-md border p-3">
                      <h5 className="text-sm font-semibold">Metrics</h5>
                      <dl className="mt-2 space-y-1 text-sm">
                        {Object.entries(response.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-3">
                            <dt className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <section aria-label="Approvals" className="rounded-md border p-3">
                      <h5 className="text-sm font-semibold">Approvals</h5>
                      {response.approvals.length > 0 ? (
                        <ul className="mt-2 space-y-2 text-sm">
                          {response.approvals.map((approval) => (
                            <li key={`${approval.role}-${approval.decision}-${approval.approverId ?? 'unassigned'}`} className="rounded border px-2 py-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{approval.role}</span>
                                <span className="text-xs uppercase">{approval.decision}</span>
                              </div>
                              {approval.notes ? (
                                <p className="text-xs text-muted-foreground">{approval.notes}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No approvals captured yet.</p>
                      )}
                    </section>
                  </div>
                  <section aria-label="Traceability" className="rounded-md border p-3 text-sm">
                    <h5 className="text-sm font-semibold">Trace</h5>
                    <p>
                      Trace ID <code className="font-mono text-xs">{response.trace.id}</code> created at {new Date(response.trace.createdAt).toLocaleString()} by{' '}
                      <span className="font-medium">{response.trace.actorId}</span>.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Action: {response.trace.action}. Metadata entries: {Object.keys(response.trace.metadata ?? {}).length}.
                    </p>
                  </section>
                  <section aria-label="Next steps" className="rounded-md border p-3 text-sm">
                    <h5 className="text-sm font-semibold">Next Steps</h5>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {response.nextSteps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
