export const AUTONOMY_LEVELS = ['L0', 'L1', 'L2', 'L3'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AUTONOMY_LEVEL_ORDER: Record<AutonomyLevel, number> = AUTONOMY_LEVELS.reduce(
  (acc, level, index) => {
    acc[level] = index;
    return acc;
  },
  {} as Record<AutonomyLevel, number>,
);

export const DEFAULT_AUTONOMY_LEVEL = 'L2' as const;

export const DEFAULT_AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  L0: 'Manual: user triggers everything',
  L1: 'Suggest: agent proposes actions; user approves',
  L2: 'Auto-prepare: agent drafts & stages; user approves to submit/file',
  L3: 'Autopilot: agent executes within policy; asks only if evidence is missing',
};

export const DEFAULT_AUTOPILOT_ALLOWANCES: Record<AutonomyLevel, readonly string[]> = {
  L0: [],
  L1: ['refresh_analytics'],
  L2: [
    'extract_documents',
    'remind_pbc',
    'refresh_analytics',
    'close_cycle',
    'audit_fieldwork',
    'tax_cycle',
  ],
  L3: [
    'extract_documents',
    'remind_pbc',
    'refresh_analytics',
    'close_cycle',
    'audit_fieldwork',
    'tax_cycle',
  ],
};

export const ORG_ROLES = [
  'SYSTEM_ADMIN',
  'PARTNER',
  'MANAGER',
  'EMPLOYEE',
  'CLIENT',
  'READONLY',
  'SERVICE_ACCOUNT',
  'EQR',
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_SET = new Set<string>(ORG_ROLES);

export const isOrgRole = (value: unknown): value is OrgRole =>
  typeof value === 'string' && ORG_ROLE_SET.has(value.trim().toUpperCase());

export const isAutonomyLevel = (value: unknown): value is AutonomyLevel =>
  typeof value === 'string' &&
  AUTONOMY_LEVELS.includes(value.trim().toUpperCase() as AutonomyLevel);

export const cloneDefaultAutopilotAllowances = (): Record<AutonomyLevel, string[]> => ({
  L0: [...DEFAULT_AUTOPILOT_ALLOWANCES.L0],
  L1: [...DEFAULT_AUTOPILOT_ALLOWANCES.L1],
  L2: [...DEFAULT_AUTOPILOT_ALLOWANCES.L2],
  L3: [...DEFAULT_AUTOPILOT_ALLOWANCES.L3],
});
