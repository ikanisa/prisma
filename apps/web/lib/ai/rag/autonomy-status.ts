export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';

export type AutonomyJobAllowance = {
  kind: string;
  label: string;
};

export type AutonomyAlert = {
  id: string;
  type?: string;
  severity?: string;
  message?: string;
  createdAt?: string;
};

export type AutonomyApproval = {
  id: string;
  action?: string;
  entityType?: string;
  requestedBy?: string;
  createdAt?: string;
};

export type AutonomySuggestion = {
  workflow?: string;
  label?: string;
  description?: string;
  step?: number;
  minimumAutonomy?: string;
  newRun?: boolean;
};

export type AutonomyStatusResponse = {
  autonomy: {
    level: string;
    description: string;
    floor: string;
    ceiling: string;
    allowedJobs: AutonomyJobAllowance[];
  };
  evidence: {
    open: number;
    alerts: AutonomyAlert[];
  };
  approvals: {
    pending: number;
    items: AutonomyApproval[];
  };
  suggestions: AutonomySuggestion[];
  autopilot: {
    next: Record<string, unknown> | null;
    domains: Array<Record<string, unknown>>;
  };
};

type TelemetryAlertRow = {
  id: string | number;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type ApprovalRow = {
  id: string | number;
  kind?: string | null;
  action?: string | null;
  entity_type?: string | null;
  requested_by_user_id?: string | null;
  requested_at?: string | null;
  created_at?: string | null;
  context_json?: Record<string, unknown> | null;
};

type JobRow = {
  id: string | number;
  kind?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  payload?: Record<string, unknown> | null;
};

const AUTONOMY_LEVELS: AutonomyLevel[] = ['L0', 'L1', 'L2', 'L3'];
const AUTONOMY_LEVEL_ORDER: Record<AutonomyLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
};

const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = 'L2';

const DEFAULT_AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  L0: 'Manual: user triggers everything',
  L1: 'Suggest: agent proposes actions; user approves',
  L2: 'Auto-prepare: agent drafts & stages; user approves to submit/file',
  L3: 'Autopilot: agent executes within policy; asks only if evidence is missing',
};

const DEFAULT_AUTOPILOT_ALLOWANCES: Record<AutonomyLevel, string[]> = {
  L0: [],
  L1: ['refresh_analytics'],
  L2: ['extract_documents', 'remind_pbc', 'refresh_analytics', 'close_cycle', 'audit_fieldwork', 'tax_cycle'],
  L3: ['extract_documents', 'remind_pbc', 'refresh_analytics', 'close_cycle', 'audit_fieldwork', 'tax_cycle'],
};

const AUTOPILOT_JOB_LABELS: Record<string, string> = {
  extract_documents: 'Extract documents',
  remind_pbc: 'Send PBC reminders',
  refresh_analytics: 'Refresh analytics',
  close_cycle: 'Accounting close cycle',
  audit_fieldwork: 'Audit fieldwork',
  tax_cycle: 'Tax cycle automation',
};

const WORKFLOW_SUGGESTIONS: AutonomySuggestion[] = [
  {
    workflow: 'onboarding_zero_typing',
    label: 'Start onboarding',
    description: 'Kick off the zero-typing journey',
    step: 0,
    minimumAutonomy: 'L2',
    newRun: true,
  },
  {
    workflow: 'close_autopilot',
    label: 'Prepare close cycle',
    description: 'Stage close steps with deterministic checks',
    step: 0,
    minimumAutonomy: 'L2',
    newRun: true,
  },
  {
    workflow: 'audit_fieldwork',
    label: 'Run audit fieldwork',
    description: 'Queue evidence requests and matching',
    step: 0,
    minimumAutonomy: 'L2',
    newRun: true,
  },
  {
    workflow: 'tax_cycle',
    label: 'Prepare tax cycle',
    description: 'Compute VAT/CIT and queue approvals',
    step: 0,
    minimumAutonomy: 'L2',
    newRun: true,
  },
];

const PENDING_JOB_STATUSES = new Set(['PENDING', 'RUNNING', 'SCHEDULED']);

export function resolveAutonomyLevel(value: unknown): AutonomyLevel {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (AUTONOMY_LEVELS.includes(normalized as AutonomyLevel)) {
      return normalized as AutonomyLevel;
    }
  }
  return DEFAULT_AUTONOMY_LEVEL;
}

function clampAutonomyLevel(level: AutonomyLevel, floor: AutonomyLevel, ceiling: AutonomyLevel): AutonomyLevel {
  let effective = level;
  if (AUTONOMY_LEVEL_ORDER[effective] < AUTONOMY_LEVEL_ORDER[floor]) {
    effective = floor;
  }
  if (AUTONOMY_LEVEL_ORDER[effective] > AUTONOMY_LEVEL_ORDER[ceiling]) {
    effective = ceiling;
  }
  return effective;
}

function resolveAutonomyDescription(level: AutonomyLevel): string {
  return DEFAULT_AUTONOMY_LABELS[level] ?? DEFAULT_AUTONOMY_LABELS[DEFAULT_AUTONOMY_LEVEL];
}

