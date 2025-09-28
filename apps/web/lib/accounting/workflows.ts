import {
  ACCOUNTING_MODULES,
} from './metadata';
import {
  AccountingModule,
  ModuleExecutionResult,
  ModuleInput,
  ApprovalDecision,
  ApprovalSnapshot,
  ModuleStatus,
} from './types';

interface RoleDefinition {
  role: string;
  optional?: boolean;
}

const REQUIRED_APPROVALS: Record<AccountingModule, RoleDefinition[]> = {
  consolidation: [
    { role: 'Controller' },
    { role: 'CFO' },
  ],
  revenue: [
    { role: 'Revenue Operations' },
    { role: 'Finance Business Partner' },
  ],
  leases: [
    { role: 'Real Estate' },
    { role: 'Corporate Finance' },
  ],
  ecl: [
    { role: 'Risk' },
    { role: 'Treasury' },
  ],
  impairment: [
    { role: 'FP&A' },
    { role: 'Valuations' },
  ],
  tax: [
    { role: 'Local Controller' },
    { role: 'Group Tax' },
  ],
  cashflow: [
    { role: 'Treasury' },
    { role: 'Financial Controller' },
  ],
  disclosures: [
    { role: 'Note Owner' },
    { role: 'Technical Accounting' },
  ],
  esef: [
    { role: 'Tagging Lead' },
    { role: 'Regulatory Reporting' },
  ],
  gapsme: [
    { role: 'Local GAAP SME' },
    { role: 'Statutory Owner' },
  ],
  industry: [
    { role: 'Engagement Lead' },
    { role: 'Risk' },
  ],
  specialised: [
    { role: 'Industry SME' },
    { role: 'Engagement Lead' },
  ],
  telemetry: [
    { role: 'Control Room' },
  ],
};

const MODULE_ACTION: Record<AccountingModule, string> = {
  consolidation: 'consolidation-run',
  revenue: 'revenue-contract-evaluation',
  leases: 'lease-measurement',
  ecl: 'ecl-portfolio-assessment',
  impairment: 'impairment-review',
  tax: 'tax-pack-build',
  cashflow: 'cash-flow-plan',
  disclosures: 'disclosure-draft',
  esef: 'esef-export',
  gapsme: 'basis-switch',
  industry: 'industry-toggle',
  specialised: 'specialised-pack',
  telemetry: 'telemetry-signal',
};

function normaliseRole(value?: string): string | undefined {
  return value?.toLowerCase();
}

function ensureDecidedAt(
  decision: ApprovalDecision,
): string | undefined {
  if (decision.decision === 'pending') {
    return decision.decidedAt;
  }

  return decision.decidedAt ?? new Date().toISOString();
}

function buildApprovalSnapshots(
  module: AccountingModule,
  approvals: ApprovalDecision[] = [],
): ApprovalSnapshot[] {
  const required = REQUIRED_APPROVALS[module] ?? [];
  const snapshotByRole = new Map<string, ApprovalSnapshot>();

  for (const requirement of required) {
    const lookupRole = requirement.role.toLowerCase();
    const existing = approvals.find(
      (item) => normaliseRole(item.role) === lookupRole,
    );
    snapshotByRole.set(requirement.role, {
      role: requirement.role,
      required: !requirement.optional,
      approverId: existing?.approverId,
      decision: existing?.decision ?? 'pending',
      notes: existing?.notes,
      decidedAt: existing ? ensureDecidedAt(existing) : undefined,
    });
  }

  for (const decision of approvals) {
    const role = decision.role ?? 'Supplemental';
    const roleKey = role.toLowerCase();
    const alreadyRepresented = [...snapshotByRole.keys()].some(
      (key) => key.toLowerCase() === roleKey,
    );

    if (!alreadyRepresented) {
      snapshotByRole.set(`${role}-${snapshotByRole.size}`, {
        role,
        required: false,
        approverId: decision.approverId,
        decision: decision.decision,
        notes: decision.notes,
        decidedAt: ensureDecidedAt(decision),
      });
    }
  }

  return [...snapshotByRole.values()];
}

