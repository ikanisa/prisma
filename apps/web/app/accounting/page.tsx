"use client";

import { useMemo, useState, type ReactNode } from 'react';

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
  {
    id: 'pbc-1',
    area: 'BANK',
    title: 'Bank statements & reconciliations',
    due: new Date(Date.now() + 2 * 86400000).toISOString(),
    owner: 'Alex Rivera',
    status: 'RECEIVED',
  },
  {
    id: 'pbc-2',
    area: 'AR',
    title: 'Accounts receivable ageing',
    due: new Date(Date.now() + 4 * 86400000).toISOString(),
    owner: 'Priya Patel',
    status: 'REQUESTED',
  },
  {
    id: 'pbc-3',
    area: 'PAYROLL',
    title: 'Payroll register & approvals',
    due: new Date(Date.now() + 1 * 86400000).toISOString(),
    owner: 'Kai Chen',
    status: 'APPROVED',
  },
];

const initialReconciliations: Reconciliation[] = [
  {
    id: 'recon-1',
    type: 'BANK',
    difference: 0,
    status: 'CLOSED',
    owner: 'Alex Rivera',
  },
  {
    id: 'recon-2',
    type: 'AR',
    difference: 1523.4,
    status: 'IN_PROGRESS',
    owner: 'Priya Patel',
  },
  {
    id: 'recon-3',
    type: 'AP',
    difference: 0,
    status: 'REVIEW',
    owner: 'Kai Chen',
  },
];

const initialJournalBatches: JournalBatch[] = [
  {
    id: 'journal-1',
    ref: 'TB-ADJ-002',
    status: 'APPROVED',
    alerts: 0,
    preparer: 'Samira Ahmed',
  },
  {
    id: 'journal-2',
    ref: 'REV-ACCRUAL',
    status: 'SUBMITTED',
    alerts: 1,
    preparer: 'Luis Gomez',
  },
  {
    id: 'journal-3',
    ref: 'FX-REMEASURE',
    status: 'DRAFT',
    alerts: 0,
    preparer: 'Alex Rivera',
  },
];

const initialVariance: VarianceException[] = [
  {
    id: 'variance-1',
    code: 'REV',
    description: 'Revenue vs PY',
    current: 1120000,
    baseline: 950000,
    deltaAbs: 170000,
    deltaPct: 17.89,
    status: 'OPEN',
  },
  {
    id: 'variance-2',
    code: 'OPEX',
    description: 'Operating expenses vs budget',
    current: 480000,
    baseline: 465000,
    deltaAbs: 15000,
    deltaPct: 3.23,
    status: 'EXPLAINED',
  },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
};

export default function Accounting() {
  const [closeStatus, setCloseStatus] = useState<CloseStatus>('SUBSTANTIVE_REVIEW');
  const [pbcItems, setPbcItems] = useState(initialPbc);
  const [reconciliations, setReconciliations] = useState(initialReconciliations);
  const [journalBatches, setJournalBatches] = useState(initialJournalBatches);
  const [varianceExceptions, setVarianceExceptions] = useState(initialVariance);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([
    {
      id: 'act-1',
      timestamp: new Date().toISOString(),
      message: 'Close initialised for period 2025-M08.',
    },
  ]);

  const summary = useMemo(() => {
    const completedPbc = pbcItems.filter((item) => item.status === 'APPROVED').length;
    const closedReconciliations = reconciliations.filter((item) => item.status === 'CLOSED').length;
    const postedJournals = journalBatches.filter((batch) => batch.status === 'POSTED').length;
    const openVariance = varianceExceptions.filter((item) => item.status === 'OPEN').length;

    return {
      pbcProgress: pbcItems.length === 0 ? 0 : Math.round((completedPbc / pbcItems.length) * 100),
      reconciliationProgress:
        reconciliations.length === 0 ? 0 : Math.round((closedReconciliations / reconciliations.length) * 100),
      pendingJournals: journalBatches.length - postedJournals,
      openVariance,
    };
  }, [journalBatches, pbcItems, reconciliations, varianceExceptions]);

  const addActivity = (message: string) => {
    setActivityLog((prev) => [
      { id: `act-${generateId()}`, timestamp: new Date().toISOString(), message },
      ...prev,
    ]);
  };

  const advanceClose = () => {
    const currentIndex = closeFlow.indexOf(closeStatus);
    if (currentIndex >= closeFlow.length - 1) {
      return;
    }
    const nextStatus = closeFlow[currentIndex + 1];
    setCloseStatus(nextStatus);
    addActivity(`Close advanced to ${nextStatus.replace(/_/g, ' ')}.`);
  };

  const lockClose = () => {
    if (closeStatus !== 'READY_TO_LOCK') {
      return;
    }
    setCloseStatus('LOCKED');
    addActivity('Period locked. Trial balance snapshot sealed and journal postings disabled.');
  };

  const advancePbc = (id: string) => {
    setPbcItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentIndex = pbcFlow.indexOf(item.status);
        if (currentIndex === pbcFlow.length - 1) {
          return item;
        }
        const nextStatus = pbcFlow[currentIndex + 1];
        addActivity(`PBC '${item.title}' marked ${nextStatus.toLowerCase()}.`);
        return { ...item, status: nextStatus };
      })
    );
  };

  const toggleReconciliation = (id: string) => {
    setReconciliations((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus = item.status === 'CLOSED' ? 'REVIEW' : 'CLOSED';
        addActivity(`Reconciliation ${item.type} updated to ${nextStatus}.`);
        return { ...item, status: nextStatus, difference: 0 };
      })
    );
  };

  const advanceJournal = (id: string) => {
    setJournalBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== id) return batch;
        const currentIndex = journalFlow.indexOf(batch.status);
        if (currentIndex === journalFlow.length - 1) {
          return batch;
        }
        const nextStatus = journalFlow[currentIndex + 1];
        addActivity(`Journal ${batch.ref} moved to ${nextStatus}.`);
        return { ...batch, status: nextStatus, alerts: nextStatus === 'APPROVED' ? 0 : batch.alerts };
      })
    );
  };

  const clearVariance = (id: string) => {
    setVarianceExceptions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        addActivity(`Variance ${item.code} documented and marked explained.`);
        return { ...item, status: 'EXPLAINED' };
      })
    );
  };

  const captureTrialBalance = () => {
    addActivity('Trial balance snapshot captured for period 2025-M08.');
  };

  const runVarianceAnalytics = () => {
    addActivity('Variance analytics executed using IFRS baseline rules (IAS 1.25 & 1.134).');
  };

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

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
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
