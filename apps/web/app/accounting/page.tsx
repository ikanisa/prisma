'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { clientEnv } from '@/src/env.client';

// Runtime mode: "modules" | "close"
const ACCOUNTING_MODE = clientEnv.NEXT_PUBLIC_ACCOUNTING_MODE;

/* ========================================================================
   EXPORTED PAGE
   ======================================================================== */
export default function AccountingPage() {
  return ACCOUNTING_MODE === 'modules' ? (
    <AccountingModulesWorkspace />
  ) : (
    <AccountingCloseWorkspace />
  );
}

/* ========================================================================
   MODE A — Accounting Modules Workspace (from codex/add-new-supabase-schemas-and-apis)
   ======================================================================== */
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

function AccountingModulesWorkspace() {
  const modules = useMemo(() => ACCOUNTING_MODULES, []);
  const [orgId, setOrgId] = useState<string>('org-demo');
  const [actorId, setActorId] = useState<string>('user-analyst');
  const [payloads, setPayloads] = useState<ModulePayloadState>(() => buildInitialPayloads(modules));
  const [responses, setResponses] = useState<ModuleResponseMap>({});
  const [isSubmitting, setIsSubmitting] = useState<ModuleBooleanState>(() => buildInitialBoolean(modules));
  const [errors, setErrors] = useState<ModuleErrorState>({});
  const [globalMessage, setGlobalMessage] = useState<string>('Ready to orchestrate accounting workflows.');

  const handlePayloadChange = (module: ModuleKey, value: string) => {
    setPayloads((prev) => ({ ...prev, [module]: value }));
  };
  const resetMessage = () => setGlobalMessage('');

  const submitModule = async (module: ModuleKey) => {
    resetMessage();
    setIsSubmitting((prev) => ({ ...prev, [module]: true }));
    setErrors((prev) => ({ ...prev, [module]: undefined }));

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payloads[module]);
    } catch {
      setErrors((prev) => ({ ...prev, [module]: 'Payload must be valid JSON.' }));
      setIsSubmitting((prev) => ({ ...prev, [module]: false }));
      return;
    }

    try {
      const response = await fetch(`/api/accounting/${module}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, actorId, payload: parsedPayload }),
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
          Provide organisational identifiers once. Each module inherits the context to ensure traceability and audit-ready payloads.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Organisation Identifier
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="org-uuid"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Actor Identifier
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
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
                    onChange={(e) => handlePayloadChange(module.key, e.target.value)}
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
                <p
                  role="alert"
                  className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
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
                          {response.approvals.map((a) => (
                            <li
                              key={`${a.role}-${a.decision}-${a.approverId ?? 'unassigned'}`}
                              className="rounded border px-2 py-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{a.role}</span>
                                <span className="text-xs uppercase">{a.decision}</span>
                              </div>
                              {a.notes ? <p className="text-xs text-muted-foreground">{a.notes}</p> : null}
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
                      Trace ID{' '}
                      <code className="font-mono text-xs">{response.trace.id}</code> created at{' '}
                      {new Date(response.trace.createdAt).toLocaleString()} by{' '}
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

/* ========================================================================
   MODE B — Accounting Close Workspace (from main)
   ======================================================================== */

type CloseStatus = 'OPEN' | 'SUBSTANTIVE_REVIEW' | 'READY_TO_LOCK' | 'LOCKED';
type PbcStatus = 'REQUESTED' | 'RECEIVED' | 'APPROVED';
type ReconciliationStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'CLOSED';
type JournalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED';
type VarianceStatus = 'OPEN' | 'EXPLAINED' | 'APPROVED';

type PbcItem = {
  id: string;
  area: string;
  title: string;
  due: string;
  owner: string;
  status: PbcStatus;
};

type Reconciliation = {
  id: string;
  type: string;
  difference: number;
  status: ReconciliationStatus;
  owner: string;
};

type JournalBatch = {
  id: string;
  ref: string;
  status: JournalStatus;
  alerts: number;
  preparer: string;
};

type VarianceException = {
  id: string;
  code: string;
  description: string;
  current: number;
  baseline: number;
  deltaAbs: number;
  deltaPct: number;
  status: VarianceStatus;
};

type ActivityEntry = {
  id: string;
  timestamp: string;
  message: string;
};

const closeFlow: CloseStatus[] = ['OPEN', 'SUBSTANTIVE_REVIEW', 'READY_TO_LOCK', 'LOCKED'];
const pbcFlow: PbcStatus[] = ['REQUESTED', 'RECEIVED', 'APPROVED'];
const journalFlow: JournalStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'];

const initialPbc: PbcItem[] = [
  { id: 'pbc-1', area: 'BANK', title: 'Bank statements & reconciliations', due: new Date(Date.now() + 2 * 86400000).toISOString(), owner: 'Alex Rivera', status: 'RECEIVED' },
  { id: 'pbc-2', area: 'AR', title: 'Accounts receivable ageing',        due: new Date(Date.now() + 4 * 86400000).toISOString(), owner: 'Priya Patel', status: 'REQUESTED' },
  { id: 'pbc-3', area: 'PAYROLL', title: 'Payroll register & approvals',   due: new Date(Date.now() + 1 * 86400000).toISOString(), owner: 'Kai Chen',    status: 'APPROVED' },
];

const initialReconciliations: Reconciliation[] = [
  { id: 'recon-1', type: 'BANK', difference: 0,      status: 'CLOSED',       owner: 'Alex Rivera' },
  { id: 'recon-2', type: 'AR',   difference: 1523.4, status: 'IN_PROGRESS',  owner: 'Priya Patel' },
  { id: 'recon-3', type: 'AP',   difference: 0,      status: 'REVIEW',       owner: 'Kai Chen' },
];

const initialJournalBatches: JournalBatch[] = [
  { id: 'journal-1', ref: 'TB-ADJ-002',  status: 'APPROVED',  alerts: 0, preparer: 'Samira Ahmed' },
  { id: 'journal-2', ref: 'REV-ACCRUAL', status: 'SUBMITTED', alerts: 1, preparer: 'Luis Gomez' },
  { id: 'journal-3', ref: 'FX-REMEASURE',status: 'DRAFT',     alerts: 0, preparer: 'Alex Rivera' },
];

const initialVariance: VarianceException[] = [
  { id: 'variance-1', code: 'REV',  description: 'Revenue vs PY',                current: 1120000, baseline: 950000,  deltaAbs: 170000, deltaPct: 17.89, status: 'OPEN' },
  { id: 'variance-2', code: 'OPEX', description: 'Operating expenses vs budget', current: 480000,  baseline: 465000,  deltaAbs: 15000,  deltaPct: 3.23,  status: 'EXPLAINED' },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(36).slice(2, 10)}`;

function AccountingCloseWorkspace() {
  const [closeStatus, setCloseStatus] = useState<CloseStatus>('SUBSTANTIVE_REVIEW');
  const [pbcItems, setPbcItems] = useState(initialPbc);
  const [reconciliations, setReconciliations] = useState(initialReconciliations);
  const [journalBatches, setJournalBatches] = useState(initialJournalBatches);
  const [varianceExceptions, setVarianceExceptions] = useState(initialVariance);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([
    { id: 'act-1', timestamp: new Date().toISOString(), message: 'Close initialised for period 2025-M08.' },
  ]);

  const summary = useMemo(() => {
    const completedPbc = pbcItems.filter((i) => i.status === 'APPROVED').length;
    const closedRecons = reconciliations.filter((i) => i.status === 'CLOSED').length;
    const postedJournals = journalBatches.filter((b) => b.status === 'POSTED').length;
    const openVar = varianceExceptions.filter((i) => i.status === 'OPEN').length;

    return {
      pbcProgress: pbcItems.length === 0 ? 0 : Math.round((completedPbc / pbcItems.length) * 100),
      reconciliationProgress: reconciliations.length === 0 ? 0 : Math.round((closedRecons / reconciliations.length) * 100),
      pendingJournals: journalBatches.length - postedJournals,
      openVariance: openVar,
    };
  }, [journalBatches, pbcItems, reconciliations, varianceExceptions]);

  const addActivity = (message: string) =>
    setActivityLog((prev) => [{ id: `act-${generateId()}`, timestamp: new Date().toISOString(), message }, ...prev]);

  const advanceClose = () => {
    const i = closeFlow.indexOf(closeStatus);
    if (i >= closeFlow.length - 1) return;
    const next = closeFlow[i + 1];
    setCloseStatus(next);
    addActivity(`Close advanced to ${next.replace(/_/g, ' ')}.`);
  };
  const lockClose = () => {
    if (closeStatus !== 'READY_TO_LOCK') return;
    setCloseStatus('LOCKED');
    addActivity('Period locked. Trial balance snapshot sealed and journal postings disabled.');
  };
  const advancePbc = (id: string) =>
    setPbcItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const idx = pbcFlow.indexOf(item.status);
        if (idx === pbcFlow.length - 1) return item;
        const next = pbcFlow[idx + 1];
        addActivity(`PBC '${item.title}' marked ${next.toLowerCase()}.`);
        return { ...item, status: next };
      }),
    );
  const toggleReconciliation = (id: string) =>
    setReconciliations((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = item.status === 'CLOSED' ? 'REVIEW' : 'CLOSED';
        addActivity(`Reconciliation ${item.type} updated to ${next}.`);
        return { ...item, status: next, difference: 0 };
      }),
    );
  const advanceJournal = (id: string) =>
    setJournalBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== id) return batch;
        const idx = journalFlow.indexOf(batch.status);
        if (idx === journalFlow.length - 1) return batch;
        const next = journalFlow[idx + 1];
        addActivity(`Journal ${batch.ref} moved to ${next}.`);
        return { ...batch, status: next, alerts: next === 'APPROVED' ? 0 : batch.alerts };
      }),
    );
  const clearVariance = (id: string) =>
    setVarianceExceptions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        addActivity(`Variance ${item.code} documented and marked explained.`);
        return { ...item, status: 'EXPLAINED' };
      }),
    );
  const captureTrialBalance = () => addActivity('Trial balance snapshot captured for period 2025-M08.');
  const runVarianceAnalytics = () => addActivity('Variance analytics executed using IFRS baseline rules (IAS 1.25 & 1.134).');

  return (
    <main className="space-y-8 p-6" aria-labelledby="accounting-heading">
      <header className="space-y-2">
        <h1 id="accounting-heading" className="text-2xl font-semibold text-slate-900">
          Accounting Close Workspace
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Manage monthly close controls covering prepared-by-client (PBC) items, reconciliations, journal approvals,
          variance analytics, and the final lock required by IAS 1 / IAS 7 governance. Use this workspace to track
          completion, capture evidence, and log approvals before exporting the reporting pack.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          Close status: {closeStatus.replace(/_/g, ' ')}
        </div>
      </header>

      <section aria-labelledby="summary-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="summary-heading" className="text-lg font-medium text-slate-900">
            Control summary
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={advanceClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={closeStatus === 'LOCKED'}
            >
              Advance stage
            </button>
            <button
              type="button"
              onClick={lockClose}
              className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={closeStatus !== 'READY_TO_LOCK'}
            >
              Lock period
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" role="list">
          <SummaryCard
            label="PBC completion"
            value={`${summary.pbcProgress}%`}
            helper={`${summary.pbcProgress >= 80 ? 'On track' : 'Behind target'} · ${pbcItems.length} items`}
          />
          <SummaryCard
            label="Reconciliations closed"
            value={`${summary.reconciliationProgress}%`}
            helper={`${reconciliations.length} controls in scope`}
          />
          <SummaryCard
            label="Journals pending"
            value={summary.pendingJournals.toString()}
            helper="Awaiting approval/posting"
          />
          <SummaryCard
            label="Open variance exceptions"
            value={summary.openVariance.toString()}
            helper="IAS 1 analytics requiring explanation"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Close controls">
        <div className="space-y-6">
          <div>
            <SectionHeading title="Prepared-by-client requests" description="Track evidence received and approvals." />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200" aria-label="Prepared by client items">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {pbcItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.area}</td>
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">{item.owner}</td>
                      <td className="px-4 py-3">{formatDate(item.due)}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={item.status === 'APPROVED' ? 'success' : item.status === 'RECEIVED' ? 'info' : 'muted'}>
                          {item.status.toLowerCase()}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => advancePbc(item.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          disabled={item.status === 'APPROVED'}
                        >
                          Mark next
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeading title="Balance sheet reconciliations" description="Close mandatory reconciliations for IAS 1.54 line items." />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200" aria-label="Reconciliations">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Difference</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {reconciliations.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.type}</td>
                      <td className="px-4 py-3">{item.owner}</td>
                      <td className="px-4 py-3">{item.difference === 0 ? 'Balanced' : formatCurrency(item.difference)}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={item.status === 'CLOSED' ? 'success' : item.status === 'REVIEW' ? 'info' : 'warning'}>
                          {item.status.toLowerCase()}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleReconciliation(item.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {item.status === 'CLOSED' ? 'Reopen' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeading title="Journal batches" description="Approve and post journals after control review." />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200" aria-label="Journal batches">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Preparer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Alerts</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {journalBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-4 py-3 font-medium">{batch.ref}</td>
                      <td className="px-4 py-3">{batch.preparer}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={batch.status === 'POSTED' ? 'success' : batch.status === 'APPROVED' ? 'info' : 'warning'}>
                          {batch.status.toLowerCase()}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3">
                        {batch.alerts === 0 ? (
                          <span className="text-xs text-slate-500">None</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            {batch.alerts} high
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => advanceJournal(batch.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          disabled={batch.status === 'POSTED'}
                        >
                          Advance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeading title="Variance analytics" description="Explain movements to comply with IAS 1.138 and management review controls." />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200" aria-label="Variance exceptions">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">Baseline</th>
                    <th className="px-4 py-3 text-right">Delta</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {varianceExceptions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.code}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.current)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.baseline)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(item.deltaAbs)}</span>
                          <span className="text-xs text-slate-500">{formatPercent(item.deltaPct)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={item.status === 'APPROVED' ? 'success' : item.status === 'EXPLAINED' ? 'info' : 'warning'}>
                          {item.status.toLowerCase()}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => clearVariance(item.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          disabled={item.status !== 'OPEN'}
                        >
                          Mark explained
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeading title="Control centre" description="Trigger supporting analytics before final approval." />
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={captureTrialBalance}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Capture trial balance snapshot
                <span className="mt-1 block text-xs font-normal text-slate-500">Stores totals and by-account balances for audit trail.</span>
              </button>
              <button
                type="button"
                onClick={runVarianceAnalytics}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Run variance analytics
                <span className="mt-1 block text-xs font-normal text-slate-500">Evaluates IAS 1 thresholds and logs exceptions.</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="text-lg font-medium text-slate-900">
          Activity log
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200" role="list">
            {activityLog.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{entry.message}</span>
                  <time className="text-xs text-slate-500" dateTime={entry.timestamp}>
                    {new Intl.DateTimeFormat(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }).format(new Date(entry.timestamp))}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/* ========================================================================
   Shared UI bits (used by Close workspace)
   ======================================================================== */

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div role="listitem" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
function StatusPill({ tone, children }: { tone: 'success' | 'info' | 'warning' | 'muted'; children: ReactNode }) {
  const toneClasses: Record<'success' | 'info' | 'warning' | 'muted', string> = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    muted: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