function deriveStatus(approvals: ApprovalSnapshot[]): ModuleStatus {
  if (approvals.some((item) => item.decision === 'rejected')) {
    return 'blocked';
  }

  const required = approvals.filter((item) => item.required);
  if (required.length === 0) {
    return approvals.length > 0 ? 'ready' : 'pending_approval';
  }

  if (required.some((item) => item.decision === 'pending')) {
    return 'pending_approval';
  }

  return 'ready';
}

function generateTraceId(module: AccountingModule): string {
  return `${module}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createTrace(
  module: AccountingModule,
  input: ModuleInput,
  metadata: Record<string, unknown>,
  approvals: ApprovalSnapshot[],
): ModuleExecutionResult['trace'] {
  return {
    id: generateTraceId(module),
    module,
    orgId: input.orgId,
    actorId: input.actorId,
    action: MODULE_ACTION[module],
    approvals: approvals.map(({ role, decision, approverId, notes, decidedAt }) => ({
      role,
      decision,
      approverId,
      notes,
      decidedAt,
    })),
    metadata: {
      ...(input.metadata ?? {}),
      ...metadata,
    },
    createdAt: new Date().toISOString(),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function buildResult(
  module: AccountingModule,
  input: ModuleInput,
  summary: string,
  metrics: Record<string, number>,
  nextSteps: string[],
  context: Record<string, unknown>,
): ModuleExecutionResult {
  const approvals = buildApprovalSnapshots(module, input.approvals);
  const status = deriveStatus(approvals);
  const trace = createTrace(module, input, {
    metrics,
    context,
  }, approvals);

  return {
    module,
    status,
    summary,
    approvals,
    trace,
    metrics,
    nextSteps,
    context,
  };
}

export function runConsolidation(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const entities = ensureArray<string>(payload.entities);
  const eliminations = toNumber(payload.eliminations, Math.max(entities.length - 1, 0));
  const adjustments = toNumber(payload.adjustments, 0);
  const summary = `Consolidation run for ${
    (payload.period as string) ?? 'unspecified period'
  } covering ${entities.length} entities.`;

  return buildResult(
    'consolidation',
    input,
    summary,
    {
      entityCount: entities.length,
      eliminations,
      adjustments,
    },
    [
      'Review elimination proposals with controllers',
      'Capture CFO approval and release to reporting pack',
    ],
    {
      period: payload.period,
      entityScope: entities,
    },
  );
}

export function evaluateRevenueContracts(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const obligations = ensureArray<Record<string, unknown>>(
    payload.performanceObligations,
  );
  const obligationCount = obligations.length;
  const transactionPrice = toNumber(payload.transactionPrice, 0);
  const averageAllocation = obligationCount
    ? obligations.reduce((total, item) => total + toNumber(item.allocation, 0), 0) /
      obligationCount
    : 0;

  return buildResult(
    'revenue',
    input,
    `Revenue contract ${payload.contractCode ?? 'unnamed'} prepared for review.`,
    {
      contractValue: transactionPrice,
      obligationCount,
      averageAllocation,
    },
    [
      'Validate standalone selling price matrix',
      'Route for revenue operations approval',
      'Push release schedule to disclosure composer',
    ],
    {
      customer: payload.customer,
      obligations,
    },
  );
}

export function measureLeases(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const leases = ensureArray<Record<string, unknown>>(payload.leases);
  const totalLeases = leases.length;
  const totalPayments = leases.reduce(
    (total, lease) => total + toNumber(lease.payments, 0),
    0,
  );
  const averageTerm = totalLeases
    ? leases.reduce((total, lease) => total + toNumber(lease.termMonths, 0), 0) /
      totalLeases
    : 0;

  return buildResult(
    'leases',
    input,
    `Lease measurement prepared for ${totalLeases} arrangements.`,
    {
      leaseCount: totalLeases,
      totalPayments,
      averageTerm,
    },
    [
      'Validate commencement dates and renewal options',
      'Confirm discount rate with corporate finance',
      'Publish amortisation schedule to cash flow builder',
    ],
    {
      discountRate: payload.discountRate,
      commencement: payload.commencement,
      leases,
    },
  );
}

export function runEclAssessment(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const exposure = toNumber(payload.exposureAtDefault, 0);
  const pd = toNumber(payload.probabilityOfDefault, 0);
  const lgd = toNumber(payload.lossGivenDefault, 0);
  const expectedLoss = exposure * pd * lgd;

  return buildResult(
    'ecl',
    input,
    `ECL scenario prepared for ${payload.portfolio ?? 'portfolio'}.`,
    {
      exposure,
      probabilityOfDefault: pd,
      lossGivenDefault: lgd,
      expectedLoss,
    },
    [
      'Review staging movement matrix with risk team',
      'Apply macro-economic overlays approved by treasury',
      'Reconcile expected losses back to GL balances',
    ],
    {
      portfolio: payload.portfolio,
    },
  );
}

export function runImpairmentTest(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const carrying = toNumber(payload.carryingAmount, 0);
  const recoverable = toNumber(payload.recoverableAmount, 0);
  const headroom = recoverable - carrying;

  return buildResult(
    'impairment',
    input,
    `Impairment analysis for ${payload.cgu ?? 'CGU'} generated.`,
    {
      carryingAmount: carrying,
      recoverableAmount: recoverable,
      headroom,
    },
    [
      'Validate VIU assumptions with FP&A',
      'Confirm discount rate with valuations team',
      'Document sensitivity outcomes for board reporting',
    ],
    {
      cgu: payload.cgu,
      growthRate: payload.growthRate,
    },
  );
}

export function buildTaxPack(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const jurisdictions = ensureArray<Record<string, unknown>>(payload.jurisdictions);
  const jurisdictionCount = jurisdictions.length;
  const currentTax = jurisdictions.reduce(
    (total, item) => total + toNumber(item.currentTax, 0),
    0,
  );
  const deferred = toNumber(payload.deferredAdjustments, 0);
  const effectiveRate = currentTax === 0
    ? 0
    : (currentTax + deferred) /
      Math.max(
        jurisdictions.reduce(
          (total, item) => total + toNumber(item.taxableProfit, 0),
          0,
        ),
        1,
      );

  return buildResult(
    'tax',
    input,
    `Tax pack compiled for ${jurisdictionCount} jurisdictions.`,
    {
      jurisdictionCount,
      currentTax,
      deferred,
      effectiveTaxRate: effectiveRate,
    },
    [
      'Route to local controllers for review',
      'Apply group tax adjustments and effective rate analysis',
      'Link final pack to disclosure composer',
    ],
    {
      jurisdictions,
    },
  );
}

export function buildCashFlow(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const operating = (payload.operatingActivities ?? {}) as Record<string, unknown>;
  const investing = (payload.investingActivities ?? {}) as Record<string, unknown>;
  const financing = (payload.financingActivities ?? {}) as Record<string, unknown>;

  const operatingNet = Object.values(operating).reduce(
    (total, value) => total + toNumber(value, 0),
    0,
  );
  const investingNet = Object.values(investing).reduce(
    (total, value) => total + toNumber(value, 0),
    0,
  );
  const financingNet = Object.values(financing).reduce(
    (total, value) => total + toNumber(value, 0),
    0,
  );
  const netChange = operatingNet + investingNet + financingNet;

  return buildResult(
    'cashflow',
    input,
    `Cash flow statement assembled using ${payload.method ?? 'indirect'} method.`,
    {
      operatingNet,
      investingNet,
      financingNet,
      netChange,
    },
    [
      'Reconcile opening and closing cash balances',
      'Validate covenant ratios and liquidity headroom',
      'Publish scenario to management dashboard',
    ],
    {
      method: payload.method,
      operating,
      investing,
      financing,
    },
  );
}

export function composeDisclosure(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const highlights = ensureArray<string>(payload.highlights);
  const reviewers = ensureArray<string>(payload.reviewers);

  return buildResult(
    'disclosures',
    input,
    `Disclosure draft for ${payload.note ?? 'note'} ready for review.`,
    {
      highlightCount: highlights.length,
      reviewerCount: reviewers.length,
    },
    [
      'Collect narrative sign-offs from note owners',
      'Align terminology with technical accounting',
      'Attach supporting schedules for audit trail',
    ],
    {
      note: payload.note,
      highlights,
      reviewers,
    },
  );
}

export function exportEsefPackage(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const newConcepts = toNumber(payload.newConcepts, 0);
  const warnings = ensureArray<string>(payload.warnings);

  return buildResult(
    'esef',
    input,
    `ESEF export prepared for ${payload.documentType ?? 'filing'}.`,
    {
      taxonomyConcepts: newConcepts,
      warningCount: warnings.length,
    },
    [
      'Resolve outstanding validation warnings',
      'Update tagging coverage report',
      'Package viewer and taxonomy for submission',
    ],
    {
      taxonomy: payload.taxonomy,
      documentType: payload.documentType,
      warnings,
    },
  );
}

export function runBasisSwitch(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const adjustments = ensureArray<Record<string, unknown>>(payload.adjustments);
  const adjustmentImpact = adjustments.reduce(
    (total, item) => total + toNumber(item.impact, 0),
    0,
  );

  return buildResult(
    'gapsme',
    input,
    `Basis switch from ${payload.sourceFramework ?? 'IFRS'} to ${
      payload.targetFramework ?? 'target framework'
    } staged.`,
    {
      adjustmentCount: adjustments.length,
      adjustmentImpact,
    },
    [
      'Review delta analysis with statutory owners',
      'Confirm disclosure impacts and local GAAP notes',
      'Archive switch trace for regulator access',
    ],
    {
      sourceFramework: payload.sourceFramework,
      targetFramework: payload.targetFramework,
      adjustments,
    },
  );
}

export function configureIndustryToggles(
  input: ModuleInput,
): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const industries = ensureArray<string>(payload.industries);
  const toggles = ensureArray<Record<string, unknown>>(payload.toggles);
  const enabled = toggles.filter((toggle) => Boolean(toggle.enabled)).length;

  return buildResult(
    'industry',
    input,
    `Industry toggles configured for ${industries.join(', ') || 'selected sectors'}.`,
    {
      industryCount: industries.length,
      toggleCount: toggles.length,
      enabledToggles: enabled,
    },
    [
      'Confirm toggle scope with risk and compliance',
      'Sync switches to specialised pack templates',
      'Log activation summary in governance telemetry',
    ],
    {
      industries,
      toggles,
    },
  );
}

export function assembleSpecialisedPack(
  input: ModuleInput,
): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const metrics = ensureArray<string>(payload.metrics);
  const questionnaire = ensureArray<string>(payload.questionnaire);

  return buildResult(
    'specialised',
    input,
    `Specialised pack for ${payload.industry ?? 'industry'} assembled.`,
    {
      metricCount: metrics.length,
      questionnaireCount: questionnaire.length,
    },
    [
      'Share pack with engagement lead for approval',
      'Collect SME commentary on key metrics',
      'Enable telemetry monitoring for pack usage',
    ],
    {
      industry: payload.industry,
      metrics,
      questionnaire,
    },
  );
}

export function recordTelemetry(input: ModuleInput): ModuleExecutionResult {
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const moduleSignals = ensureArray<Record<string, unknown>>(payload.signals);
  const severity = payload.severity as string | undefined;
  const highSeverity = moduleSignals.filter(
    (item) => (item.severity as string | undefined)?.toLowerCase() === 'high',
  ).length;

  return buildResult(
    'telemetry',
    input,
    `Telemetry feed processed for ${payload.module ?? 'module'}.`,
    {
      signalCount: moduleSignals.length,
      highSeverity,
    },
    [
      'Route high severity alerts to control room',
      'Capture acknowledgement within SLA',
      'Feed summary to governance dashboard',
    ],
    {
      module: payload.module,
      severity,
      signals: moduleSignals,
    },
  );
}

export type ModuleHandler = (input: ModuleInput) => ModuleExecutionResult;

export const MODULE_HANDLERS: Record<AccountingModule, ModuleHandler> = {
  consolidation: runConsolidation,
  revenue: evaluateRevenueContracts,
  leases: measureLeases,
  ecl: runEclAssessment,
  impairment: runImpairmentTest,
  tax: buildTaxPack,
  cashflow: buildCashFlow,
  disclosures: composeDisclosure,
  esef: exportEsefPackage,
  gapsme: runBasisSwitch,
  industry: configureIndustryToggles,
  specialised: assembleSpecialisedPack,
  telemetry: recordTelemetry,
};

export function executeModule(
  module: AccountingModule,
  input: ModuleInput,
): ModuleExecutionResult {
  const handler = MODULE_HANDLERS[module];
  if (!handler) {
    throw new Error(`Unsupported module: ${module}`);
  }
  return handler(input);
}

export function getModuleDefinition(module: AccountingModule) {
  return ACCOUNTING_MODULES.find((item) => item.key === module);
}
