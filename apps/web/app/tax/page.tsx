'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CalculatorResult, ModuleKey, TaxActivity } from '../../lib/tax/types';
import {
  assessFiscalUnity,
  computeMaltaNid,
  evaluateAtadIlr,
  type AtadIlrMetrics,
  type Dac6Arrangement,
  type Dac6ScanMetrics,
  type FiscalUnityInput,
  type FiscalUnityMetrics,
  type MaltaCitMetrics,
  type MaltaNidMetrics,
  type PillarTwoMetrics,
  type PillarTwoJurisdiction,
  type TreatyResolverMetrics,
  type UsGiltiMetrics,
  type VatPeriodInput,
  type VatPeriodMetrics,
} from '../../lib/tax/calculators';
import type { Decision } from '../../lib/tax/types';

interface ApiResponse<TMetrics extends Record<string, unknown>> {
  scenario: string;
  result: CalculatorResult<TMetrics>;
  activity: TaxActivity;
}

interface ModuleState<TMetrics extends Record<string, unknown>> {
  scenario: string;
  result: CalculatorResult<TMetrics> | null;
  activity: TaxActivity | null;
  loading: boolean;
  error: string | null;
}

const decisionColours: Record<Decision, string> = {
  approved: 'text-emerald-600 dark:text-emerald-400',
  review: 'text-amber-600 dark:text-amber-400',
  refused: 'text-rose-600 dark:text-rose-400',
};

function createInitialState<TMetrics extends Record<string, unknown>>(): ModuleState<TMetrics> {
  return {
    scenario: '',
    result: null,
    activity: null,
    loading: false,
    error: null,
  };
}

