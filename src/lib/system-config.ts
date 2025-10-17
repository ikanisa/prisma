import { useMemo } from 'react';
import type { TargetAndTransition, Transition } from 'framer-motion';
import { parse } from 'yaml';
import rawSystemConfig from '../../config/system.yaml?raw';
import {
  AUTONOMY_LEVEL_ORDER,
  DEFAULT_AUTONOMY_LABELS,
  DEFAULT_AUTONOMY_LEVEL,
  cloneDefaultAutopilotAllowances,
  type AutonomyLevel,
} from './config/constants';

export type { AutonomyLevel } from './config/constants';

export interface SystemConfig {
  meta?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
  ui?: {
    shell?: {
      assistant_dock?: boolean;
      assistant_position?: string;
      style?: {
        theme?: string;
        motion?: string;
        pwa_enabled?: boolean;
        mobile_first?: boolean;
        [key: string]: unknown;
      };
      entry_points?: Array<{ page: string; chips?: string[] }>;
      [key: string]: unknown;
    };
    empty_states?: Record<string, string>;
    [key: string]: unknown;
  };
  repositories?: {
    folders?: string[];
    pbc_subfolders?: string[];
    [key: string]: unknown;
  };
  rbac?: {
    permissions?: Record<string, string>;
    client_portal_scope?: {
      allowed_repos?: unknown;
      denied_actions?: unknown;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  autonomy?: {
    levels?: Record<string, unknown>;
    default_level?: unknown;
    autopilot?: {
      allowed_jobs?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  data_sources?: {
    google_drive?: {
      enabled?: unknown;
      oauth_required_scopes?: unknown;
      folder_mapping_pattern?: unknown;
      mirror_to_storage?: unknown;
      [key: string]: unknown;
    };
    url_sources?: {
      allowed_domains?: unknown;
      fetch_policy?: {
        obey_robots?: unknown;
        max_depth?: unknown;
        cache_ttl_minutes?: unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    email_ingest?: {
      enabled?: unknown;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  datasources?: {
    google_drive?: Record<string, unknown>;
    url_sources?: Record<string, unknown>;
    email_ingest?: Record<string, unknown>;
    [key: string]: unknown;
  };
  assistant_policies?: {
    style_rules?: string[];
    [key: string]: unknown;
  };
  document_ai?: {
    pipeline?: {
      steps?: unknown;
      classifiers?: { types?: unknown; [key: string]: unknown };
      extractors?: Record<string, unknown>;
      provenance?: unknown;
      error_handling?: unknown;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  workflows?: Record<string, unknown>;
  user_journeys?: Array<Record<string, unknown>>;
  notifications?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
  a11y_and_perf?: Record<string, unknown>;
  release_controls?: Record<string, unknown>;
  tools?: Array<{
    name?: string;
    required_permission?: unknown;
    rate_limit_per_minute?: unknown;
    rate_limit_window_seconds?: unknown;
    [key: string]: unknown;
  }>;
  agents?: Array<{
    id?: string;
    title?: string;
    persona?: Record<string, unknown>;
    default_autonomy?: unknown;
    tools?: unknown;
    actions?: unknown;
    approvals_required?: unknown;
    playbooks?: unknown;
    [key: string]: unknown;
  }>;
  rag?: Record<string, unknown>;
  knowledge?: {
    vector_indexes?: Array<Record<string, unknown>>;
    retrieval?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const parsedConfig = parse(rawSystemConfig) as SystemConfig;

type MotionConfig = {
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
};

export interface AssistantMotionPreset {
  toggle: MotionConfig;
  panel: MotionConfig;
}

export interface AssistantDockThemeTokens {
  accentGradient: string;
  toggleSurface: string;
  toggleBorder: string;
  panelSurface: string;
  panelBorder: string;
}

export interface ShellThemeTokens {
  id: string;
  backgroundClass: string;
  motion: string;
}

const ASSISTANT_POSITIONS: Record<string, string> = {
  'bottom-right': 'fixed bottom-6 right-6 z-50',
  'bottom-left': 'fixed bottom-6 left-6 z-50',
  'top-right': 'fixed top-6 right-6 z-50',
  'top-left': 'fixed top-6 left-6 z-50',
};

const ASSISTANT_MOTION_PRESETS: Record<string, AssistantMotionPreset> = {
  subtle: {
    toggle: {
      initial: { opacity: 0, scale: 0.9, y: 12 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9, y: 12 },
      transition: { duration: 0.2 },
    },
    panel: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.2 },
    },
  },
  energetic: {
    toggle: {
      initial: { opacity: 0, scale: 0.8, y: 24 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.85, y: 24 },
      transition: { type: 'spring', stiffness: 220, damping: 22 },
    },
    panel: {
      initial: { opacity: 0, scale: 0.9, y: 16 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.92, y: 20 },
      transition: { type: 'spring', stiffness: 200, damping: 26 },
    },
  },
};

const ASSISTANT_THEME_PRESETS: Record<string, AssistantDockThemeTokens> = {
  'modern-gradient': {
    accentGradient: 'from-primary via-primary/80 to-violet-500/80',
    toggleSurface: 'bg-background/95',
    toggleBorder: 'border border-border/70',
    panelSurface: 'bg-card/95',
    panelBorder: 'border border-border',
  },
  minimal: {
    accentGradient: 'from-primary to-primary/70',
    toggleSurface: 'bg-background',
    toggleBorder: 'border border-border/60',
    panelSurface: 'bg-card',
    panelBorder: 'border border-border/60',
  },
};

const SHELL_THEME_PRESETS: Record<string, Omit<ShellThemeTokens, 'motion'>> = {
  'modern-gradient': {
    id: 'modern-gradient',
    backgroundClass: 'bg-slate-950 text-slate-50',
  },
  minimal: {
    id: 'minimal',
    backgroundClass: 'bg-background text-foreground',
  },
};

const DEFAULT_ASSISTANT_POSITION = 'bottom-right';
const DEFAULT_MOTION_PRESET = 'subtle';
const DEFAULT_THEME_PRESET = 'modern-gradient';
const DEFAULT_CLIENT_ALLOWED_REPOS = ['02_Tax/PBC', '03_Accounting/PBC', '05_Payroll/PBC'];
const DEFAULT_DOCUMENT_AI_STEPS = ['ocr', 'classify', 'extract', 'index'] as const;
const DEFAULT_DOCUMENT_AI_ERROR_MODE = 'quarantine_and_notify';
const DEFAULT_URL_ALLOWED_DOMAINS = ['*'];
export const DEFAULT_ROLE_HIERARCHY = [
  'SERVICE_ACCOUNT',
  'READONLY',
  'CLIENT',
  'EMPLOYEE',
  'MANAGER',
  'EQR',
  'PARTNER',
  'SYSTEM_ADMIN',
] as const;

const DEFAULT_GOOGLE_DRIVE_SETTINGS = {
  enabled: false,
  oauthScopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
  folderMappingPattern: 'org-{orgId}/entity-{entityId}/{repoFolder}',
  mirrorToStorage: true,
} as const;

const DEFAULT_URL_FETCH_POLICY = {
  obeyRobots: true,
  maxDepth: 1,
  cacheTtlMinutes: 1440,
} as const;

const DEFAULT_EMAIL_INGEST_SETTINGS = {
  enabled: false,
} as const;

const DEFAULT_BEFORE_ASKING_SEQUENCE = ['documents', 'google_drive', 'url_sources'] as const;
const DEFAULT_RELEASE_CONTROL_SETTINGS: ReleaseControlSettings = {
  approvalsRequired: ['plan_freeze', 'filings_submit', 'report_release', 'period_lock'],
  archive: {
    manifestHash: 'sha256',
    includeDocs: [],
  },
  environment: {
    autonomy: {
      minimumLevel: DEFAULT_AUTONOMY_LEVEL,
      requireWorker: true,
      criticalRoles: ['MANAGER', 'PARTNER'],
    },
    mfa: {
      channel: 'WHATSAPP',
      withinSeconds: 86400,
    },
    telemetry: {
      maxOpenAlerts: 0,
      severityThreshold: 'WARNING',
    },
  },
};

export interface GoogleDriveSettings {
  enabled: boolean;
  oauthScopes: string[];
  folderMappingPattern: string;
  mirrorToStorage: boolean;
}

export interface UrlSourceFetchPolicy {
  obeyRobots: boolean;
  maxDepth: number;
  cacheTtlMinutes: number;
}

export interface UrlSourceSettings {
  allowedDomains: string[];
  fetchPolicy: UrlSourceFetchPolicy;
}

export interface EmailIngestSettings {
  enabled: boolean;
}

export interface ClientPortalScopeSettings {
  allowedRepos: string[];
  deniedActions: string[];
}

export interface DocumentAIPipelineConfig {
  steps: string[];
  classifierTypes: string[];
  extractors: Record<string, string[]>;
  provenanceRequired: boolean;
  errorHandling: string;
}

export interface KnowledgeVectorIndex {
  name: string;
  backend: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  scopeFilters: string[];
  seedSets: string[];
}

export interface KnowledgeRetrievalSettings {
  reranker: string;
  topK: number;
  minCitationConfidence: number;
  requireCitation: boolean;
}

export interface ToolPolicy {
  name: string;
  requiredPermission?: string;
  rateLimitPerMinute?: number;
  rateLimitWindowSeconds?: number;
}

export interface AgentPersona {
  summary?: string;
  voice?: string;
  [key: string]: unknown;
}

export interface AgentPlaybook {
  name: string;
  steps: string[];
}

export interface AgentDefinition {
  id: string;
  title?: string;
  defaultAutonomy?: string;
  tools: string[];
  actions: string[];
  approvalsRequired: string[];
  persona: AgentPersona;
  playbooks: AgentPlaybook[];
}

export interface WorkflowStep {
  agentId: string;
  tool: string;
  requiredAutonomy: AutonomyLevel;
}

export interface WorkflowDefinition {
  key: string;
  trigger?: string;
  requiredDocuments: Record<string, string[]>;
  steps: WorkflowStep[];
  approvals: string[];
  outputs: string[];
  minimumAutonomy: AutonomyLevel;
}

export interface ReleaseControlAutonomySettings {
  minimumLevel: AutonomyLevel;
  requireWorker: boolean;
  criticalRoles: string[];
}

export interface ReleaseControlMfaSettings {
  channel: string;
  withinSeconds: number;
}

export interface ReleaseControlTelemetrySettings {
  maxOpenAlerts: number;
  severityThreshold: string;
}

export interface ReleaseControlEnvironmentSettings {
  autonomy: ReleaseControlAutonomySettings;
  mfa: ReleaseControlMfaSettings;
  telemetry: ReleaseControlTelemetrySettings;
}

export interface ReleaseControlSettings {
  approvalsRequired: string[];
  archive: {
    manifestHash: string;
    includeDocs: string[];
  };
  environment: ReleaseControlEnvironmentSettings;
}

function normaliseStringList(value: unknown): string[] {
  const rawValues: unknown[] = [];
  if (Array.isArray(value)) {
    rawValues.push(...value);
  } else if (typeof value === 'string') {
    rawValues.push(...value.split(','));
  } else if (value != null) {
    rawValues.push(value);
  }

  const seen = new Set<string>();
  for (const entry of rawValues) {
    if (entry == null) continue;
    const text = typeof entry === 'string' ? entry.trim() : String(entry).trim();
    if (!text) continue;
    if (!seen.has(text)) {
      seen.add(text);
    }
  }
  return Array.from(seen);
}

function resolveRoleHierarchy(config: SystemConfig): string[] {
  const rolesConfig = config.rbac?.roles;
  const configured = normaliseStringList(rolesConfig ?? []);
  if (!configured.length) {
    return [...DEFAULT_ROLE_HIERARCHY];
  }

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const entry of configured) {
    const upper = entry.toUpperCase();
    if (!upper || seen.has(upper)) continue;
    seen.add(upper);
    ordered.push(upper);
  }

  for (const fallback of DEFAULT_ROLE_HIERARCHY) {
    if (seen.has(fallback)) continue;
    seen.add(fallback);
    ordered.push(fallback);
  }

  return ordered;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalised)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveGoogleDriveSettings(config: SystemConfig): GoogleDriveSettings {
  const legacyDrive = config.data_sources?.google_drive;
  const modernDrive = config.datasources?.google_drive;
  const drive = {
    ...(isRecord(legacyDrive) ? legacyDrive : {}),
    ...(isRecord(modernDrive) ? modernDrive : {}),
  } as Record<string, unknown>;
  const enabled = coerceBoolean(drive?.enabled);
  const scopes = (() => {
    const collected = normaliseStringList(drive?.oauth_required_scopes);
    return collected;
  })();
  const folderPattern =
    typeof drive?.folder_mapping_pattern === 'string' && drive.folder_mapping_pattern.trim().length > 0
      ? drive.folder_mapping_pattern.trim()
      : DEFAULT_GOOGLE_DRIVE_SETTINGS.folderMappingPattern;
  const mirror = coerceBoolean(drive?.mirror_to_storage);
  return {
    enabled: enabled ?? DEFAULT_GOOGLE_DRIVE_SETTINGS.enabled,
    oauthScopes: scopes.length ? scopes : [...DEFAULT_GOOGLE_DRIVE_SETTINGS.oauthScopes],
    folderMappingPattern: folderPattern,
    mirrorToStorage: mirror ?? DEFAULT_GOOGLE_DRIVE_SETTINGS.mirrorToStorage,
  };
}

function resolveUrlSourceSettings(config: SystemConfig): UrlSourceSettings {
  const legacyUrl = config.data_sources?.url_sources;
  const modernUrl = config.datasources?.url_sources;
  const urlSources = {
    ...(isRecord(legacyUrl) ? legacyUrl : {}),
    ...(isRecord(modernUrl) ? modernUrl : {}),
  } as Record<string, unknown>;
  const allowed = (() => {
    const allowedDomains = normaliseStringList(urlSources?.allowed_domains);
    if (allowedDomains.length) {
      return allowedDomains;
    }
    const whitelist = normaliseStringList(urlSources?.whitelist);
    if (whitelist.length) {
      return whitelist;
    }
    return [...DEFAULT_URL_ALLOWED_DOMAINS];
  })();

  const policySource = (() => {
    const fetchPolicy = urlSources?.fetch_policy;
    if (isRecord(fetchPolicy)) {
      return fetchPolicy;
    }
    if (isRecord(urlSources?.policy)) {
      return urlSources.policy as Record<string, unknown>;
    }
    return undefined;
  })();
  const obeyRobots = coerceBoolean(policySource?.obey_robots) ?? DEFAULT_URL_FETCH_POLICY.obeyRobots;
  const maxDepth = coerceNumber(policySource?.max_depth) ?? DEFAULT_URL_FETCH_POLICY.maxDepth;
  const cacheTtl = coerceNumber(policySource?.cache_ttl_minutes) ?? DEFAULT_URL_FETCH_POLICY.cacheTtlMinutes;

  return {
    allowedDomains: allowed,
    fetchPolicy: {
      obeyRobots,
      maxDepth: Math.max(0, Math.floor(maxDepth)),
      cacheTtlMinutes: Math.max(0, Math.floor(cacheTtl)),
    },
  };
}

function resolveEmailIngestSettings(config: SystemConfig): EmailIngestSettings {
  const ingest = {
    ...(isRecord(config.data_sources?.email_ingest) ? (config.data_sources?.email_ingest as Record<string, unknown>) : {}),
    ...(isRecord(config.datasources?.email_ingest) ? (config.datasources?.email_ingest as Record<string, unknown>) : {}),
  } as Record<string, unknown>;
  const enabled = coerceBoolean(ingest?.enabled);
  return {
    enabled: enabled ?? DEFAULT_EMAIL_INGEST_SETTINGS.enabled,
  };
}

function resolveBeforeAskingUserSequence(config: SystemConfig): string[] {
  const knowledge = config.knowledge as Record<string, unknown> | undefined;
  let before: unknown;
  if (knowledge && typeof knowledge === 'object') {
    const retrieval = knowledge.retrieval as Record<string, unknown> | undefined;
    if (retrieval && typeof retrieval === 'object') {
      const policy = retrieval.policy as Record<string, unknown> | undefined;
      if (policy && typeof policy === 'object') {
        before = policy.before_asking_user;
      }
    }
  }

  if (Array.isArray(before)) {
    const entries = normaliseStringList(before);
    if (entries.length) {
      return entries;
    }
  }

  if (typeof before === 'string' && before.trim().length > 0) {
    const entries = normaliseStringList(before.split(','));
    if (entries.length) {
      return entries;
    }
  }

  const rag = config.rag;
  if (isRecord(rag)) {
    const fallback = normaliseStringList(rag.before_asking_user ?? (isRecord(rag.policy) ? rag.policy.before_asking_user : undefined));
    if (fallback.length) {
      return fallback;
    }
  }

  return [...DEFAULT_BEFORE_ASKING_SEQUENCE];
}

function resolveToolPolicies(config: SystemConfig): ToolPolicy[] {
  const entries = Array.isArray(config.tools) ? config.tools : [];
  const policies: ToolPolicy[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) continue;
    const required = typeof entry.required_permission === 'string' ? entry.required_permission.trim() : undefined;
    const limit = coerceNumber(entry.rate_limit_per_minute);
    const windowSeconds = coerceNumber(entry.rate_limit_window_seconds);
    policies.push({
      name,
      requiredPermission: required && required.length > 0 ? required : undefined,
      rateLimitPerMinute: typeof limit === 'number' ? Math.max(0, Math.floor(limit)) : undefined,
      rateLimitWindowSeconds: typeof windowSeconds === 'number' ? Math.max(0, Math.floor(windowSeconds)) : undefined,
    });
  }
  return policies;
}

function resolveAgentDefinitions(config: SystemConfig): AgentDefinition[] {
  const entries = Array.isArray(config.agents) ? config.agents : [];
  const agents: AgentDefinition[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id) continue;
    const tools = normaliseStringList(entry.tools);
    const actions = normaliseStringList(entry.actions);
    const approvals = normaliseStringList(entry.approvals_required);
    const personaEntry = entry.persona as Record<string, unknown> | undefined;
    const persona: AgentPersona = {
      summary: typeof personaEntry?.summary === 'string' ? personaEntry.summary.trim() : undefined,
      voice: typeof personaEntry?.voice === 'string' ? personaEntry.voice.trim() : undefined,
    };
    const playbookEntries = Array.isArray(entry.playbooks) ? entry.playbooks : [];
    const playbooks: AgentPlaybook[] = [];
    for (const playbook of playbookEntries) {
      if (!playbook || typeof playbook !== 'object') continue;
      const name = typeof playbook.name === 'string' ? playbook.name.trim() : '';
      if (!name) continue;
      const steps = normaliseStringList(playbook.steps);
      playbooks.push({ name, steps });
    }
    const defaultAutonomy =
      typeof entry.default_autonomy === 'string' && entry.default_autonomy.trim().length > 0
        ? entry.default_autonomy.trim().toUpperCase()
        : undefined;

    agents.push({
      id,
      title: typeof entry.title === 'string' ? entry.title.trim() : undefined,
      defaultAutonomy,
      tools,
      actions,
      approvalsRequired: approvals,
      persona,
      playbooks,
    });
  }
  return agents;
}

function resolveWorkflowDefinitions(config: SystemConfig): WorkflowDefinition[] {
  const workflowsConfig = config.workflows;
  if (!workflowsConfig || typeof workflowsConfig !== 'object') {
    return [];
  }
  const agents = resolveAgentDefinitions(config);
  const defaultAutonomy = resolveAutonomyDefaultLevel(config);
  const agentAutonomy = new Map<string, AutonomyLevel>();
  const toolRegistry = new Map<string, AgentDefinition[]>();
  for (const agent of agents) {
    const level = coerceAutonomyLevel(agent.defaultAutonomy) ?? defaultAutonomy;
    agentAutonomy.set(agent.id, level);
    for (const tool of agent.tools) {
      const key = tool.toLowerCase();
      const existing = toolRegistry.get(key);
      if (existing) {
        existing.push(agent);
      } else {
        toolRegistry.set(key, [agent]);
      }
    }
  }
  const definitions: WorkflowDefinition[] = [];
  for (const [key, raw] of Object.entries(workflowsConfig)) {
    if (!raw || typeof raw !== 'object') continue;
    const triggerValue = (raw as Record<string, unknown>).trigger;
    const trigger = typeof triggerValue === 'string' ? triggerValue.trim() : undefined;
    const requiredDocuments: Record<string, string[]> = {};
    const requiredRaw = (raw as Record<string, unknown>).required_documents;
    if (requiredRaw && typeof requiredRaw === 'object') {
      for (const [category, value] of Object.entries(requiredRaw as Record<string, unknown>)) {
        requiredDocuments[category] = normaliseStringList(value);
      }
    }
    const outputs = normaliseStringList((raw as Record<string, unknown>).outputs);
    const approvals = (() => {
      const collected: string[] = [];
      const approvalsList = (raw as Record<string, unknown>).approvals;
      if (Array.isArray(approvalsList)) {
        collected.push(...normaliseStringList(approvalsList));
      }
      const singleApproval = (raw as Record<string, unknown>).approval;
      if (typeof singleApproval === 'string') {
        const trimmed = singleApproval.trim();
        if (trimmed) {
          collected.push(trimmed);
        }
      }
      return Array.from(new Set(collected));
    })();
    const stepEntries = Array.isArray((raw as Record<string, unknown>).steps)
      ? ((raw as Record<string, unknown>).steps as unknown[])
      : [];
    const steps: WorkflowStep[] = [];
    let minimumAutonomy = defaultAutonomy;
    let minimumRank = AUTONOMY_LEVEL_ORDER[minimumAutonomy] ?? 0;
    for (const entry of stepEntries) {
      if (typeof entry === 'string') {
        const toolName = entry.trim();
        if (!toolName) {
          continue;
        }
        const matches = toolRegistry.get(toolName.toLowerCase()) ?? [];
        const assignedAgent = matches[0];
        const agentId = assignedAgent?.id ?? toolName;
        const requiredAutonomy = assignedAgent
          ? agentAutonomy.get(assignedAgent.id) ?? defaultAutonomy
          : defaultAutonomy;
        const rank = AUTONOMY_LEVEL_ORDER[requiredAutonomy] ?? minimumRank;
        if (rank > minimumRank) {
          minimumRank = rank;
          minimumAutonomy = requiredAutonomy;
        }
        steps.push({ agentId, tool: toolName, requiredAutonomy });
        continue;
      }

      if (!entry || typeof entry !== 'object') continue;
      const pairs = Object.entries(entry as Record<string, unknown>);
      if (!pairs.length) continue;
      const [agentRaw, toolRaw] = pairs[0];
      const agentId = agentRaw.trim();
      const tool = typeof toolRaw === 'string' ? toolRaw.trim() : '';
      if (!agentId || !tool) continue;
      const requiredAutonomy = agentAutonomy.get(agentId) ?? defaultAutonomy;
      const rank = AUTONOMY_LEVEL_ORDER[requiredAutonomy] ?? minimumRank;
      if (rank > minimumRank) {
        minimumRank = rank;
        minimumAutonomy = requiredAutonomy;
      }
      steps.push({ agentId, tool, requiredAutonomy });
    }
    definitions.push({
      key,
      trigger,
      requiredDocuments,
      steps,
      approvals,
      outputs,
      minimumAutonomy,
    });
  }
  return definitions;
}

function resolveClientPortalScope(config: SystemConfig): ClientPortalScopeSettings {
  const scope = config.rbac?.client_portal_scope;
  const allowed = normaliseStringList(scope?.allowed_repos);
  const denied = normaliseStringList(scope?.denied_actions);
  return {
    allowedRepos: allowed.length > 0 ? allowed : [...DEFAULT_CLIENT_ALLOWED_REPOS],
    deniedActions: denied,
  };
}

export function getReleaseControlSettings(config: SystemConfig = parsedConfig): ReleaseControlSettings {
  const release = config.release_controls as Record<string, unknown> | undefined;
  let approvals = [...DEFAULT_RELEASE_CONTROL_SETTINGS.approvalsRequired];
  let manifestHash = DEFAULT_RELEASE_CONTROL_SETTINGS.archive.manifestHash;
  let includeDocs = [...DEFAULT_RELEASE_CONTROL_SETTINGS.archive.includeDocs];
  const defaultEnv = DEFAULT_RELEASE_CONTROL_SETTINGS.environment;
  const environment: ReleaseControlEnvironmentSettings = {
    autonomy: {
      minimumLevel: defaultEnv.autonomy.minimumLevel,
      requireWorker: defaultEnv.autonomy.requireWorker,
      criticalRoles: [...defaultEnv.autonomy.criticalRoles],
    },
    mfa: {
      channel: defaultEnv.mfa.channel,
      withinSeconds: defaultEnv.mfa.withinSeconds,
    },
    telemetry: {
      maxOpenAlerts: defaultEnv.telemetry.maxOpenAlerts,
      severityThreshold: defaultEnv.telemetry.severityThreshold,
    },
  };

  if (release) {
    const rawApprovals = release['approvals_required'];
    const approvalList = (() => {
      if (Array.isArray(rawApprovals)) return normaliseStringList(rawApprovals);
      if (typeof rawApprovals === 'string' && rawApprovals.trim().length > 0) {
        return normaliseStringList(rawApprovals.split(','));
      }
      return [];
    })();
    if (approvalList.length) {
      approvals = approvalList;
    }

    const archive = release['archive'] as Record<string, unknown> | undefined;
    if (archive) {
      const hashValue = typeof archive['manifest_hash'] === 'string' ? (archive['manifest_hash'] as string).trim() : '';
      if (hashValue) {
        manifestHash = hashValue;
      }
      const docsValue = archive['include_docs'];
      const docsList = (() => {
        if (Array.isArray(docsValue)) return normaliseStringList(docsValue);
        if (typeof docsValue === 'string' && docsValue.trim().length > 0) {
          return normaliseStringList(docsValue.split(','));
        }
        return [];
      })();
      if (docsList.length) {
        includeDocs = docsList;
      }
    }

    const envConfig = release['environment'] as Record<string, unknown> | undefined;
    if (envConfig) {
      const autonomyConfig = envConfig['autonomy'] as Record<string, unknown> | undefined;
      if (autonomyConfig) {
        const minLevel = coerceAutonomyLevel(autonomyConfig['minimum_level'] ?? autonomyConfig['minimumLevel']);
        if (minLevel) {
          environment.autonomy.minimumLevel = minLevel;
        }
        const requireWorker = coerceBoolean(autonomyConfig['require_worker'] ?? autonomyConfig['requireWorker']);
        if (typeof requireWorker === 'boolean') {
          environment.autonomy.requireWorker = requireWorker;
        }
        const rolesValue = autonomyConfig['critical_roles'] ?? autonomyConfig['criticalRoles'];
        const rolesList = (() => {
          if (Array.isArray(rolesValue)) return normaliseStringList(rolesValue);
          if (typeof rolesValue === 'string' && rolesValue.trim().length > 0) {
            return normaliseStringList(rolesValue.split(','));
          }
          return [];
        })();
        if (rolesList.length) {
          environment.autonomy.criticalRoles = rolesList.map((role) => role.toUpperCase());
        }
      }

      const mfaConfig = envConfig['mfa'] as Record<string, unknown> | undefined;
      if (mfaConfig) {
        const channelValue = typeof mfaConfig['channel'] === 'string' ? (mfaConfig['channel'] as string).trim() : '';
        if (channelValue) {
          environment.mfa.channel = channelValue.toUpperCase();
        }
        const withinValue = coerceNumber(mfaConfig['within_seconds'] ?? mfaConfig['withinSeconds']);
        if (typeof withinValue === 'number' && withinValue > 0) {
          environment.mfa.withinSeconds = Math.floor(withinValue);
        }
      }

      const telemetryConfig = envConfig['telemetry'] as Record<string, unknown> | undefined;
      if (telemetryConfig) {
        const maxOpenValue = coerceNumber(telemetryConfig['max_open_alerts'] ?? telemetryConfig['maxOpenAlerts']);
        if (typeof maxOpenValue === 'number' && maxOpenValue >= 0) {
          environment.telemetry.maxOpenAlerts = Math.floor(maxOpenValue);
        }
        const severityValue = (() => {
          if (typeof telemetryConfig['severity_threshold'] === 'string') {
            return (telemetryConfig['severity_threshold'] as string).trim();
          }
          if (typeof telemetryConfig['severityThreshold'] === 'string') {
            return (telemetryConfig['severityThreshold'] as string).trim();
          }
          return '';
        })();
        if (severityValue) {
          environment.telemetry.severityThreshold = severityValue.toUpperCase();
        }
      }
    }
  }

  return {
    approvalsRequired: approvals,
    archive: {
      manifestHash,
      includeDocs,
    },
    environment,
  };
}

function normaliseDocumentType(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const upper = value.trim().toUpperCase();
  return upper.length > 0 ? upper : undefined;
}

function resolveDocumentAIConfig(config: SystemConfig): DocumentAIPipelineConfig {
  const pipeline = config.document_ai?.pipeline;
  const resolvedSteps = (() => {
    if (Array.isArray(pipeline?.steps)) {
      const entries = normaliseStringList(pipeline?.steps);
      if (entries.length) {
        return entries.map((entry) => entry.toLowerCase());
      }
    }
    if (typeof pipeline?.steps === 'string' && pipeline.steps.trim().length > 0) {
      const entries = normaliseStringList(pipeline.steps.split(','));
      if (entries.length) {
        return entries.map((entry) => entry.toLowerCase());
      }
    }
    return [...DEFAULT_DOCUMENT_AI_STEPS];
  })();

  const classifierTypes = (() => {
    const raw = pipeline?.classifiers?.types;
    if (Array.isArray(raw)) {
      const values = raw
        .map((item) => normaliseDocumentType(item))
        .filter((entry): entry is string => Boolean(entry));
      return Array.from(new Set(values));
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const values = raw
        .split(',')
        .map((item) => normaliseDocumentType(item))
        .filter((entry): entry is string => Boolean(entry));
      return Array.from(new Set(values));
    }
    return [];
  })();

  const extractors: Record<string, string[]> = {};
  const extractorConfig = pipeline?.extractors;
  if (extractorConfig && typeof extractorConfig === 'object') {
    for (const [key, value] of Object.entries(extractorConfig)) {
      const docType = normaliseDocumentType(key);
      if (!docType) continue;
      if (Array.isArray(value)) {
        const fields = normaliseStringList(value);
        extractors[docType] = fields;
        continue;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        extractors[docType] = normaliseStringList(value.split(','));
      }
    }
  }

  const provenanceRequired = (() => {
    const directFlag = coerceBoolean(pipeline?.provenance);
    if (typeof pipeline?.provenance === 'object' && pipeline?.provenance !== null) {
      const required = coerceBoolean((pipeline.provenance as Record<string, unknown>).required);
      if (typeof required === 'boolean') {
        return required;
      }
    }
    return directFlag ?? true;
  })();

  const errorHandling = (() => {
    if (typeof pipeline?.error_handling === 'string' && pipeline.error_handling.trim().length > 0) {
      return pipeline.error_handling.trim();
    }
    return DEFAULT_DOCUMENT_AI_ERROR_MODE;
  })();

  return {
    steps: resolvedSteps,
    classifierTypes,
    extractors,
    provenanceRequired,
    errorHandling,
  };
}

function resolveKnowledgeVectorIndexes(config: SystemConfig): KnowledgeVectorIndex[] {
  const indexes = Array.isArray(config.knowledge?.vector_indexes)
    ? (config.knowledge?.vector_indexes as Array<Record<string, unknown>>)
    : [];

  return indexes
    .map((raw) => {
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) return undefined;
      const backend = typeof raw.backend === 'string' && raw.backend.trim().length > 0 ? raw.backend.trim() : 'pgvector';
      const embeddingModel = typeof raw.embedding_model === 'string' ? raw.embedding_model.trim() : '';

      const chunking = raw.chunking as Record<string, unknown> | undefined;
      const sizeValue = coerceNumber(chunking?.size);
      const overlapValue = coerceNumber(chunking?.overlap);
      const chunkSize = sizeValue && sizeValue > 0 ? Math.floor(sizeValue) : 1000;
      const chunkOverlap = overlapValue && overlapValue >= 0 ? Math.floor(overlapValue) : 150;

      const scopeFilters = normaliseStringList(Array.isArray(raw.scope_filters) ? raw.scope_filters : []);
      const seedSets = normaliseStringList(Array.isArray(raw.seed_sets) ? raw.seed_sets : []);

      return {
        name,
        backend,
        embeddingModel,
        chunkSize,
        chunkOverlap,
        scopeFilters,
        seedSets,
      } satisfies KnowledgeVectorIndex;
    })
    .filter((index): index is KnowledgeVectorIndex => Boolean(index));
}

function resolveKnowledgeRetrievalSettings(config: SystemConfig): KnowledgeRetrievalSettings {
  const retrieval = (config.knowledge?.retrieval as Record<string, unknown> | undefined) ?? {};
  const reranker = typeof retrieval.reranker === 'string' && retrieval.reranker.trim().length > 0
    ? retrieval.reranker.trim()
    : 'mini-lm-re-ranker-v2';

  const topKValue = coerceNumber(retrieval.top_k);
  const topK = topKValue && topKValue > 0 ? Math.floor(topKValue) : 5;

  const minConfidenceValue = coerceNumber(retrieval.min_citation_confidence);
  const minCitationConfidence = minConfidenceValue !== undefined ? Math.min(Math.max(minConfidenceValue, 0), 1) : 0.5;

  const policy = retrieval.policy as Record<string, unknown> | undefined;
  const requireCitation = coerceBoolean(policy?.require_citation);

  return {
    reranker,
    topK: Math.max(1, topK),
    minCitationConfidence,
    requireCitation: requireCitation ?? true,
  };
}

function resolveAssistantDockPlacement(config: SystemConfig): string {
  const key = config.ui?.shell?.assistant_position ?? DEFAULT_ASSISTANT_POSITION;
  return ASSISTANT_POSITIONS[key] ?? ASSISTANT_POSITIONS[DEFAULT_ASSISTANT_POSITION];
}

function resolveAssistantMotion(config: SystemConfig): AssistantMotionPreset {
  const key = config.ui?.shell?.style?.motion ?? DEFAULT_MOTION_PRESET;
  return ASSISTANT_MOTION_PRESETS[key] ?? ASSISTANT_MOTION_PRESETS[DEFAULT_MOTION_PRESET];
}

function resolveAssistantTheme(config: SystemConfig): AssistantDockThemeTokens {
  const key = config.ui?.shell?.style?.theme ?? DEFAULT_THEME_PRESET;
  return ASSISTANT_THEME_PRESETS[key] ?? ASSISTANT_THEME_PRESETS[DEFAULT_THEME_PRESET];
}

function resolveShellTheme(config: SystemConfig): ShellThemeTokens {
  const themeKey = config.ui?.shell?.style?.theme ?? DEFAULT_THEME_PRESET;
  const motionKey = config.ui?.shell?.style?.motion ?? DEFAULT_MOTION_PRESET;
  const preset = SHELL_THEME_PRESETS[themeKey] ?? SHELL_THEME_PRESETS[DEFAULT_THEME_PRESET];
  return {
    ...preset,
    motion: motionKey,
  };
}

function resolveEmptyState(config: SystemConfig, key: string): string | undefined {
  const value = config.ui?.empty_states?.[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

function coerceAutonomyLevel(value: unknown): AutonomyLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const key = value.trim().toUpperCase();
  if (key in AUTONOMY_LEVEL_ORDER) {
    return key as AutonomyLevel;
  }
  return undefined;
}

function resolveAutonomyLevels(config: SystemConfig): Record<AutonomyLevel, string> {
  const result: Record<AutonomyLevel, string> = { ...DEFAULT_AUTONOMY_LABELS };
  const levels = config.autonomy?.levels;
  if (levels && typeof levels === 'object') {
    for (const [key, value] of Object.entries(levels)) {
      const level = coerceAutonomyLevel(key);
      if (!level) continue;
      if (typeof value === 'string' && value.trim().length > 0) {
        result[level] = value.trim();
      }
    }
  }
  return result;
}

function resolveAutonomyDefaultLevel(config: SystemConfig): AutonomyLevel {
  const preferred = coerceAutonomyLevel(config.autonomy?.default_level);
  if (preferred) return preferred;
  return DEFAULT_AUTONOMY_LEVEL as AutonomyLevel;
}

function resolveAutonomyJobAllowances(config: SystemConfig): Record<AutonomyLevel, string[]> {
  const allowances = cloneDefaultAutopilotAllowances();
  const configured = config.autonomy?.autopilot?.allowed_jobs;
  if (configured && typeof configured === 'object') {
    for (const [key, rawValue] of Object.entries(configured)) {
      const level = coerceAutonomyLevel(key);
      if (!level) continue;
      let entries: unknown[] = [];
      if (Array.isArray(rawValue)) {
        entries = rawValue;
      } else if (rawValue != null) {
        entries = [rawValue];
      }
      const normalised = normaliseStringList(entries).map((item) => item.toLowerCase());
      allowances[level] = normalised;
    }
  }
  return allowances;
}

const PAGE_MATCHERS: Array<{ match: (pathname: string) => boolean; page: string }> = [
  { match: (pathname) => pathname === '/' || pathname.startsWith('/dashboard'), page: 'Dashboard' },
  { match: (pathname) => pathname.startsWith('/clients') || pathname.startsWith('/onboarding'), page: 'Onboarding' },
  { match: (pathname) => pathname.startsWith('/documents'), page: 'Documents' },
  { match: (pathname) => pathname.startsWith('/accounting'), page: 'Accounting Close' },
  { match: (pathname) => pathname.startsWith('/audit'), page: 'Audit' },
  { match: (pathname) => pathname.startsWith('/tax'), page: 'Tax' },
];

export function getAssistantChips(pathname: string): string[] {
  const entryPoints = parsedConfig.ui?.shell?.entry_points ?? [];
  const matchedPage = PAGE_MATCHERS.find(({ match }) => match(pathname))?.page;
  if (matchedPage) {
    const entry = entryPoints.find((item) => item.page.toLowerCase() === matchedPage.toLowerCase());
    if (entry?.chips?.length) {
      return entry.chips;
    }
  }
  const fallback = entryPoints[0]?.chips;
  return Array.isArray(fallback) && fallback.length ? fallback : [];
}

export function useAssistantChips(pathname: string): string[] {
  return useMemo(() => getAssistantChips(pathname), [pathname]);
}

export function getAssistantDockPlacementClass(config: SystemConfig = parsedConfig): string {
  return resolveAssistantDockPlacement(config);
}

export function useAssistantDockPlacementClass(): string {
  return useMemo(() => resolveAssistantDockPlacement(parsedConfig), []);
}

export function getAssistantMotionPreset(config: SystemConfig = parsedConfig): AssistantMotionPreset {
  return resolveAssistantMotion(config);
}

export function useAssistantMotionPreset(): AssistantMotionPreset {
  return useMemo(() => resolveAssistantMotion(parsedConfig), []);
}

export function getAssistantThemeTokens(config: SystemConfig = parsedConfig): AssistantDockThemeTokens {
  return resolveAssistantTheme(config);
}

export function useAssistantThemeTokens(): AssistantDockThemeTokens {
  return useMemo(() => resolveAssistantTheme(parsedConfig), []);
}

export function getShellThemeTokens(config: SystemConfig = parsedConfig): ShellThemeTokens {
  return resolveShellTheme(config);
}

export function useShellThemeTokens(): ShellThemeTokens {
  return useMemo(() => resolveShellTheme(parsedConfig), []);
}

export function getEmptyStateCopy(key: string, config: SystemConfig = parsedConfig): string | undefined {
  return resolveEmptyState(config, key);
}

export function useEmptyStateCopy(key: string, fallback?: string): string {
  return useMemo(() => resolveEmptyState(parsedConfig, key) ?? fallback ?? '', [key, fallback]);
}

export function getClientPortalScopeSettings(config: SystemConfig = parsedConfig): ClientPortalScopeSettings {
  return resolveClientPortalScope(config);
}

export function useClientPortalScope(): ClientPortalScopeSettings {
  return useMemo(() => resolveClientPortalScope(parsedConfig), []);
}

export function isClientActionDenied(action: string, config: SystemConfig = parsedConfig): boolean {
  if (!action) return false;
  const scope = resolveClientPortalScope(config);
  return scope.deniedActions.includes(action);
}

export function getAutonomyLevels(config: SystemConfig = parsedConfig): Record<AutonomyLevel, string> {
  return resolveAutonomyLevels(config);
}

export function useAutonomyLevels(): Record<AutonomyLevel, string> {
  return useMemo(() => resolveAutonomyLevels(parsedConfig), []);
}

export function getDefaultAutonomyLevel(config: SystemConfig = parsedConfig): AutonomyLevel {
  return resolveAutonomyDefaultLevel(config);
}

export function getAutonomyLevelRank(level: string): number {
  const key = coerceAutonomyLevel(level);
  if (key) return AUTONOMY_LEVEL_ORDER[key];
  return -1;
}

export function getAutonomyLevelDescription(level: string, config: SystemConfig = parsedConfig): string {
  const levels = resolveAutonomyLevels(config);
  const key = coerceAutonomyLevel(level) ?? resolveAutonomyDefaultLevel(config);
  return levels[key];
}

export function getAutonomyJobAllowances(config: SystemConfig = parsedConfig): Record<AutonomyLevel, string[]> {
  return resolveAutonomyJobAllowances(config);
}

export function getAllowedAutopilotJobs(level?: string, config: SystemConfig = parsedConfig): string[] {
  const allowances = resolveAutonomyJobAllowances(config);
  const key = coerceAutonomyLevel(level) ?? resolveAutonomyDefaultLevel(config);
  return [...allowances[key]];
}

export function useAllowedAutopilotJobs(level?: string): string[] {
  return useMemo(() => getAllowedAutopilotJobs(level, parsedConfig), [level]);
}

export function getRoleHierarchy(config: SystemConfig = parsedConfig): string[] {
  return resolveRoleHierarchy(config);
}

export function useRoleHierarchy(): string[] {
  return useMemo(() => resolveRoleHierarchy(parsedConfig), []);
}

export function getGoogleDriveSettings(config: SystemConfig = parsedConfig): GoogleDriveSettings {
  return resolveGoogleDriveSettings(config);
}

export function useGoogleDriveSettings(): GoogleDriveSettings {
  return useMemo(() => resolveGoogleDriveSettings(parsedConfig), []);
}

export function getUrlSourceSettings(config: SystemConfig = parsedConfig): UrlSourceSettings {
  return resolveUrlSourceSettings(config);
}

export function useUrlSourceSettings(): UrlSourceSettings {
  return useMemo(() => resolveUrlSourceSettings(parsedConfig), []);
}

export function getEmailIngestSettings(config: SystemConfig = parsedConfig): EmailIngestSettings {
  return resolveEmailIngestSettings(config);
}

export function useEmailIngestSettings(): EmailIngestSettings {
  return useMemo(() => resolveEmailIngestSettings(parsedConfig), []);
}

export function getBeforeAskingUserSequence(config: SystemConfig = parsedConfig): string[] {
  return resolveBeforeAskingUserSequence(config);
}

export function useBeforeAskingUserSequence(): string[] {
  return useMemo(() => resolveBeforeAskingUserSequence(parsedConfig), []);
}

export function getDocumentAIPipelineConfig(config: SystemConfig = parsedConfig): DocumentAIPipelineConfig {
  return resolveDocumentAIConfig(config);
}

export function useDocumentAIPipelineConfig(): DocumentAIPipelineConfig {
  return useMemo(() => resolveDocumentAIConfig(parsedConfig), []);
}

export function getKnowledgeVectorIndexes(config: SystemConfig = parsedConfig): KnowledgeVectorIndex[] {
  return resolveKnowledgeVectorIndexes(config);
}

export function useKnowledgeVectorIndexes(): KnowledgeVectorIndex[] {
  return useMemo(() => resolveKnowledgeVectorIndexes(parsedConfig), []);
}

export function getKnowledgeRetrievalSettings(config: SystemConfig = parsedConfig): KnowledgeRetrievalSettings {
  return resolveKnowledgeRetrievalSettings(config);
}

export function useKnowledgeRetrievalSettings(): KnowledgeRetrievalSettings {
  return useMemo(() => resolveKnowledgeRetrievalSettings(parsedConfig), []);
}

export function getToolPolicies(config: SystemConfig = parsedConfig): ToolPolicy[] {
  return resolveToolPolicies(config);
}

export function getToolPolicy(name: string, config: SystemConfig = parsedConfig): ToolPolicy | undefined {
  const normalised = typeof name === 'string' ? name.trim() : '';
  if (!normalised) return undefined;
  return getToolPolicies(config).find((policy) => policy.name === normalised);
}

export function getAgentDefinitions(config: SystemConfig = parsedConfig): AgentDefinition[] {
  return resolveAgentDefinitions(config);
}

export function getAgentsByTool(tool: string, config: SystemConfig = parsedConfig): AgentDefinition[] {
  const normalised = typeof tool === 'string' ? tool.trim().toLowerCase() : '';
  if (!normalised) return [];
  return getAgentDefinitions(config).filter((agent) =>
    agent.tools.some((entry) => entry.toLowerCase() === normalised),
  );
}

export function getWorkflowDefinitions(config: SystemConfig = parsedConfig): WorkflowDefinition[] {
  return resolveWorkflowDefinitions(config);
}

export function getWorkflowDefinition(key: string, config: SystemConfig = parsedConfig): WorkflowDefinition | undefined {
  const normalised = typeof key === 'string' ? key.trim() : '';
  if (!normalised) return undefined;
  return getWorkflowDefinitions(config).find((workflow) => workflow.key === normalised);
}

export const systemConfig = parsedConfig;