function resolveAllowedJobs(level: AutonomyLevel): AutonomyJobAllowance[] {
  return (DEFAULT_AUTOPILOT_ALLOWANCES[level] ?? []).map((kind) => ({
    kind,
    label: AUTOPILOT_JOB_LABELS[kind] ?? kind.replace(/_/g, ' '),
  }));
}

function resolveSuggestions(level: AutonomyLevel): AutonomySuggestion[] {
  const maxRank = AUTONOMY_LEVEL_ORDER[level];
  return WORKFLOW_SUGGESTIONS.filter((suggestion) => {
    if (!suggestion.minimumAutonomy) {
      return true;
    }
    const min = resolveAutonomyLevel(suggestion.minimumAutonomy);
    return AUTONOMY_LEVEL_ORDER[min] <= maxRank;
  });
}

function mapTelemetryAlerts(alerts: TelemetryAlertRow[]): AutonomyAlert[] {
  return alerts.map((row) => ({
    id: String(row.id),
    type: row.alert_type ?? undefined,
    severity: row.severity ?? undefined,
    message: row.message ?? undefined,
    createdAt: row.created_at ?? undefined,
  }));
}

function mapApprovals(rows: ApprovalRow[]): AutonomyApproval[] {
  return rows.map((row) => {
    const context = row.context_json ?? {};
    const entityType =
      row.entity_type ??
      (typeof context['entity'] === 'string' ? (context['entity'] as string) : undefined) ??
      (typeof context['toolKey'] === 'string' ? (context['toolKey'] as string) : undefined);

    return {
      id: String(row.id),
      action: row.action ?? row.kind ?? undefined,
      entityType,
      requestedBy: row.requested_by_user_id ?? undefined,
      createdAt: row.requested_at ?? row.created_at ?? undefined,
    };
  });
}

function mapAutopilotDomains(jobs: JobRow[]): Array<Record<string, unknown>> {
  const domains: Array<Record<string, unknown>> = [];
  for (const job of jobs) {
    const payload = job.payload ?? {};
    const lastRun = (payload as Record<string, unknown>)['lastRun'] as Record<string, unknown> | undefined;
    const result = lastRun && typeof lastRun === 'object'
      ? (lastRun['result'] as Record<string, unknown> | undefined)
      : undefined;
    if (!result || typeof result !== 'object') {
      continue;
    }
    const domain = result['domain'];
    if (typeof domain !== 'string') {
      continue;
    }
    domains.push({
      domain,
      domainLabel: result['domainLabel'] ?? null,
      summary: result['summary'] ?? null,
      approvals: result['approvals'] ?? null,
      telemetry: result['telemetry'] ?? null,
      run: result['run'] ?? null,
    });
  }
  return domains;
}

function resolveNextAutopilotJob(jobs: JobRow[]): Record<string, unknown> | null {
  const pending = jobs
    .filter((job) => {
      const status = typeof job.status === 'string' ? job.status.toUpperCase() : '';
      return PENDING_JOB_STATUSES.has(status);
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.scheduled_at ?? a.created_at ?? '') || 0;
      const bTime = Date.parse(b.scheduled_at ?? b.created_at ?? '') || 0;
      return aTime - bTime;
    });

  if (pending.length === 0) {
    return null;
  }

  const next = pending[0];
  return {
    id: String(next.id),
    kind: next.kind ?? null,
    status: next.status ?? null,
    scheduledAt: next.scheduled_at ?? next.created_at ?? null,
  };
}

export function buildAutonomyStatusSnapshot(options: {
  orgAutonomyLevel?: string | null;
  autonomyFloor?: string | null;
  autonomyCeiling?: string | null;
  telemetryAlerts?: TelemetryAlertRow[];
  approvals?: ApprovalRow[];
  jobs?: JobRow[];
  telemetryTotal?: number | null;
  approvalsTotal?: number | null;
}): AutonomyStatusResponse {
  const orgLevel = resolveAutonomyLevel(options.orgAutonomyLevel ?? undefined);
  const floor = resolveAutonomyLevel(options.autonomyFloor ?? orgLevel);
  const ceiling = resolveAutonomyLevel(options.autonomyCeiling ?? orgLevel);
  const effectiveLevel = clampAutonomyLevel(orgLevel, floor, ceiling);

  const telemetryAlerts = options.telemetryAlerts ?? [];
  const approvalRows = options.approvals ?? [];
  const jobs = options.jobs ?? [];

  return {
    autonomy: {
      level: effectiveLevel,
      description: resolveAutonomyDescription(effectiveLevel),
      floor,
      ceiling,
      allowedJobs: resolveAllowedJobs(effectiveLevel),
    },
    evidence: {
      open: options.telemetryTotal ?? telemetryAlerts.length,
      alerts: mapTelemetryAlerts(telemetryAlerts),
    },
    approvals: {
      pending: options.approvalsTotal ?? approvalRows.length,
      items: mapApprovals(approvalRows),
    },
    suggestions: resolveSuggestions(effectiveLevel),
    autopilot: {
      next: resolveNextAutopilotJob(jobs),
      domains: mapAutopilotDomains(jobs),
    },
  };
}