function renderMetricValue(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-sm text-muted-foreground">None</span>;
    }

    return (
      <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
        {value.map((item, index) => (
          <li key={index}>
            {typeof item === 'object' ? (
              <span className="font-mono text-xs">{JSON.stringify(item)}</span>
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === 'object') {
    return <pre className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">{JSON.stringify(value, null, 2)}</pre>;
  }

  if (typeof value === 'number') {
    return <span className="font-medium">{value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>;
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  return <span className="font-medium">{String(value)}</span>;
}

function downloadEvidence(module: ModuleKey, scenario: string, payload: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${module.replace(/\./g, '-')}-${scenario.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ResultPanel<TMetrics extends Record<string, unknown>>({
  scenario,
  result,
  activity,
}: {
  scenario: string;
  result: CalculatorResult<TMetrics> | null;
  activity: TaxActivity | null;
}) {
  if (!result) {
    return null;
  }

  const decisionClass = decisionColours[result.workflow.decision];

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Scenario: <span className="font-normal text-neutral-600 dark:text-neutral-300">{scenario}</span>
        </h4>
        <span className={`text-sm font-semibold uppercase ${decisionClass}`}>
          {result.workflow.decision}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h5 className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">Metrics</h5>
          <dl className="grid gap-2">
            {Object.entries(result.metrics).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase text-neutral-400">{key}</dt>
                <dd>{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">Workflow</h5>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            {result.workflow.reasons.length > 0 && (
              <div>
                <p className="font-medium">Reasons</p>
                <ul className="ml-4 list-disc space-y-1">
                  {result.workflow.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.workflow.approvalsRequired.length > 0 && (
              <div>
                <p className="font-medium">Approvals</p>
                <ul className="ml-4 list-disc space-y-1">
                  {result.workflow.approvalsRequired.map((approver) => (
                    <li key={approver}>{approver}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-medium">Next steps</p>
              <ul className="ml-4 list-disc space-y-1">
                {result.workflow.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h5 className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">Telemetry</h5>
          {Object.keys(result.telemetry).length === 0 ? (
            <p className="text-sm text-muted-foreground">No telemetry captured for this run.</p>
          ) : (
            <dl className="grid gap-2">
              {Object.entries(result.telemetry).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <dt className="text-neutral-500 dark:text-neutral-400">{key}</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-100">{value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div>
          <h5 className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">Activity</h5>
          {activity ? (
            <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
              <p>
                <span className="font-medium">Logged:</span> {new Date(activity.timestamp).toLocaleString()} by {activity.actor ?? 'system'}
              </p>
              <p>
                <span className="font-medium">Summary:</span> {activity.summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Awaiting activity log.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          onClick={() =>
            downloadEvidence(result.module, scenario, {
              scenario,
              module: result.module,
              metrics: result.metrics,
              workflow: result.workflow,
              telemetry: result.telemetry,
              evidence: result.evidence,
              activity,
            })
          }
        >
          Export evidence JSON
        </button>
      </div>
    </div>
  );
}

function WorkspaceCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
      </header>
      {children}
    </article>
  );
}

function createLocalActivity<TMetrics extends Record<string, unknown>>(
  module: ModuleKey,
  scenario: string,
  result: CalculatorResult<TMetrics>,
  summary: string
): TaxActivity {
  const numericMetrics = Object.entries(result.metrics).reduce<Record<string, number | string>>((acc, [key, value]) => {
    if (typeof value === 'number') {
      acc[key] = value;
    } else if (typeof value === 'string') {
      acc[key] = value;
    }
    return acc;
  }, {});

  return {
    id: globalThis.crypto.randomUUID(),
    module,
    scenario,
    decision: result.workflow.decision,
    summary,
    metrics: numericMetrics,
    timestamp: new Date().toISOString(),
  };
}
export default function Tax() {
  const [citForm, setCitForm] = useState({
    scenario: 'FY24 Filing',
    revenue: 1250000,
    deductions: 420000,
    carryForwardLosses: 75000,
    adjustments: 15000,
    taxRate: 0.35,
    preparedBy: 'analyst@malta.co',
  });
  const [citState, setCitState] = useState<ModuleState<MaltaCitMetrics>>(createInitialState());

  const [nidForm, setNidForm] = useState<{ scenario: string } & Parameters<typeof computeMaltaNid>[0]>({
    scenario: 'Equity injection Q3',
    equityBase: 250000,
    riskFreeRate: 0.02,
    riskPremium: 0.01,
    statutoryCap: 60000,
  });
  const [nidState, setNidState] = useState<ModuleState<MaltaNidMetrics>>(createInitialState());

  const [atadForm, setAtadForm] = useState<{ scenario: string } & Parameters<typeof evaluateAtadIlr>[0]>({
    scenario: 'Finco leverage test',
    ebitda: 800000,
    exceedingBorrowingCosts: 320000,
    safeHarbourAllowance: 50000,
  });
  const [atadState, setAtadState] = useState<ModuleState<AtadIlrMetrics>>(createInitialState());

  const [fiscalForm, setFiscalForm] = useState<{ scenario: string } & Parameters<typeof assessFiscalUnity>[0]>({
    scenario: 'Group consolidation 2024',
    parentProfit: 650000,
    subsidiaryProfit: -120000,
    adjustments: -30000,
    elections: 90000,
  });
  const [fiscalState, setFiscalState] = useState<ModuleState<FiscalUnityMetrics>>(createInitialState());

  const [vatForm, setVatForm] = useState<{ scenario: string; preparedBy: string } & VatPeriodInput>({
    scenario: 'April OSS filing',
    sales: 480000,
    salesVatRate: 0.18,
    purchases: 175000,
    purchaseVatRate: 0.07,
    scheme: 'oss',
    preparedBy: 'vat.specialist@eu.co',
  });
  const [vatState, setVatState] = useState<ModuleState<VatPeriodMetrics>>(createInitialState());

  const [dac6Scenario, setDac6Scenario] = useState('Cross-border financing wave 2');
  const [dac6PreparedBy, setDac6PreparedBy] = useState('legal@eu.co');
  const [dac6Arrangements, setDac6Arrangements] = useState<Array<{
    id: string;
    hallmarks: string;
    crossBorder: boolean;
    mainBenefit: boolean;
  }>>([
    { id: 'ARR-001', hallmarks: 'A1,B2', crossBorder: true, mainBenefit: true },
    { id: 'ARR-002', hallmarks: 'C1', crossBorder: false, mainBenefit: false },
  ]);
  const [dac6State, setDac6State] = useState<ModuleState<Dac6ScanMetrics>>(createInitialState());

  const [p2Scenario, setP2Scenario] = useState('Q2 Pillar Two monitoring');
  const [p2PreparedBy, setP2PreparedBy] = useState('pillar2@group.co');
  const [p2Rows, setP2Rows] = useState<Array<PillarTwoJurisdiction & { id: string }>>([
    { id: 'MT', name: 'Malta', globeIncome: 320000, coveredTaxes: 36000 },
    { id: 'IE', name: 'Ireland', globeIncome: 540000, coveredTaxes: 62000 },
  ]);
  const [p2State, setP2State] = useState<ModuleState<PillarTwoMetrics>>(createInitialState());

  const [treatyForm, setTreatyForm] = useState<{ scenario: string; preparedBy: string } & Parameters<typeof resolveTreaty>[0]>({
    scenario: 'PE query US vs MT',
    residenceCountry: 'Malta',
    sourceCountry: 'United States',
    issue: 'permanent_establishment',
    hasMapAccess: true,
    apaRequested: true,
    preparedBy: 'intl.tax@group.co',
  });
  const [treatyState, setTreatyState] = useState<ModuleState<TreatyResolverMetrics>>(createInitialState());

  const [giltiForm, setGiltiForm] = useState<{ scenario: string; preparedBy: string } & Parameters<typeof computeUsGilti>[0]>({
    scenario: 'CFC pool Q1',
    testedIncome: 980000,
    qbai: 450000,
    interestExpense: 60000,
    taxRate: 0.105,
    preparedBy: 'us.international@group.co',
  });
  const [giltiState, setGiltiState] = useState<ModuleState<UsGiltiMetrics>>(createInitialState());

  async function requestCalculation<TMetrics extends Record<string, unknown>>(
    url: string,
    payload: Record<string, unknown>,
    setState: Dispatch<SetStateAction<ModuleState<TMetrics>>>
  ) {
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(message.error ?? 'Request failed');
      }

      const data = (await response.json()) as ApiResponse<TMetrics>;
      setState({
        scenario: data.scenario,
        result: data.result,
        activity: data.activity,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  return (
    <main className="space-y-10 p-6" aria-labelledby="tax-workspaces-heading">
      <header className="space-y-2">
        <h1 id="tax-workspaces-heading" className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Multijurisdictional tax workspaces
        </h1>
        <p className="max-w-4xl text-sm text-neutral-600 dark:text-neutral-300">
          Coordinate Malta core engines, EU overlays, and international control packs with deterministic calculators, hand-off
          packages, and evidence exports. Each workspace captures telemetry and approval signals aligned to the Supabase schema
          introduced in phase two.
        </p>
      </header>

      <section className="space-y-6" aria-labelledby="malta-core-heading">
        <div className="space-y-1">
          <h2 id="malta-core-heading" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Malta core engines
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Automate CIT, participation benefits, ATAD ILR, and fiscal unity analytics before routing for approvals.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceCard title="Corporate income tax" description="Deterministic computation wired to the Supabase CIT ledger.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestCalculation<MaltaCitMetrics>('/api/tax/mt/cit/compute', {
                  scenario: citForm.scenario,
                  preparedBy: citForm.preparedBy,
                  revenue: Number(citForm.revenue),
                  deductions: Number(citForm.deductions),
                  carryForwardLosses: Number(citForm.carryForwardLosses),
                  adjustments: Number(citForm.adjustments),
                  taxRate: Number(citForm.taxRate),
                }, setCitState);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.scenario}
                    onChange={(event) => setCitForm({ ...citForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.preparedBy}
                    onChange={(event) => setCitForm({ ...citForm, preparedBy: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Revenue
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.revenue}
                    onChange={(event) => setCitForm({ ...citForm, revenue: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Deductions
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.deductions}
                    onChange={(event) => setCitForm({ ...citForm, deductions: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Carry forward losses
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.carryForwardLosses}
                    onChange={(event) => setCitForm({ ...citForm, carryForwardLosses: Number(event.target.value) })}
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Adjustments
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.adjustments}
                    onChange={(event) => setCitForm({ ...citForm, adjustments: Number(event.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Tax rate
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={citForm.taxRate}
                    onChange={(event) => setCitForm({ ...citForm, taxRate: Number(event.target.value) })}
                    min={0}
                    max={1}
                    required
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={citState.loading}
                >
                  {citState.loading ? 'Computing…' : 'Compute CIT'}
                </button>
                {citState.error && <span className="text-sm text-rose-600">{citState.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={citState.scenario} result={citState.result} activity={citState.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="Participation/NID" description="Model participation exemption and notional interest deductions.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const { scenario, ...inputs } = nidForm;
                const result = computeMaltaNid(inputs);
                setNidState({
                  scenario,
                  result,
                  activity: createLocalActivity(result.module, scenario, result, 'Participation benefit calculated'),
                  loading: false,
                  error: null,
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={nidForm.scenario}
                    onChange={(event) => setNidForm({ ...nidForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Equity base
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={nidForm.equityBase}
                    onChange={(event) => setNidForm({ ...nidForm, equityBase: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Risk-free rate
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={nidForm.riskFreeRate}
                    onChange={(event) => setNidForm({ ...nidForm, riskFreeRate: Number(event.target.value) })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Risk premium
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={nidForm.riskPremium ?? 0}
                    onChange={(event) => setNidForm({ ...nidForm, riskPremium: Number(event.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Statutory cap
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={nidForm.statutoryCap}
                    onChange={(event) => setNidForm({ ...nidForm, statutoryCap: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                >
                  Compute NID
                </button>
              </div>
            </form>
            <ResultPanel scenario={nidState.scenario} result={nidState.result} activity={nidState.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="ATAD ILR" description="Check exceeding borrowing costs against the 30% EBITDA threshold.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const { scenario, ...inputs } = atadForm;
                const result = evaluateAtadIlr(inputs);
                setAtadState({
                  scenario,
                  result,
                  activity: createLocalActivity(result.module, scenario, result, 'ATAD ILR calculation generated'),
                  loading: false,
                  error: null,
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={atadForm.scenario}
                    onChange={(event) => setAtadForm({ ...atadForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  EBITDA
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={atadForm.ebitda}
                    onChange={(event) => setAtadForm({ ...atadForm, ebitda: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Exceeding borrowing costs
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={atadForm.exceedingBorrowingCosts}
                    onChange={(event) => setAtadForm({ ...atadForm, exceedingBorrowingCosts: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Safe harbour allowance
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={atadForm.safeHarbourAllowance ?? 0}
                    onChange={(event) => setAtadForm({ ...atadForm, safeHarbourAllowance: Number(event.target.value) })}
                    min={0}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                >
                  Evaluate limitation
                </button>
              </div>
            </form>
            <ResultPanel scenario={atadState.scenario} result={atadState.result} activity={atadState.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="Fiscal unity" description="Assess consolidated profit and pooling benefits before elections.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const { scenario, ...inputs } = fiscalForm;
                const result = assessFiscalUnity(inputs);
                setFiscalState({
                  scenario,
                  result,
                  activity: createLocalActivity(result.module, scenario, result, 'Fiscal unity assessment logged'),
                  loading: false,
                  error: null,
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={fiscalForm.scenario}
                    onChange={(event) => setFiscalForm({ ...fiscalForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Parent profit
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={fiscalForm.parentProfit}
                    onChange={(event) => setFiscalForm({ ...fiscalForm, parentProfit: Number(event.target.value) })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Subsidiary profit
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={fiscalForm.subsidiaryProfit}
                    onChange={(event) => setFiscalForm({ ...fiscalForm, subsidiaryProfit: Number(event.target.value) })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Adjustments
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={fiscalForm.adjustments ?? 0}
                    onChange={(event) => setFiscalForm({ ...fiscalForm, adjustments: Number(event.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Elections
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={fiscalForm.elections ?? 0}
                    onChange={(event) => setFiscalForm({ ...fiscalForm, elections: Number(event.target.value) })}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                >
                  Run assessment
                </button>
              </div>
            </form>
            <ResultPanel scenario={fiscalState.scenario} result={fiscalState.result} activity={fiscalState.activity} />
          </WorkspaceCard>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="eu-overlays-heading">
        <div className="space-y-1">
          <h2 id="eu-overlays-heading" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            EU overlays
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Coordinate VAT returns, DAC6 evidence, and Pillar Two telemetry with automated refusal gates.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceCard title="VAT/OSS/IOSS" description="Prepare VAT periods and trigger refund or OSS reviews automatically.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestCalculation<VatPeriodMetrics>('/api/vat/period/prepare', {
                  scenario: vatForm.scenario,
                  preparedBy: vatForm.preparedBy,
                  sales: Number(vatForm.sales),
                  salesVatRate: Number(vatForm.salesVatRate),
                  purchases: Number(vatForm.purchases),
                  purchaseVatRate: Number(vatForm.purchaseVatRate),
                  scheme: vatForm.scheme,
                }, setVatState);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.scenario}
                    onChange={(event) => setVatForm({ ...vatForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.preparedBy}
                    onChange={(event) => setVatForm({ ...vatForm, preparedBy: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Sales
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.sales}
                    onChange={(event) => setVatForm({ ...vatForm, sales: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Sales VAT rate
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.salesVatRate}
                    onChange={(event) => setVatForm({ ...vatForm, salesVatRate: Number(event.target.value) })}
                    required
                    min={0}
                    max={1}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Purchases
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.purchases}
                    onChange={(event) => setVatForm({ ...vatForm, purchases: Number(event.target.value) })}
                    required
                    min={0}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Purchase VAT rate
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.purchaseVatRate}
                    onChange={(event) => setVatForm({ ...vatForm, purchaseVatRate: Number(event.target.value) })}
                    required
                    min={0}
                    max={1}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Scheme
                  <select
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={vatForm.scheme}
                    onChange={(event) => setVatForm({ ...vatForm, scheme: event.target.value as VatPeriodInput['scheme'] })}
                  >
                    <option value="domestic">Domestic</option>
                    <option value="oss">OSS</option>
                    <option value="ioss">IOSS</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={vatState.loading}
                >
                  {vatState.loading ? 'Preparing…' : 'Prepare period'}
                </button>
                {vatState.error && <span className="text-sm text-rose-600">{vatState.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={vatState.scenario} result={vatState.result} activity={vatState.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="DAC6 scanner" description="Score arrangements and highlight refusals based on hallmark risk.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const arrangements: Dac6Arrangement[] = dac6Arrangements.map((row) => ({
                  id: row.id,
                  hallmarkCategories: row.hallmarks.split(',').map((code) => code.trim()).filter(Boolean),
                  crossBorder: row.crossBorder,
                  mainBenefit: row.mainBenefit,
                }));
                requestCalculation<Dac6ScanMetrics>('/api/dac6/scan', {
                  scenario: dac6Scenario,
                  preparedBy: dac6PreparedBy,
                  arrangements,
                }, setDac6State);
              }}
            >
              <div className="grid gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={dac6Scenario}
                    onChange={(event) => setDac6Scenario(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={dac6PreparedBy}
                    onChange={(event) => setDac6PreparedBy(event.target.value)}
                  />
                </label>
                <div className="space-y-4">
                  {dac6Arrangements.map((row, index) => (
                    <fieldset key={row.id} className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                      <legend className="px-1 text-xs font-semibold uppercase text-neutral-500">Arrangement {index + 1}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                          Identifier
                          <input
                            className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                            value={row.id}
                            onChange={(event) => {
                              const next = [...dac6Arrangements];
                              next[index] = { ...row, id: event.target.value };
                              setDac6Arrangements(next);
                            }}
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          Hallmarks (comma separated)
                          <input
                            className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                            value={row.hallmarks}
                            onChange={(event) => {
                              const next = [...dac6Arrangements];
                              next[index] = { ...row, hallmarks: event.target.value };
                              setDac6Arrangements(next);
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={row.crossBorder}
                            onChange={(event) => {
                              const next = [...dac6Arrangements];
                              next[index] = { ...row, crossBorder: event.target.checked };
                              setDac6Arrangements(next);
                            }}
                          />
                          Cross-border
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={row.mainBenefit}
                            onChange={(event) => {
                              const next = [...dac6Arrangements];
                              next[index] = { ...row, mainBenefit: event.target.checked };
                              setDac6Arrangements(next);
                            }}
                          />
                          Main benefit test
                        </label>
                      </div>
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="text-sm font-medium text-neutral-700 underline transition hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-50"
                    onClick={() =>
                      setDac6Arrangements((current) => [
                        ...current,
                        { id: `ARR-${(current.length + 1).toString().padStart(3, '0')}`, hallmarks: '', crossBorder: false, mainBenefit: false },
                      ])
                    }
                  >
                    Add arrangement
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={dac6State.loading}
                >
                  {dac6State.loading ? 'Scanning…' : 'Scan arrangements'}
                </button>
                {dac6State.error && <span className="text-sm text-rose-600">{dac6State.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={dac6State.scenario} result={dac6State.result} activity={dac6State.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="Pillar Two" description="Monitor jurisdictional ETR and track top-up taxes with refusal gates.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const jurisdictions: PillarTwoJurisdiction[] = p2Rows.map(({ name, globeIncome, coveredTaxes }) => ({
                  name,
                  globeIncome: Number(globeIncome),
                  coveredTaxes: Number(coveredTaxes),
                }));
                requestCalculation<PillarTwoMetrics>('/api/p2/compute', {
                  scenario: p2Scenario,
                  preparedBy: p2PreparedBy,
                  jurisdictions,
                }, setP2State);
              }}
            >
              <div className="grid gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={p2Scenario}
                    onChange={(event) => setP2Scenario(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={p2PreparedBy}
                    onChange={(event) => setP2PreparedBy(event.target.value)}
                  />
                </label>
                <div className="space-y-4">
                  {p2Rows.map((row, index) => (
                    <fieldset key={row.id} className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                      <legend className="px-1 text-xs font-semibold uppercase text-neutral-500">Jurisdiction {index + 1}</legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1 text-sm">
                          Name
                          <input
                            className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                            value={row.name}
                            onChange={(event) => {
                              const next = [...p2Rows];
                              next[index] = { ...row, name: event.target.value };
                              setP2Rows(next);
                            }}
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          GloBE income
                          <input
                            type="number"
                            className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                            value={row.globeIncome}
                            onChange={(event) => {
                              const next = [...p2Rows];
                              next[index] = { ...row, globeIncome: Number(event.target.value) };
                              setP2Rows(next);
                            }}
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          Covered taxes
                          <input
                            type="number"
                            className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                            value={row.coveredTaxes}
                            onChange={(event) => {
                              const next = [...p2Rows];
                              next[index] = { ...row, coveredTaxes: Number(event.target.value) };
                              setP2Rows(next);
                            }}
                            required
                          />
                        </label>
                      </div>
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="text-sm font-medium text-neutral-700 underline transition hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-50"
                    onClick={() =>
                      setP2Rows((current) => [
                        ...current,
                        {
                          id: `J-${(current.length + 1).toString().padStart(2, '0')}`,
                          name: '',
                          globeIncome: 0,
                          coveredTaxes: 0,
                        },
                      ])
                    }
                  >
                    Add jurisdiction
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={p2State.loading}
                >
                  {p2State.loading ? 'Computing…' : 'Compute top-up'}
                </button>
                {p2State.error && <span className="text-sm text-rose-600">{p2State.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={p2State.scenario} result={p2State.result} activity={p2State.activity} />
          </WorkspaceCard>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="international-heading">
        <div className="space-y-1">
          <h2 id="international-heading" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            International tools & US overlays
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Steward treaty relief, MAP/APA coordination, and US GILTI computations with evidence exports.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceCard title="Treaty resolver" description="Recommend MAP, APA, or bilateral relief pathways with refusal gates.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestCalculation<TreatyResolverMetrics>('/api/treaty/resolve', {
                  scenario: treatyForm.scenario,
                  preparedBy: treatyForm.preparedBy,
                  residenceCountry: treatyForm.residenceCountry,
                  sourceCountry: treatyForm.sourceCountry,
                  issue: treatyForm.issue,
                  hasMapAccess: treatyForm.hasMapAccess,
                  apaRequested: treatyForm.apaRequested,
                }, setTreatyState);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={treatyForm.scenario}
                    onChange={(event) => setTreatyForm({ ...treatyForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={treatyForm.preparedBy}
                    onChange={(event) => setTreatyForm({ ...treatyForm, preparedBy: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Residence country
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={treatyForm.residenceCountry}
                    onChange={(event) => setTreatyForm({ ...treatyForm, residenceCountry: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Source country
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={treatyForm.sourceCountry}
                    onChange={(event) => setTreatyForm({ ...treatyForm, sourceCountry: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Issue
                  <select
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={treatyForm.issue}
                    onChange={(event) => setTreatyForm({ ...treatyForm, issue: event.target.value as TreatyResolverInput['issue'] })}
                  >
                    <option value="double_taxation">Double taxation</option>
                    <option value="permanent_establishment">Permanent establishment</option>
                    <option value="withholding_rate">Withholding rate</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={treatyForm.hasMapAccess}
                    onChange={(event) => setTreatyForm({ ...treatyForm, hasMapAccess: event.target.checked })}
                  />
                  MAP access available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={treatyForm.apaRequested}
                    onChange={(event) => setTreatyForm({ ...treatyForm, apaRequested: event.target.checked })}
                  />
                  APA requested
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={treatyState.loading}
                >
                  {treatyState.loading ? 'Resolving…' : 'Resolve treaty'}
                </button>
                {treatyState.error && <span className="text-sm text-rose-600">{treatyState.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={treatyState.scenario} result={treatyState.result} activity={treatyState.activity} />
          </WorkspaceCard>

          <WorkspaceCard title="US GILTI" description="Compute GILTI base, tax, and refusal gates for US overlays.">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestCalculation<UsGiltiMetrics>('/api/us/gilti/compute', {
                  scenario: giltiForm.scenario,
                  preparedBy: giltiForm.preparedBy,
                  testedIncome: Number(giltiForm.testedIncome),
                  qbai: Number(giltiForm.qbai),
                  interestExpense: Number(giltiForm.interestExpense ?? 0),
                  taxRate: Number(giltiForm.taxRate),
                }, setGiltiState);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Scenario
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.scenario}
                    onChange={(event) => setGiltiForm({ ...giltiForm, scenario: event.target.value })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Prepared by
                  <input
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.preparedBy}
                    onChange={(event) => setGiltiForm({ ...giltiForm, preparedBy: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Tested income
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.testedIncome}
                    onChange={(event) => setGiltiForm({ ...giltiForm, testedIncome: Number(event.target.value) })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Qualified business asset investment (QBAI)
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.qbai}
                    onChange={(event) => setGiltiForm({ ...giltiForm, qbai: Number(event.target.value) })}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Interest expense
                  <input
                    type="number"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.interestExpense ?? 0}
                    onChange={(event) => setGiltiForm({ ...giltiForm, interestExpense: Number(event.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Tax rate
                  <input
                    type="number"
                    step="0.001"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    value={giltiForm.taxRate}
                    onChange={(event) => setGiltiForm({ ...giltiForm, taxRate: Number(event.target.value) })}
                    min={0}
                    max={1}
                    required
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                  disabled={giltiState.loading}
                >
                  {giltiState.loading ? 'Computing…' : 'Compute GILTI'}
                </button>
                {giltiState.error && <span className="text-sm text-rose-600">{giltiState.error}</span>}
              </div>
            </form>
            <ResultPanel scenario={giltiState.scenario} result={giltiState.result} activity={giltiState.activity} />
          </WorkspaceCard>
        </div>
      </section>
    </main>
  );
}
