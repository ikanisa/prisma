/* eslint-env node */
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { Client } from 'pg';
import { vector } from 'pgvector';
import NodeCache from 'node-cache';
import OpenAI from 'openai';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { generateAgentPlan } from '../../lib/agents/runtime';
import type { AgentRequestContext, AgentRole } from '../../lib/agents/types';
import { roleFromString } from '../../lib/agents/types';
import { retrieveRagChunks } from '../../lib/rag/retrieve';

// Basic RAG service implementing ingest, search and reembed endpoints.
// Documents are stored in PostgreSQL with pgvector embeddings.

const app = express();
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';

if (!JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET must be set to secure the RAG service.');
}

const upload = multer();
const cache = new NodeCache({ stdTTL: 60 });

const RATE_LIMIT = Number(process.env.API_RATE_LIMIT ?? '60');
const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_SECONDS ?? '60') * 1000;
const requestBuckets = new Map<string, number[]>();

interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { sub?: string };
}

function logInfo(message: string, meta: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', msg: message, ...meta }));
}

function logError(message: string, error: unknown, meta: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...meta,
    })
  );
}

function allowRequest(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const timestamps = (requestBuckets.get(userId) ?? []).filter((ts) => ts > windowStart);

  if (timestamps.length >= RATE_LIMIT) {
    requestBuckets.set(userId, timestamps);
    return false;
  }

  timestamps.push(now);
  requestBuckets.set(userId, timestamps);
  return true;
}

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or invalid authorization header' });
  }

  const token = header.split(' ', 2)[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as JwtPayload;

    const userId = payload.sub ?? 'anonymous';
    if (!allowRequest(userId)) {
      logInfo('rate.limit_exceeded', { userId, path: req.path });
      return res.status(429).json({ error: 'rate limit exceeded' });
    }

    req.user = payload;
    logInfo('auth.accepted', { userId, path: req.path, method: req.method });
    return next();
  } catch (err) {
    logError('auth.invalid_token', err, { path: req.path });
    return res.status(401).json({ error: 'invalid access token' });
  }
}

app.use(authenticate);

// Database and OpenAI clients
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
}

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function getFeatureFlag(name: string, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value !== 'false' && value !== '0';
}

const REQUIRE_MANAGER_APPROVAL = getFeatureFlag('FEATURE_REQUIRE_MANAGER_APPROVAL', true);
const BLOCK_EXTERNAL_FILING = getFeatureFlag('FEATURE_BLOCK_EXTERNAL_FILING', true);
const ENFORCE_CITATIONS = getFeatureFlag('FEATURE_ENFORCE_CITATIONS', true);
const QMS_MONITORING_ENABLED = getFeatureFlag('FEATURE_QMS_MONITORING_ENABLED', true);

type ApprovalAction = 'JOURNAL_POST' | 'PERIOD_LOCK' | 'HANDOFF_SEND' | 'ARCHIVE_BUILD' | 'CLIENT_SEND';

interface ApprovalEvidence {
  id: string;
  title: string;
  standard: string;
  control: string;
  documentUrl: string;
}

interface ApprovalItem {
  id: string;
  orgSlug: string;
  action: ApprovalAction;
  actionLabel: string;
  entity: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  standards: string[];
  control: string;
  evidence: ApprovalEvidence[];
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
  decisionComment?: string;
  decidedBy?: string;
  decidedAt?: string;
  reviewerName?: string;
}

const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  JOURNAL_POST: 'Journal posting approval',
  PERIOD_LOCK: 'Period lock',
  HANDOFF_SEND: 'Handoff send',
  ARCHIVE_BUILD: 'Archive build',
  CLIENT_SEND: 'Client deliverable send',
};

const approvalQueue: ApprovalItem[] = [
  {
    id: randomUUID(),
    orgSlug: 'demo',
    action: 'JOURNAL_POST',
    actionLabel: APPROVAL_ACTION_LABELS.JOURNAL_POST,
    entity: 'FY24 Period 12 Close',
    description: 'Post manual journals for period 12 close with supporting reconciliations.',
    submittedBy: 'Eli Employee',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    standards: ['ISA 230', 'ISA 240', 'ISQM 1'],
    control: 'Journal posting approval',
    evidence: [
      {
        id: 'ev-close-checklist',
        title: 'Period close checklist export',
        standard: 'ISQM 1',
        control: 'Accounting close controls',
        documentUrl: '/CHECKLISTS/ACCOUNTING/period_close.json',
      },
    ],
    status: 'PENDING',
  },
  {
    id: randomUUID(),
    orgSlug: 'demo',
    action: 'PERIOD_LOCK',
    actionLabel: APPROVAL_ACTION_LABELS.PERIOD_LOCK,
    entity: 'Q4 2024 General Ledger',
    description: 'Lock period to prevent subsequent postings after close approval.',
    submittedBy: 'Sophia System',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    standards: ['ISA 230', 'ISQM 1'],
    control: 'Period lock control',
    evidence: [
      {
        id: 'ev-fs-draft',
        title: 'Financial statement draft snapshot',
        standard: 'IAS 1',
        control: 'Financial reporting',
        documentUrl: '/documents?engagementId=demo-eng&source=fs-draft',
      },
    ],
    status: 'PENDING',
  },
  {
    id: randomUUID(),
    orgSlug: 'demo',
    action: 'HANDOFF_SEND',
    actionLabel: APPROVAL_ACTION_LABELS.HANDOFF_SEND,
    entity: 'Audit handoff package - TechFlow Industries',
    description: 'Send audit completion package to client including ISA 230 documentation.',
    submittedBy: 'Eli Employee',
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    standards: ['ISA 230', 'ISA 220', 'ISQM 2'],
    control: 'Client deliverables control',
    evidence: [
      {
        id: 'ev-isa-completion',
        title: 'ISA completion checklist',
        standard: 'ISA 230',
        control: 'Documentation close-out',
        documentUrl: '/CHECKLISTS/AUDIT/isa_completion.json',
      },
    ],
    status: 'PENDING',
  },
  {
    id: randomUUID(),
    orgSlug: 'demo',
    action: 'ARCHIVE_BUILD',
    actionLabel: APPROVAL_ACTION_LABELS.ARCHIVE_BUILD,
    entity: 'Archive build FY24',
    description: 'Build archive zip and hash for FY24 workpapers.',
    submittedBy: 'Sophia System',
    submittedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    standards: ['ISA 230', 'ISQM 1'],
    control: 'Archive release',
    evidence: [],
    status: 'PENDING',
  },
  {
    id: randomUUID(),
    orgSlug: 'demo',
    action: 'CLIENT_SEND',
    actionLabel: APPROVAL_ACTION_LABELS.CLIENT_SEND,
    entity: 'Malta VAT Q4 2024 submission',
    description: 'Send VAT working paper and return draft to client for filing approval.',
    submittedBy: 'Eli Employee',
    submittedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    standards: ['Malta VAT Act', 'ISQM 1'],
    control: 'VAT deliverable review',
    evidence: [
      {
        id: 'ev-vat-paper',
        title: 'Malta VAT working paper',
        standard: 'Malta VAT Act',
        control: 'VAT working paper',
        documentUrl: '/CHECKLISTS/TAX/malta_vat_working_paper.md',
      },
    ],
    status: 'PENDING',
  },
];

const approvalHistory: ApprovalItem[] = [];

const ROLE_HIERARCHY: Record<string, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

type ToolExecutionContext = {
  orgId: string;
  engagementId?: string | null;
  userId: string;
  sessionId: string;
  runId: string;
};

type OrgContext = {
  orgId: string;
  orgSlug: string;
  role: AgentRole;
};

type ToolHandler = (input: unknown, context: ToolExecutionContext) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
  'trial_balance.get': async () => {
    return { balances: [], generatedAt: new Date().toISOString() };
  },
  'docs.sign_url': async (input) => {
    const documentId = (input as Record<string, any>)?.documentId ?? null;
    return {
      documentId,
      signedUrl: 'https://example.com/signed-url-stub',
      expiresInSeconds: Number(process.env.DOCUMENT_SIGN_TTL ?? '120'),
    };
  },
  'notify.user': async (input) => {
    const payload = input as Record<string, any> | undefined;
    return {
      notified: true,
      message: payload?.message ?? 'Notification stub sent.',
      recipients: payload?.recipients ?? [],
      sentAt: new Date().toISOString(),
    };
  },
};

const hashPayload = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');

async function ensureDocumentsBucket() {
  const { data: bucket } = await supabaseService.storage.getBucket('documents');
  if (!bucket) {
    await supabaseService.storage.createBucket('documents', { public: false });
  }
}

await ensureDocumentsBucket();

async function resolveOrgForUser(userId: string, orgSlug: string): Promise<OrgContext> {
  const { data: org, error: orgError } = await supabaseService
    .from('organizations')
    .select('id, slug')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (orgError || !org) {
    throw new Error('organization_not_found');
  }

  const { data: membership, error: membershipError } = await supabaseService
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error('not_a_member');
  }

  const role = (membership.role as AgentRole) ?? 'EMPLOYEE';

  return {
    orgId: org.id,
    orgSlug: org.slug,
    role,
  };
}

function hasManagerPrivileges(role: AgentRole) {
  return role === 'MANAGER' || role === 'SYSTEM_ADMIN';
}

async function resolveOrgByIdForUser(userId: string, orgId: string): Promise<OrgContext> {
  const { data: org, error: orgError } = await supabaseService
    .from('organizations')
    .select('id, slug')
    .eq('id', orgId)
    .maybeSingle();

  if (orgError || !org) {
    throw new Error('organization_not_found');
  }

  const { data: membership, error: membershipError } = await supabaseService
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error('not_a_member');
  }

  const role = (membership.role as AgentRole) ?? 'EMPLOYEE';
  return {
    orgId: org.id,
    orgSlug: org.slug,
    role,
  };
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return undefined;
}

function asArray<T = unknown>(value: unknown): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as T[];
}

type NonAuditService = {
  service: string;
  prohibited: boolean;
  description?: string | null;
};

type IndependenceAssessmentResult =
  | {
      ok: true;
      conclusion: 'OK' | 'OVERRIDE';
      checked: boolean;
      note: string | null;
      services: NonAuditService[];
      prohibitedCount: number;
      needsApproval: boolean;
    }
  | {
      ok: false;
      error: 'independence_check_required' | 'prohibited_nas';
      prohibitedCount?: number;
    };

function sanitizeNonAuditServices(input: unknown): NonAuditService[] {
  if (!Array.isArray(input)) return [];
  const services: NonAuditService[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.service === 'string' ? record.service.trim() : '';
    if (!name) continue;
    const prohibited = Boolean(record.prohibited);
    const description = typeof record.description === 'string' ? record.description : null;
    services.push({ service: name, prohibited, description });
    if (services.length >= 100) break;
  }
  return services;
}

function assessIndependence({
  isAuditClient,
  independenceChecked,
  services,
  overrideNote,
}: {
  isAuditClient: boolean;
  independenceChecked: boolean;
  services: NonAuditService[];
  overrideNote?: string | null;
}): IndependenceAssessmentResult {
  const checked = isAuditClient ? independenceChecked : false;
  if (!isAuditClient) {
    return {
      ok: true,
      conclusion: 'OK',
      checked,
      note: null,
      services,
      prohibitedCount: services.filter((svc) => svc.prohibited).length,
      needsApproval: false,
    };
  }

  if (!independenceChecked) {
    return { ok: false, error: 'independence_check_required' };
  }

  const prohibitedCount = services.filter((svc) => svc.prohibited).length;
  if (prohibitedCount === 0) {
    return {
      ok: true,
      conclusion: 'OK',
      checked: true,
      note: null,
      services,
      prohibitedCount,
      needsApproval: false,
    };
  }

  const normalizedNote = typeof overrideNote === 'string' ? overrideNote.trim() : '';
  if (normalizedNote.length === 0) {
    return { ok: false, error: 'prohibited_nas', prohibitedCount };
  }

  return {
    ok: true,
    conclusion: 'OVERRIDE',
    checked: true,
    note: normalizedNote,
    services,
    prohibitedCount,
    needsApproval: true,
  };
}

function parseAgentRequestContext(raw: unknown): AgentRequestContext | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const source = raw as Record<string, unknown>;
  const context: AgentRequestContext = {};

  if (typeof source.description === 'string' && source.description.trim().length > 0) {
    context.description = source.description.trim();
  }

  const rawFlags =
    typeof source.flags === 'object' && source.flags !== null && !Array.isArray(source.flags)
      ? (source.flags as Record<string, unknown>)
      : undefined;

  const flags: AgentRequestContext['flags'] = {};
  const externalFiling = parseBooleanFlag(source.externalFiling ?? rawFlags?.externalFiling);
  if (externalFiling !== undefined) {
    flags.externalFiling = externalFiling;
  }
  const calculatorOverride = parseBooleanFlag(source.calculatorOverride ?? rawFlags?.calculatorOverride);
  if (calculatorOverride !== undefined) {
    flags.calculatorOverride = calculatorOverride;
  }
  if (flags && Object.keys(flags).length > 0) {
    context.flags = flags;
  }

  const minRole = roleFromString(source.minRoleRequired ?? source.minRole);
  if (minRole) {
    context.minRoleRequired = minRole;
  }

  const toolCandidates = asArray(source.requestedTools) ?? asArray(source.tools);
  if (toolCandidates) {
    const normalizedTools = toolCandidates
      .map((tool) => {
        if (!tool || typeof tool !== 'object' || Array.isArray(tool)) return null;
        const record = tool as Record<string, unknown>;
        const key =
          typeof record.toolKey === 'string'
            ? record.toolKey
            : typeof record.key === 'string'
            ? record.key
            : undefined;
        if (!key) return null;
        const toolMinRole = roleFromString(record.minRole);
        return {
          toolKey: key,
          minRole: toolMinRole ?? undefined,
        };
      })
      .filter((item): item is { toolKey: string; minRole?: AgentRole } => Boolean(item));

    if (normalizedTools.length > 0) {
      context.requestedTools = normalizedTools;
    }
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

type EvidenceRef = {
  label: string;
  url?: string;
  type?: string;
  id?: string;
};

function buildDocumentLink(id: string): string {
  return `/documents/${encodeURIComponent(id)}`;
}

function buildChecklistLink(id: string): string {
  return `/checklists/${encodeURIComponent(id)}`;
}

function buildExportLink(id: string): string {
  return `/exports/${encodeURIComponent(id)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildLastNDaysKeys(days: number, end: Date): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const bucket = new Date(end.getTime() - i * DAY_MS);
    keys.push(formatDateKey(bucket));
  }
  return keys;
}

function computePercentile(samples: number[], percentile: number): number {
  if (!Array.isArray(samples) || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function parseRunSummary(summary: unknown): any {
  if (!summary) return { steps: [] };
  if (typeof summary === 'string') {
    try {
      return JSON.parse(summary);
    } catch (error) {
      logError('agent.run_summary_parse_failed', error as Error, {});
      return { steps: [] };
    }
  }
  if (typeof summary === 'object') return summary;
  return { steps: [] };
}

async function updateRunSummaryWithResult({
  run,
  toolKey,
  result,
}: {
  run: { id: string; step_index: number; summary: unknown };
  toolKey: string;
  result: { status: string; output?: unknown; error?: string };
}): Promise<{ state: string; planDocument: any }> {
  const planDocument = parseRunSummary(run.summary);
  if (!Array.isArray(planDocument.steps)) {
    planDocument.steps = [];
  }

  let targetStep = planDocument.steps.find((step: any) => step?.stepIndex === run.step_index);
  if (!targetStep) {
    targetStep = { stepIndex: run.step_index, results: [] };
    planDocument.steps.push(targetStep);
  }

  if (!Array.isArray(targetStep.results)) {
    targetStep.results = [];
  }

  const serializedResult: Record<string, unknown> = {
    toolKey,
    status: result.status,
  };
  if (result.output !== undefined) {
    serializedResult.output = result.output;
  }
  if (result.error) {
    serializedResult.error = result.error;
  }

  const existingIndex = targetStep.results.findIndex((entry: any) => entry?.toolKey === toolKey);
  if (existingIndex >= 0) {
    targetStep.results[existingIndex] = serializedResult;
  } else {
    targetStep.results.push(serializedResult);
  }

  const hasError = planDocument.steps.some((step: any) =>
    Array.isArray(step.results) && step.results.some((entry: any) => entry?.status === 'ERROR')
  );
  const hasPending = planDocument.steps.some((step: any) =>
    Array.isArray(step.results) && step.results.some((entry: any) => entry?.status === 'BLOCKED' || entry?.status === 'PENDING')
  );

  let state: 'DONE' | 'EXECUTING' | 'ERROR' = 'DONE';
  if (hasError) {
    state = 'ERROR';
  } else if (hasPending) {
    state = 'EXECUTING';
  }

  await supabaseService
    .from('agent_runs')
    .update({ summary: JSON.stringify(planDocument), state })
    .eq('id', run.id);

  return { state, planDocument };
}

async function resumeApprovedAction({
  approvalId,
  context,
  orgContext,
  approverId,
}: {
  approvalId: string;
  context: Record<string, unknown>;
  orgContext: OrgContext;
  approverId: string;
}): Promise<{ output: unknown; runState: string }> {
  const sessionId = context.sessionId as string | undefined;
  const actionId = context.actionId as string | undefined;
  const runId = context.runId as string | undefined;
  const toolKey = context.toolKey as string | undefined;
  const input = context.input ?? {};

  if (!sessionId || !actionId || !runId || !toolKey) {
    throw new Error('approval_context_incomplete');
  }

  const { data: action, error: actionError } = await supabaseService
    .from('agent_actions')
    .select('id, session_id, run_id, status, tool_key, input_json')
    .eq('id', actionId)
    .maybeSingle();

  if (actionError || !action) {
    throw actionError ?? new Error('action_not_found');
  }

  const { data: session, error: sessionError } = await supabaseService
    .from('agent_sessions')
    .select('id, org_id, engagement_id, agent_type, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    throw sessionError ?? new Error('session_not_found');
  }

  const { data: run, error: runError } = await supabaseService
    .from('agent_runs')
    .select('id, step_index, summary')
    .eq('id', runId)
    .maybeSingle();

  if (runError || !run) {
    throw runError ?? new Error('run_not_found');
  }

  const handler = toolHandlers[toolKey];
  if (!handler) {
    throw new Error('handler_not_implemented');
  }

  await supabaseService
    .from('agent_sessions')
    .update({ status: 'RUNNING' })
    .eq('id', sessionId);

  await supabaseService
    .from('agent_actions')
    .update({ status: 'PENDING' })
    .eq('id', actionId);

  const executionInput = input && typeof input === 'object' ? input : action.input_json ?? {};

  try {
    const output = await handler(executionInput, {
      orgId: orgContext.orgId,
      engagementId: session.engagement_id ?? null,
      userId: approverId,
      sessionId,
      runId,
    });

    await supabaseService
      .from('agent_actions')
      .update({ status: 'SUCCESS', output_json: output ?? {} })
      .eq('id', actionId);

    const { state: runState } = await updateRunSummaryWithResult({
      run,
      toolKey,
      result: { status: 'SUCCESS', output },
    });

    await supabaseService.from('agent_traces').insert({
      org_id: orgContext.orgId,
      session_id: sessionId,
      run_id: runId,
      trace_type: 'TOOL',
      payload: {
        toolKey,
        input: executionInput,
        output,
        status: 'SUCCESS',
        resumedFromApproval: true,
        approvalId,
        runState,
      },
    });

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: approverId,
      action: 'AGENT_TOOL_CALL',
      entity_type: 'agent_session',
      entity_id: sessionId,
      metadata: {
        toolKey,
        status: 'SUCCESS',
        resumedFromApproval: true,
        approvalId,
        inputHash: hashPayload(executionInput),
        outputHash: hashPayload(output),
        runState,
      },
    });

    return { output, runState };
  } catch (error) {
    const message = (error as Error).message ?? 'execution_failed_after_approval';

    await supabaseService
      .from('agent_actions')
      .update({ status: 'ERROR', output_json: { error: message } })
      .eq('id', actionId);

    const { state: runState } = await updateRunSummaryWithResult({
      run,
      toolKey,
      result: { status: 'ERROR', error: message },
    });

    await supabaseService.from('agent_traces').insert({
      org_id: orgContext.orgId,
      session_id: sessionId,
      run_id: runId,
      trace_type: 'ERROR',
      payload: {
        toolKey,
        input: executionInput,
        error: message,
        resumedFromApproval: true,
        approvalId,
        runState,
      },
    });

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: approverId,
      action: 'AGENT_TOOL_CALL',
      entity_type: 'agent_session',
      entity_id: sessionId,
      metadata: {
        toolKey,
        status: 'ERROR',
        resumedFromApproval: true,
        approvalId,
        error: message,
        inputHash: hashPayload(executionInput),
        runState,
      },
    });

    if (runState === 'ERROR') {
      await supabaseService
        .from('agent_sessions')
        .update({ status: 'FAILED' })
        .eq('id', sessionId);
    }

    throw error;
  }
}

async function ensureIndependenceOverrideApproval({
  orgId,
  engagementId,
  userId,
  note,
  services,
  isAuditClient,
}: {
  orgId: string;
  engagementId: string;
  userId: string;
  note: string;
  services: NonAuditService[];
  isAuditClient: boolean;
}): Promise<string> {
  const { data: existing, error: existingError } = await supabaseService
    .from('approval_queue')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('kind', 'INDEPENDENCE_OVERRIDE')
    .eq('context_json->>engagementId', engagementId)
    .order('requested_at', { ascending: false })
    .limit(1);

  if (existingError) throw existingError;
  const pending = existing?.[0];
  if (pending && pending.status === 'PENDING') {
    return pending.id as string;
  }

  const context = {
    engagementId,
    isAuditClient,
    nonAuditServices: services,
    note,
  };

  const { data, error } = await supabaseService
    .from('approval_queue')
    .insert({
      org_id: orgId,
      kind: 'INDEPENDENCE_OVERRIDE',
      status: 'PENDING',
      requested_by_user_id: userId,
      context_json: context,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('independence_override_approval_failed');
  }

  return data.id as string;
}

async function hasApprovedIndependenceOverride(orgId: string, engagementId: string): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('approval_queue')
    .select('id')
    .eq('org_id', orgId)
    .eq('kind', 'INDEPENDENCE_OVERRIDE')
    .eq('context_json->>engagementId', engagementId)
    .eq('status', 'APPROVED')
    .order('decision_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

async function rejectBlockedAction({
  approvalId,
  context,
  orgContext,
  approverId,
  comment,
}: {
  approvalId: string;
  context: Record<string, unknown>;
  orgContext: OrgContext;
  approverId: string;
  comment?: string;
}): Promise<void> {
  const sessionId = context.sessionId as string | undefined;
  const actionId = context.actionId as string | undefined;
  const runId = context.runId as string | undefined;
  const toolKey = context.toolKey as string | undefined;

  if (!sessionId || !actionId || !runId || !toolKey) {
    throw new Error('approval_context_incomplete');
  }

  const { data: action, error: actionError } = await supabaseService
    .from('agent_actions')
    .select('id, session_id, run_id, tool_key, input_json')
    .eq('id', actionId)
    .maybeSingle();

  if (actionError || !action) {
    throw actionError ?? new Error('action_not_found');
  }

  const { data: run, error: runError } = await supabaseService
    .from('agent_runs')
    .select('id, step_index, summary')
    .eq('id', runId)
    .maybeSingle();

  if (runError || !run) {
    throw runError ?? new Error('run_not_found');
  }

  await supabaseService
    .from('agent_actions')
    .update({ status: 'ERROR', output_json: { error: 'approval_rejected', comment: comment ?? null } })
    .eq('id', actionId);

  const { state: runState } = await updateRunSummaryWithResult({
    run,
    toolKey,
    result: { status: 'ERROR', error: comment ?? 'approval_rejected' },
  });

  await supabaseService
    .from('agent_sessions')
    .update({ status: 'FAILED' })
    .eq('id', sessionId);

  await supabaseService.from('agent_traces').insert({
    org_id: orgContext.orgId,
    session_id: sessionId,
    run_id: runId,
    trace_type: 'ERROR',
    payload: {
      toolKey,
      status: 'ERROR',
      approvalId,
      comment,
      runState,
    },
  });

  await supabaseService.from('activity_log').insert({
    org_id: orgContext.orgId,
    user_id: approverId,
    action: 'AGENT_TOOL_CALL',
    entity_type: 'agent_session',
    entity_id: sessionId,
    metadata: {
      toolKey,
      status: 'ERROR',
      approvalRejected: true,
      approvalId,
      comment,
      runState,
    },
  });
}

function extractEvidenceRefs(input: unknown): EvidenceRef[] | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const evidence: EvidenceRef[] = [];
  const record = input as Record<string, unknown>;

  const addEvidence = (ref: EvidenceRef) => {
    if (!ref.label) return;
    const hasId = typeof ref.id === 'string' && ref.id.length > 0;
    const hasUrl = typeof ref.url === 'string' && ref.url.length > 0;
    const alreadyPresent = evidence.some((existing) => {
      if (hasId && existing.id === ref.id) return true;
      if (!hasId && hasUrl && existing.url && existing.url === ref.url) return true;
      return false;
    });
    if (!alreadyPresent) {
      evidence.push(ref);
    }
  };

  const documentIds = record.documentIds ?? record.docIds;
  if (Array.isArray(documentIds)) {
    for (const docId of documentIds) {
      if (typeof docId === 'string' && docId.trim().length > 0) {
        addEvidence({ label: `Document ${docId}`, url: buildDocumentLink(docId), type: 'document', id: docId });
      }
    }
  }

  const singleDocumentId = record.documentId ?? record.docId;
  if (typeof singleDocumentId === 'string' && singleDocumentId.trim().length > 0) {
    addEvidence({
      label: `Document ${singleDocumentId}`,
      url: buildDocumentLink(singleDocumentId),
      type: 'document',
      id: singleDocumentId,
    });
  }

  const checklistIds = record.checklistIds;
  if (Array.isArray(checklistIds)) {
    for (const checklistId of checklistIds) {
      if (typeof checklistId === 'string' && checklistId.trim().length > 0) {
        addEvidence({
          label: `Checklist ${checklistId}`,
          url: buildChecklistLink(checklistId),
          type: 'checklist',
          id: checklistId,
        });
      }
    }
  }

  const singleChecklistId = record.checklistId ?? record.checklistSlug;
  if (typeof singleChecklistId === 'string' && singleChecklistId.trim().length > 0) {
    addEvidence({
      label: `Checklist ${singleChecklistId}`,
      url: buildChecklistLink(singleChecklistId),
      type: 'checklist',
      id: singleChecklistId,
    });
  }

  const exportIds = record.exportIds;
  if (Array.isArray(exportIds)) {
    for (const exportId of exportIds) {
      if (typeof exportId === 'string' && exportId.trim().length > 0) {
        addEvidence({ label: `Export ${exportId}`, url: buildExportLink(exportId), type: 'export', id: exportId });
      }
    }
  }

  const singleExportId = record.exportId ?? record.reportId;
  if (typeof singleExportId === 'string' && singleExportId.trim().length > 0) {
    addEvidence({
      label: `Export ${singleExportId}`,
      url: buildExportLink(singleExportId),
      type: 'export',
      id: singleExportId,
    });
  }

  const evidenceUrls = record.evidenceUrls;
  if (Array.isArray(evidenceUrls)) {
    for (const url of evidenceUrls) {
      if (typeof url === 'string' && url.trim().length > 0) {
        addEvidence({ label: url, url, type: 'url' });
      }
    }
  }

  const exportUrls = record.exportUrls ?? record.reportUrls;
  if (Array.isArray(exportUrls)) {
    for (const url of exportUrls) {
      if (typeof url === 'string' && url.trim().length > 0) {
        addEvidence({ label: url, url, type: 'export' });
      }
    }
  }

  const singleExportUrl = record.exportUrl ?? record.reportUrl;
  if (typeof singleExportUrl === 'string' && singleExportUrl.trim().length > 0) {
    addEvidence({ label: singleExportUrl, url: singleExportUrl, type: 'export' });
  }

  const providedRefs = Array.isArray(record.evidenceRefs) ? record.evidenceRefs : undefined;
  if (providedRefs) {
    for (const rawRef of providedRefs) {
      if (!rawRef || typeof rawRef !== 'object') continue;
      const refRecord = rawRef as Record<string, unknown>;
      const label = typeof refRecord.label === 'string' ? refRecord.label : undefined;
      if (!label) continue;
      const url = typeof refRecord.url === 'string' ? refRecord.url : undefined;
      const type = typeof refRecord.type === 'string' ? refRecord.type : undefined;
      const id = typeof refRecord.id === 'string' ? refRecord.id : undefined;
      addEvidence({ label, url, type, id });
    }
  }

  return evidence.length > 0 ? evidence : undefined;
}

function extractEntityRefs(session: { engagement_id?: string | null }, input: unknown): Record<string, unknown> | undefined {
  const refs: Record<string, unknown> = {};
  if (session.engagement_id) {
    refs.engagementId = session.engagement_id;
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (typeof record.batchId === 'string') {
      refs.batchId = record.batchId;
    }
    if (typeof record.clientId === 'string') {
      refs.clientId = record.clientId;
    }
    const documentIds = record.documentIds ?? record.docIds;
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      refs.documentIds = documentIds.filter((id): id is string => typeof id === 'string');
    }
  }

  return Object.keys(refs).length > 0 ? refs : undefined;
}

async function enforceApprovalGate(
  req: AuthenticatedRequest,
  res: Response,
  action: 'JOURNAL_POST' | 'PERIOD_LOCK' | 'HANDOFF_SEND' | 'ARCHIVE_BUILD' | 'CLIENT_SEND'
) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'invalid session' });
  }

  const orgSlug = (req.body?.orgSlug ?? req.query?.orgSlug) as string | undefined;
  if (!orgSlug) {
    return res.status(400).json({ error: 'orgSlug query param required' });
  }

  let orgContext: { orgId: string; orgSlug: string; role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN' };
  try {
    orgContext = await resolveOrgForUser(userId, orgSlug);
  } catch (err) {
    if ((err as Error).message === 'organization_not_found') {
      return res.status(404).json({ error: 'organization not found' });
    }
    if ((err as Error).message === 'not_a_member') {
      return res.status(403).json({ error: 'forbidden' });
    }
    throw err;
  }

  if (!REQUIRE_MANAGER_APPROVAL) {
    logInfo('approval.pass_through', { userId, action, orgId: orgContext.orgId });
    return res.json({ status: 'allowed', action });
  }

  if (!hasManagerPrivileges(orgContext.role)) {
    return res.status(403).json({ error: 'manager_approval_required', action });
  }

  if (action === 'CLIENT_SEND' && BLOCK_EXTERNAL_FILING) {
    return res.status(409).json({ error: 'external_filing_blocked', action });
  }

  logInfo('approval.stubbed', { userId, action, orgId: orgContext.orgId });
  return res.status(202).json({
    status: 'approval_required',
    action,
    message: 'Approval queue placeholder active. Action Centre ships in Job S3.',
    citationsRequired: ENFORCE_CITATIONS,
    monitoringEnabled: QMS_MONITORING_ENABLED,
  });
}

async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  const result = await Tesseract.recognize(buffer, 'eng');
  return result.data.text;
}

function chunkText(text: string, size = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let chunk: string[] = [];
  for (const word of words) {
    if (chunk.join(' ').length + word.length + 1 > size) {
      chunks.push(chunk.join(' '));
      chunk = [];
    }
    chunk.push(word);
  }
  if (chunk.length) chunks.push(chunk.join(' '));
  return chunks;
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

// HITL approval gate stubs until Action Centre implementation (Job S3)
app.post('/v1/journal/entries', async (req: AuthenticatedRequest, res) => {
  return enforceApprovalGate(req, res, 'JOURNAL_POST');
});

app.post('/v1/periods/:periodId/lock', async (req: AuthenticatedRequest, res) => {
  return enforceApprovalGate(req, res, 'PERIOD_LOCK');
});

app.post('/v1/handoff/:engagementId/send', async (req: AuthenticatedRequest, res) => {
  return enforceApprovalGate(req, res, 'HANDOFF_SEND');
});

app.post('/v1/archive/build', async (req: AuthenticatedRequest, res) => {
  return enforceApprovalGate(req, res, 'ARCHIVE_BUILD');
});

app.post('/v1/clients/:id/send', async (req: AuthenticatedRequest, res) => {
  return enforceApprovalGate(req, res, 'CLIENT_SEND');
});

app.post('/api/agent/start', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, engagementId, agentType } = req.body as {
      orgSlug?: string;
      engagementId?: string;
      agentType?: 'CLOSE' | 'TAX' | 'AUDIT' | 'ADVISORY' | 'CLIENT';
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!agentType) {
      return res.status(400).json({ error: 'agentType is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const { data: session, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .insert({
        org_id: orgContext.orgId,
        engagement_id: engagementId ?? null,
        agent_type: agentType,
        started_by_user_id: userId,
        status: 'RUNNING',
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      throw sessionError ?? new Error('session_not_created');
    }

    const { error: runError } = await supabaseService
      .from('agent_runs')
      .insert({
        org_id: orgContext.orgId,
        session_id: session.id,
        step_index: 0,
        state: 'PLANNING',
        summary: 'Session initialized; planning step created.',
      });

    if (runError) {
      throw runError;
    }

    logInfo('agent.session_started', {
      sessionId: session.id,
      orgId: orgContext.orgId,
      agentType,
      userId,
    });

    return res.status(201).json({ sessionId: session.id });
  } catch (err) {
    logError('agent.session_start_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to start session' });
  }
});

app.post('/api/agent/plan', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { sessionId, request } = req.body as { sessionId?: string; request?: unknown };
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const { data: session, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .select('id, org_id, agent_type, status, organization:organizations(slug)')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'session not found' });
    }

    const orgSlug = session.organization?.slug;
    if (!orgSlug) {
      return res.status(400).json({ error: 'session missing organization slug' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const requestContext = parseAgentRequestContext(request);

    const planResult = await generateAgentPlan({
      agentType: session.agent_type,
      supabase: supabaseService,
      openai,
      userRole: orgContext.role,
      requestContext,
      enforceCitations: ENFORCE_CITATIONS,
    });

    if (planResult.status === 'refused') {
      const summary = JSON.stringify(
        {
          refusal: planResult.refusal,
          personaVersion: planResult.personaVersion,
          policyPackVersion: planResult.policyPackVersion,
          requestContext,
        },
        null,
        2,
      );

      await supabaseService
        .from('agent_runs')
        .update({
          summary,
          state: 'ERROR',
        })
        .eq('session_id', sessionId)
        .eq('step_index', 0);

      await supabaseService.from('agent_traces').insert({
        org_id: orgContext.orgId,
        session_id: sessionId,
        trace_type: 'RESPONSE',
        payload: {
          refusal: planResult.refusal,
          personaVersion: planResult.personaVersion,
          policyPackVersion: planResult.policyPackVersion,
          model: planResult.model,
          attempts: planResult.attempts,
          requestContext,
        },
      });

      logInfo('agent.plan_refused', {
        sessionId,
        orgId: orgContext.orgId,
        agentType: session.agent_type,
        reason: planResult.refusal.reason,
      });

      return res.status(403).json({
        refusal: planResult.refusal,
        personaVersion: planResult.personaVersion,
        policyPackVersion: planResult.policyPackVersion,
      });
    }

    const prettyPlan = JSON.stringify(planResult.plan, null, 2);

    await supabaseService
      .from('agent_runs')
      .update({
        summary: prettyPlan,
        state: 'PLANNING',
      })
      .eq('session_id', sessionId)
      .eq('step_index', 0);

    const tracePayload: Record<string, unknown> = {
      plan: planResult.plan,
      personaVersion: planResult.personaVersion,
      policyPackVersion: planResult.policyPackVersion,
      model: planResult.model,
      isFallback: planResult.isFallback,
      attempts: planResult.attempts,
      requestContext,
    };

    if (planResult.costUsd !== undefined) {
      tracePayload.costUsd = planResult.costUsd;
    }
    if (planResult.usage) {
      tracePayload.usage = planResult.usage;
    }
    if (planResult.lastError) {
      tracePayload.lastError = planResult.lastError;
    }

    await supabaseService.from('agent_traces').insert({
      org_id: orgContext.orgId,
      session_id: sessionId,
      trace_type: 'RESPONSE',
      payload: tracePayload,
    });

    logInfo('agent.plan_generated', {
      sessionId,
      orgId: orgContext.orgId,
      agentType: session.agent_type,
      isFallback: planResult.isFallback,
      model: planResult.model,
      totalTokens: planResult.usage?.total_tokens,
    });

    return res.json({
      plan: planResult.plan,
      personaVersion: planResult.personaVersion,
      policyPackVersion: planResult.policyPackVersion,
      model: planResult.model,
      usage: planResult.usage,
      costUsd: planResult.costUsd,
      isFallback: planResult.isFallback,
    });
  } catch (err) {
    logError('agent.plan_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to generate plan' });
  }
});

app.post('/api/agent/execute', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { sessionId, stepIndex } = req.body as { sessionId?: string; stepIndex?: number };
    if (!sessionId || typeof stepIndex !== 'number') {
      return res.status(400).json({ error: 'sessionId and stepIndex are required' });
    }

    const { data: session, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .select('id, org_id, agent_type, engagement_id, started_by_user_id, organization:organizations(slug)')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'session not found' });
    }

    const orgSlug = session.organization?.slug;
    if (!orgSlug) {
      return res.status(400).json({ error: 'session missing organization slug' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const { data: run, error: runError } = await supabaseService
      .from('agent_runs')
      .select('id, summary, state')
      .eq('session_id', sessionId)
      .eq('step_index', stepIndex)
      .maybeSingle();

    if (runError || !run) {
      return res.status(404).json({ error: 'run not found' });
    }

    let planDocument: any = { steps: [] };
    if (run.summary) {
      try {
        planDocument = typeof run.summary === 'string' ? JSON.parse(run.summary) : run.summary;
      } catch (error) {
        logError('agent.plan_parse_failed', error, { sessionId, runId: run.id });
      }
    }

    const planStep = Array.isArray(planDocument.steps)
      ? planDocument.steps.find((step: any) => step?.stepIndex === stepIndex)
      : undefined;

    let normalizedTools: Array<{ key: string; input: Record<string, unknown> }> = [];

    if (planStep) {
      if (Array.isArray(planStep.toolIntents)) {
        normalizedTools = planStep.toolIntents
          .map((intent: any) => {
            const toolKey = typeof intent?.toolKey === 'string' ? intent.toolKey : '';
            const inputs = intent?.inputs && typeof intent.inputs === 'object' && !Array.isArray(intent.inputs)
              ? intent.inputs
              : {};
            return { key: toolKey, input: inputs };
          })
          .filter((intent: { key: string }) => intent.key);
      } else if (Array.isArray(planStep.tools)) {
        normalizedTools = planStep.tools
          .map((tool: any) =>
            typeof tool === 'string' ? { key: tool, input: {} } : { key: tool?.key, input: tool?.input ?? {} },
          )
          .filter((intent) => intent.key);
      }
    }

    if (!planStep || normalizedTools.length === 0) {
      return res.status(400).json({ error: 'no tools planned for this step' });
    }

    await supabaseService
      .from('agent_runs')
      .update({ state: 'EXECUTING' })
      .eq('id', run.id);

    const results: Array<{ toolKey: string; status: string; output?: unknown; error?: string }> = [];

    for (const toolItem of normalizedTools) {
      const { key: toolKey, input } = toolItem;
      if (!toolKey) continue;

      const { data: toolDef, error: toolError } = await supabaseService
        .from('tool_registry')
        .select('id, key, label, min_role, standards_refs, enabled, sensitive')
        .eq('key', toolKey)
        .maybeSingle();

      if (toolError || !toolDef || toolDef.enabled === false) {
        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'ERROR',
          payload: {
            toolKey,
            error: 'tool_not_available',
          },
        });
        results.push({ toolKey, status: 'ERROR', error: 'tool_not_available' });
        continue;
      }

      const minRoleLevel = ROLE_HIERARCHY[toolDef.min_role as keyof typeof ROLE_HIERARCHY] ?? 0;
      const userRoleLevel = ROLE_HIERARCHY[orgContext.role] ?? 0;
      if (userRoleLevel < minRoleLevel) {
        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'ERROR',
          payload: {
            toolKey,
            error: 'insufficient_role',
            requiredRole: toolDef.min_role,
          },
        });
        results.push({ toolKey, status: 'ERROR', error: 'insufficient_role' });
        continue;
      }

      const handler = toolHandlers[toolKey];
      if (!handler) {
        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'ERROR',
          payload: {
            toolKey,
            error: 'handler_not_implemented',
          },
        });
        results.push({ toolKey, status: 'ERROR', error: 'handler_not_implemented' });
        continue;
      }

      const { data: action, error: actionInsertError } = await supabaseService
        .from('agent_actions')
        .insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          action_type: 'TOOL',
          tool_key: toolKey,
          input_json: input ?? {},
          status: toolDef.sensitive && userRoleLevel < ROLE_HIERARCHY['MANAGER'] ? 'BLOCKED' : 'PENDING',
        })
        .select('id')
        .single();

      if (actionInsertError || !action) {
        results.push({ toolKey, status: 'ERROR', error: 'action_insert_failed' });
        continue;
      }

      if (toolDef.sensitive && userRoleLevel < ROLE_HIERARCHY['MANAGER']) {
        const entityRefs = extractEntityRefs(session, input);
        const evidenceRefs = extractEvidenceRefs(input);
        const standardsRefs = Array.isArray(toolDef.standards_refs) ? toolDef.standards_refs : [];
        const entityRefsPayload = entityRefs && Object.keys(entityRefs).length > 0 ? entityRefs : null;
        const approvalContext: Record<string, unknown> = {
          sessionId,
          runId: run.id,
          actionId: action.id,
          toolKey,
          standardsRefs,
          entityRefs: entityRefsPayload,
        };

        if (typeof toolDef.label === 'string' && toolDef.label.length > 0) {
          approvalContext.toolLabel = toolDef.label;
        }

        if (input && typeof input === 'object' && Object.keys(input).length > 0) {
          approvalContext.input = input;
        }
        if (evidenceRefs && evidenceRefs.length > 0) {
          approvalContext.evidenceRefs = evidenceRefs;
        }

        const { data: approval, error: approvalError } = await supabaseService
          .from('approval_queue')
          .insert({
            org_id: orgContext.orgId,
            kind: 'AGENT_ACTION',
            status: 'PENDING',
            requested_by_user_id: userId,
            context_json: approvalContext,
            session_id: sessionId,
            action_id: action.id,
          })
          .select('id')
          .single();

        if (approvalError || !approval) {
          await supabaseService
            .from('agent_actions')
            .update({ status: 'ERROR', output_json: { error: 'approval_queue_failed' } })
            .eq('id', action.id);

          results.push({ toolKey, status: 'ERROR', error: 'approval_queue_failed' });
          continue;
        }

        await supabaseService
          .from('agent_sessions')
          .update({ status: 'WAITING_APPROVAL' })
          .eq('id', sessionId);

        results.push({ toolKey, status: 'BLOCKED', approvalId: approval.id });
        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'RESPONSE',
          payload: {
            toolKey,
            status: 'BLOCKED',
            approvalId: approval.id,
          },
        });

        await supabaseService.from('activity_log').insert({
          org_id: orgContext.orgId,
          user_id: userId,
          action: 'AGENT_TOOL_CALL_BLOCKED',
          entity_type: 'agent_session',
          entity_id: sessionId,
          metadata: {
            toolKey,
            approvalId: approval.id,
            standards: toolDef.standards_refs ?? [],
            reason: 'sensitive_tool_requires_manager_approval',
          },
        });

        continue;
      }

      try {
        const output = await handler(input, {
          orgId: orgContext.orgId,
          engagementId: session.engagement_id ?? null,
          userId,
          sessionId,
          runId: run.id,
        });

        await supabaseService
          .from('agent_actions')
          .update({ status: 'SUCCESS', output_json: output ?? {} })
          .eq('id', action.id);

        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'TOOL',
          payload: {
            toolKey,
            input,
            output,
            status: 'SUCCESS',
          },
        });

        await supabaseService.from('activity_log').insert({
          org_id: orgContext.orgId,
          user_id: userId,
          action: 'AGENT_TOOL_CALL',
          entity_type: 'agent_session',
          entity_id: sessionId,
          metadata: {
            toolKey,
            status: 'SUCCESS',
            standards: toolDef.standards_refs ?? [],
            inputHash: hashPayload(input),
            outputHash: hashPayload(output),
          },
        });

        results.push({ toolKey, status: 'SUCCESS', output });
      } catch (toolExecutionError: any) {
        const errorMessage = toolExecutionError?.message ?? 'execution_failed';

        await supabaseService
          .from('agent_actions')
          .update({ status: 'ERROR', output_json: { error: errorMessage } })
          .eq('id', action.id);

        await supabaseService.from('agent_traces').insert({
          org_id: orgContext.orgId,
          session_id: sessionId,
          run_id: run.id,
          trace_type: 'ERROR',
          payload: {
            toolKey,
            input,
            error: errorMessage,
          },
        });

        await supabaseService.from('activity_log').insert({
          org_id: orgContext.orgId,
          user_id: userId,
          action: 'AGENT_TOOL_CALL',
          entity_type: 'agent_session',
          entity_id: sessionId,
          metadata: {
            toolKey,
            status: 'ERROR',
            error: errorMessage,
            standards: toolDef.standards_refs ?? [],
            inputHash: hashPayload(input),
          },
        });

        results.push({ toolKey, status: 'ERROR', error: errorMessage });
      }
    }

    if (!Array.isArray(planDocument.steps)) {
      planDocument.steps = [];
    }

    planDocument.steps = planDocument.steps.map((step: any) =>
      step?.stepIndex === stepIndex ? { ...step, results } : step,
    );

    const hasErrorResult = results.some((result) => result.status === 'ERROR');
    const hasPendingResult = results.some((result) => result.status === 'BLOCKED' || result.status === 'PENDING');
    let runState: 'DONE' | 'EXECUTING' | 'ERROR' = 'DONE';
    if (hasErrorResult) {
      runState = 'ERROR';
    } else if (hasPendingResult) {
      runState = 'EXECUTING';
    }

    await supabaseService
      .from('agent_runs')
      .update({
        state: runState,
        summary: JSON.stringify(planDocument),
      })
      .eq('id', run.id);

    return res.json({ stepIndex, results });
  } catch (err) {
    logError('agent.execute_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to execute tools' });
  }
});

app.get('/v1/approvals', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = req.query.orgSlug as string | undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const pending = approvalQueue.filter((item) => item.orgSlug === orgContext.orgSlug);
    const history = approvalHistory.filter((item) => item.orgSlug === orgContext.orgSlug);

    return res.json({ pending, history });
  } catch (err) {
    logError('approvals.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/approvals/:id/decision', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const approvalId = req.params.id;
    const { decision, comment, evidence, orgSlug } = req.body as {
      decision?: 'APPROVED' | 'CHANGES_REQUESTED';
      comment?: string;
      evidence?: ApprovalEvidence[];
      orgSlug?: string;
    };

    if (!decision || !['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) {
      return res.status(400).json({ error: 'invalid decision' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const index = approvalQueue.findIndex((item) => item.id === approvalId && item.orgSlug === orgContext.orgSlug);
    if (index === -1) {
      return res.status(404).json({ error: 'approval not found' });
    }

    const item = approvalQueue.splice(index, 1)[0];
    const mergedEvidence = [...item.evidence];
    if (Array.isArray(evidence)) {
      evidence.forEach((ev) => {
        if (!mergedEvidence.find((existing) => existing.id === ev.id)) {
          mergedEvidence.push(ev);
        }
      });
    }

    const decisionRecord: ApprovalItem = {
      ...item,
      status: decision,
      decidedBy: userId,
      reviewerName: req.user?.email ?? undefined,
      decidedAt: new Date().toISOString(),
      decisionComment: comment,
      evidence: mergedEvidence,
    };

    approvalHistory.unshift(decisionRecord);

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_CHANGES_REQUESTED',
      entity_type: 'approval',
      entity_id: decisionRecord.id,
      metadata: {
        action: decisionRecord.action,
        entity: decisionRecord.entity,
        decision,
        comment,
        standards: decisionRecord.standards,
        evidence: mergedEvidence,
      },
    });

    logInfo('approvals.decision_recorded', {
      userId,
      approvalId,
      decision,
      orgId: orgContext.orgId,
    });

    return res.json({ approval: decisionRecord });
  } catch (err) {
    logError('approvals.decision_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'decision failed' });
  }
});

app.post('/api/agent/approve', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { approvalId, decision, comment } = req.body as {
      approvalId?: string;
      decision?: 'APPROVED' | 'REJECTED';
      comment?: string;
    };

    if (!approvalId || !decision) {
      return res.status(400).json({ error: 'approvalId and decision are required' });
    }
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'invalid decision' });
    }

    const { data: queueItem, error: queueError } = await supabaseService
      .from('approval_queue')
      .select('id, org_id, status, kind, context_json')
      .eq('id', approvalId)
      .maybeSingle();

    if (queueError || !queueItem) {
      return res.status(404).json({ error: 'approval not found' });
    }

    const orgContext = await resolveOrgByIdForUser(userId, queueItem.org_id as string);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const context = (queueItem.context_json as Record<string, unknown> | null) ?? {};
    const updatedContextBase = {
      ...context,
      decisionComment: comment ?? null,
    };

    let updatedContext = updatedContextBase;

    if (decision === 'APPROVED') {
      const resumeOutcome = await resumeApprovedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
      });
      updatedContext = {
        ...updatedContextBase,
        resumeOutcome,
      };
    } else {
      await rejectBlockedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
        comment,
      });
      updatedContext = {
        ...updatedContextBase,
        rejection: {
          comment: comment ?? null,
        },
      };
    }

    const { data: result, error: updateError } = await supabaseService
      .from('approval_queue')
      .update({
        status: decision,
        approved_by_user_id: userId,
        decision_at: new Date().toISOString(),
        context_json: updatedContext,
      })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (updateError || !result) {
      throw updateError ?? new Error('approval_update_failed');
    }

    await supabaseService.from('activity_log').insert({
      org_id: queueItem.org_id,
      user_id: userId,
      action: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      entity_type: 'approval_queue',
      entity_id: approvalId,
      metadata: {
        decision,
        comment,
        kind: queueItem.kind,
      },
    });

    logInfo('agent.approval_decision_recorded', {
      approvalId,
      decision,
      userId,
    });

    return res.json({ approval: result });
  } catch (err) {
    logError('agent.approval_decision_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to record decision' });
  }
});

app.get('/api/agent/telemetry', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = req.query.orgSlug as string | undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      sessionCountsResult,
      sessionTrendResult,
      approvalsResult,
      memoTracesResult,
      refusalTracesResult,
      toolErrorResult,
      latencyResult,
      recentTracesResult,
    ] = await Promise.all([
      supabaseService
        .from('agent_sessions')
        .select('status, count:id')
        .eq('org_id', orgContext.orgId)
        .group('status'),
      supabaseService
        .from('agent_sessions')
        .select('status, created_at')
        .eq('org_id', orgContext.orgId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseService
        .from('approval_queue')
        .select('id, requested_at')
        .eq('org_id', orgContext.orgId)
        .eq('status', 'PENDING'),
      supabaseService
        .from('agent_traces')
        .select('payload, created_at')
        .eq('org_id', orgContext.orgId)
        .eq('trace_type', 'RESPONSE')
        .not('payload->>memo', 'is', null)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1000),
      supabaseService
        .from('agent_traces')
        .select('payload')
        .eq('org_id', orgContext.orgId)
        .eq('trace_type', 'RESPONSE')
        .not('payload->>refusal', 'is', null)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000),
      supabaseService
        .from('agent_traces')
        .select('payload')
        .eq('org_id', orgContext.orgId)
        .eq('trace_type', 'ERROR')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000),
      supabaseService
        .from('agent_traces')
        .select('payload')
        .eq('org_id', orgContext.orgId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1000),
      supabaseService
        .from('agent_traces')
        .select('id, session_id, trace_type, payload, created_at')
        .eq('org_id', orgContext.orgId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const { data: sessionCountsData, error: sessionCountsError } = sessionCountsResult;
    if (sessionCountsError) {
      throw sessionCountsError;
    }

    const { data: sessionTrendData, error: sessionTrendError } = sessionTrendResult;
    if (sessionTrendError) {
      throw sessionTrendError;
    }

    const { data: approvalsData, error: approvalsError } = approvalsResult;
    if (approvalsError) {
      throw approvalsError;
    }

    const { data: memoTracesData, error: memoTracesError } = memoTracesResult;
    if (memoTracesError) {
      throw memoTracesError;
    }

    const { data: refusalTracesData, error: refusalTracesError } = refusalTracesResult;
    if (refusalTracesError) {
      throw refusalTracesError;
    }

    const { data: toolErrorData, error: toolErrorDataError } = toolErrorResult;
    if (toolErrorDataError) {
      throw toolErrorDataError;
    }

    const { data: latencyData, error: latencyError } = latencyResult;
    if (latencyError) {
      throw latencyError;
    }

    const { data: recentTracesData, error: recentTracesError } = recentTracesResult;
    if (recentTracesError) {
      throw recentTracesError;
    }

    const sessionsByStatus: Record<string, number> = {
      RUNNING: 0,
      WAITING_APPROVAL: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const row of sessionCountsData ?? []) {
      const status = typeof row.status === 'string' ? row.status : null;
      const countValueRaw = (row as Record<string, unknown>)['count'];
      const countValue = typeof countValueRaw === 'number' ? countValueRaw : Number(countValueRaw ?? 0);
      if (!status || !Number.isFinite(countValue)) continue;
      sessionsByStatus[status] = (sessionsByStatus[status] ?? 0) + countValue;
    }

    const sessionTrendBuckets: Record<string, number> = {};
    for (const row of sessionTrendData ?? []) {
      const createdAtRaw = (row as Record<string, unknown>).created_at as string | undefined;
      if (!createdAtRaw) continue;
      const dayKey = formatDateKey(new Date(createdAtRaw));
      sessionTrendBuckets[dayKey] = (sessionTrendBuckets[dayKey] ?? 0) + 1;
    }
    const sessionTrendKeys = buildLastNDaysKeys(7, now);
    const sessionsTrend = sessionTrendKeys.map((dateKey) => ({
      date: dateKey,
      count: sessionTrendBuckets[dateKey] ?? 0,
    }));

    const pendingApprovals = approvalsData ?? [];
    let totalPendingAgeMs = 0;
    for (const approval of pendingApprovals) {
      const requestedAt = (approval as Record<string, unknown>).requested_at as string | undefined;
      if (!requestedAt) continue;
      const requested = new Date(requestedAt);
      totalPendingAgeMs += now.getTime() - requested.getTime();
    }
    const averagePendingHoursRaw = pendingApprovals.length > 0
      ? totalPendingAgeMs / pendingApprovals.length / (60 * 60 * 1000)
      : 0;
    const averagePendingHours = Number.isFinite(averagePendingHoursRaw)
      ? Math.round(averagePendingHoursRaw * 100) / 100
      : 0;

    const memoTrendBuckets: Record<string, { total: number; withCitations: number }> = {};
    let memosWithCitations = 0;
    for (const memoRow of memoTracesData ?? []) {
      const payload = ((memoRow as Record<string, unknown>).payload ?? {}) as Record<string, unknown>;
      const createdAt = (memoRow as Record<string, unknown>).created_at as string | undefined;
      const dayKey = createdAt ? formatDateKey(new Date(createdAt)) : formatDateKey(now);

      let hasCitations = false;
      const directCitations = payload.citations;
      if (Array.isArray(directCitations) && directCitations.length > 0) {
        hasCitations = true;
      }
      const memo = payload.memo;
      if (!hasCitations && memo && typeof memo === 'object') {
        const sections = (memo as Record<string, unknown>).sections;
        if (Array.isArray(sections)) {
          hasCitations = sections.some((section) => {
            if (!section || typeof section !== 'object') return false;
            const citations = (section as Record<string, unknown>).citations;
            return Array.isArray(citations) && citations.length > 0;
          });
        }
      }
      if (!hasCitations) {
        const citationResult = payload.citationResult;
        if (citationResult && typeof citationResult === 'object') {
          const citations = (citationResult as Record<string, unknown>).citations;
          if (Array.isArray(citations) && citations.length > 0) {
            hasCitations = true;
          }
        }
      }

      const bucket = memoTrendBuckets[dayKey] ?? { total: 0, withCitations: 0 };
      bucket.total += 1;
      if (hasCitations) {
        bucket.withCitations += 1;
        memosWithCitations += 1;
      }
      memoTrendBuckets[dayKey] = bucket;
    }

    const totalMemos = (memoTracesData ?? []).length;
    const groundednessPercentRaw = totalMemos > 0 ? (memosWithCitations / totalMemos) * 100 : 0;
    const groundednessPercent = Math.round(groundednessPercentRaw * 10) / 10;
    const groundednessTrend = sessionTrendKeys.map((dateKey) => {
      const bucket = memoTrendBuckets[dateKey];
      const percentRaw = bucket && bucket.total > 0 ? (bucket.withCitations / bucket.total) * 100 : 0;
      const percent = Math.round(percentRaw * 10) / 10;
      return { date: dateKey, percent };
    });

    const refusalCounts: Record<string, number> = {};
    for (const row of refusalTracesData ?? []) {
      const payload = (row as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      const refusal = payload?.refusal as Record<string, unknown> | undefined;
      const reasonRaw = refusal?.reason;
      const reason = typeof reasonRaw === 'string' && reasonRaw.trim().length > 0 ? reasonRaw : 'unknown';
      refusalCounts[reason] = (refusalCounts[reason] ?? 0) + 1;
    }
    const totalRefusals = (refusalTracesData ?? []).length;
    const topReasons = Object.entries(refusalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));

    const toolFailureCounts: Record<string, number> = {};
    for (const row of toolErrorData ?? []) {
      const payload = (row as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      const key = typeof payload?.toolKey === 'string'
        ? payload.toolKey
        : typeof payload?.tool_key === 'string'
        ? (payload.tool_key as string)
        : 'unknown';
      toolFailureCounts[key] = (toolFailureCounts[key] ?? 0) + 1;
    }
    const totalToolFailures = (toolErrorData ?? []).length;
    const topTools = Object.entries(toolFailureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([toolKey, count]) => ({ toolKey, count }));

    const latencySamples: number[] = [];
    for (const row of latencyData ?? []) {
      const payload = (row as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      if (!payload) continue;
      const latencyCandidates = [payload.latencyMs, payload.latency_ms, payload.latency];
      for (const candidate of latencyCandidates) {
        const value = typeof candidate === 'number' ? candidate : typeof candidate === 'string' ? Number(candidate) : NaN;
        if (Number.isFinite(value) && value > 0) {
          latencySamples.push(value);
          break;
        }
      }
    }

    const latencyP50 = Math.round(computePercentile(latencySamples, 50));
    const latencyP95 = Math.round(computePercentile(latencySamples, 95));

    const sessionIds = Array.from(
      new Set(
        (recentTracesData ?? [])
          .map((trace) => (trace as Record<string, unknown>).session_id as string | null)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    let sessionMetaMap: Record<string, { agentType: string | null; status: string | null }> = {};
    if (sessionIds.length > 0) {
      const { data: sessionMetaData, error: sessionMetaError } = await supabaseService
        .from('agent_sessions')
        .select('id, agent_type, status')
        .in('id', sessionIds);
      if (sessionMetaError) {
        throw sessionMetaError;
      }
      sessionMetaMap = (sessionMetaData ?? []).reduce<Record<string, { agentType: string | null; status: string | null }>>(
        (acc, row) => {
          const record = row as Record<string, unknown>;
          const id = record.id as string | undefined;
          if (!id) return acc;
          acc[id] = {
            agentType: typeof record.agent_type === 'string' ? (record.agent_type as string) : null,
            status: typeof record.status === 'string' ? (record.status as string) : null,
          };
          return acc;
        },
        {},
      );
    }

    const recentTraces = (recentTracesData ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const payload = (record.payload ?? {}) as Record<string, unknown>;
      const sessionId = record.session_id as string | undefined;
      const meta = sessionId ? sessionMetaMap[sessionId] : undefined;
      const statusCandidate = typeof payload.status === 'string' ? (payload.status as string) : undefined;
      const refusal = payload.refusal as Record<string, unknown> | undefined;
      const summaryCandidate =
        typeof payload.error === 'string'
          ? (payload.error as string)
          : typeof payload.message === 'string'
          ? (payload.message as string)
          : typeof payload.decisionComment === 'string'
          ? (payload.decisionComment as string)
          : refusal && typeof refusal.message === 'string'
          ? (refusal.message as string)
          : undefined;
      return {
        id: record.id as string,
        sessionId: sessionId ?? null,
        createdAt: record.created_at as string,
        traceType: record.trace_type as string,
        agentType: meta?.agentType ?? null,
        sessionStatus: meta?.status ?? null,
        status: statusCandidate ?? (refusal?.reason as string | undefined) ?? (record.trace_type === 'ERROR' ? 'ERROR' : null),
        toolKey:
          typeof payload.toolKey === 'string'
            ? (payload.toolKey as string)
            : typeof payload.tool_key === 'string'
            ? (payload.tool_key as string)
            : null,
        summary: summaryCandidate ?? null,
      };
    });

    return res.json({
      sessions: {
        byStatus: sessionsByStatus,
        trend: sessionsTrend,
      },
      approvals: {
        pendingCount: pendingApprovals.length,
        averagePendingHours,
      },
      groundedness: {
        total: totalMemos,
        withCitations: memosWithCitations,
        percent: groundednessPercent,
        trend: groundednessTrend,
      },
      refusals: {
        total: totalRefusals,
        topReasons,
      },
      toolFailures: {
        total: totalToolFailures,
        topTools,
      },
      latency: {
        p50: latencyP50,
        p95: latencyP95,
        sampleSize: latencySamples.length,
      },
      traces: {
        items: recentTraces,
      },
    });
  } catch (err) {
    logError('agent.telemetry_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'telemetry_failed' });
  }
});

app.post('/v1/rag/ingest', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const text = await extractText(buffer, mimetype);
    const chunks = chunkText(text);
    const embeddings = await embed(chunks);

    await db.query('BEGIN');
    const docResult = await db.query(
      'INSERT INTO documents(name) VALUES ($1) RETURNING id',
      [originalname]
    );
    const docId = docResult.rows[0].id;

    const insertChunk =
      'INSERT INTO document_chunks(doc_id, chunk_index, content, embedding) VALUES ($1,$2,$3,$4)';
    for (let i = 0; i < chunks.length; i++) {
      await db.query(insertChunk, [docId, i, chunks[i], vector(embeddings[i])]);
    }
    await db.query('COMMIT');

    logInfo('ingest.complete', { userId: req.user?.sub, documentId: docId, chunks: chunks.length });
    res.json({ documentId: docId, chunks: chunks.length });
  } catch (err) {
    await db.query('ROLLBACK');
    logError('ingest.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'ingest failed' });
  }
});

app.post('/v1/rag/search', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { query, topK, orgSlug, domain } = req.body as {
      query?: string;
      topK?: number;
      orgSlug?: string;
      domain?: string;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'query is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const cacheKey = `rag.search:${hashPayload({ orgId: orgContext.orgId, query, topK, domain })}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logInfo('rag.search.cache_hit', { userId, query, orgId: orgContext.orgId });
      return res.json(cached);
    }

    const chunks = await retrieveRagChunks({
      orgId: orgContext.orgId,
      query,
      domain,
      topK,
      db,
      openai,
    });

    const results = chunks.map((chunk) => ({
      id: chunk.id,
      text: chunk.chunk_text,
      score: chunk.score ?? null,
      distance: chunk.distance ?? null,
      citations: chunk.citations,
      standardRefs: chunk.standardRefs,
    }));

    const response = { results };
    cache.set(cacheKey, response, 30);

    logInfo('rag.search.complete', {
      userId,
      query,
      orgId: orgContext.orgId,
      domain,
      results: results.length,
    });

    return res.json(response);
  } catch (err) {
    logError('rag.search.failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'search failed' });
  }
});

app.post('/v1/rag/reembed', async (req: AuthenticatedRequest, res) => {
  try {
    const { documentId } = req.body as { documentId: string };
    if (!documentId) {
      return res.status(400).json({ error: 'documentId required' });
    }

    const { rows } = await db.query(
      'SELECT id, content FROM document_chunks WHERE doc_id = $1 ORDER BY chunk_index',
      [documentId]
    );
    const texts = rows.map((r: any) => r.content);
    const embeddings = await embed(texts);
    for (let i = 0; i < rows.length; i++) {
      await db.query('UPDATE document_chunks SET embedding = $1 WHERE id = $2', [vector(embeddings[i]), rows[i].id]);
    }
    logInfo('reembed.complete', { userId: req.user?.sub, documentId, updated: rows.length });
    res.json({ updated: rows.length });
  } catch (err) {
    logError('reembed.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'reembed failed' });
  }
});

app.post('/v1/storage/documents', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const { orgSlug, engagementId, name } = req.body as {
      orgSlug?: string;
      engagementId?: string;
      name?: string;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const storagePath = `documents/${orgSlug}/${engagementId ?? 'general'}/${randomUUID()}_${req.file.originalname}`;

    const { error: uploadError } = await supabaseService.storage
      .from('documents')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: document, error: insertError } = await supabaseService
      .from('documents')
      .insert({
        org_id: orgContext.orgId,
        engagement_id: engagementId ?? null,
        name: name ?? req.file.originalname,
        file_path: storagePath,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_by: userId,
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPLOAD_DOCUMENT',
      entity_type: 'document',
      entity_id: document.id,
      metadata: {
        name: document.name,
        path: storagePath,
        size: req.file.size,
      },
    });

    logInfo('documents.uploaded', { userId, documentId: document.id, path: storagePath });
    return res.status(201).json({ document });
  } catch (err) {
    logError('documents.upload_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'upload failed' });
  }
});

app.get('/v1/storage/documents', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: documents, error } = await supabaseService
      .from('documents')
      .select('*')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return res.json({ documents: documents ?? [] });
  } catch (err) {
    logError('documents.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.get('/v1/notifications', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data, error } = await supabaseService
      .from('notifications')
      .select('id, org_id, user_id, title, body, type, read, created_at')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ notifications: data ?? [] });
  } catch (err) {
    logError('notifications.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/storage/sign', async (req: AuthenticatedRequest, res) => {
  try {
    const { documentId } = req.body as { documentId?: string };
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

  const { data: document, error: fetchError } = await supabaseService
    .from('documents')
    .select('id, org_id, file_path, name, uploaded_by')
    .eq('id', documentId)
    .maybeSingle();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'document not found' });
    }

    const { data: org } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', document.org_id)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'organization not found' });
    }

    try {
      await resolveOrgForUser(userId, org.slug);
    } catch (err) {
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: signedUrlData, error: signError } = await supabaseService
      .storage
      .from('documents')
      .createSignedUrl(document.file_path, Number(process.env.DOCUMENT_SIGN_TTL ?? '120'));

    if (signError || !signedUrlData) {
      throw signError ?? new Error('failed to sign url');
    }

    logInfo('documents.signed_url', { userId, documentId });
    return res.json({ url: signedUrlData.signedUrl });
  } catch (err) {
    logError('documents.sign_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'sign failed' });
  }
});

app.delete('/v1/storage/documents/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const documentId = req.params.id;
    const { data: document, error: fetchError } = await supabaseService
      .from('documents')
      .select('id, org_id, file_path, name')
      .eq('id', documentId)
      .maybeSingle();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'document not found' });
    }

    const { data: org } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', document.org_id)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'organization not found' });
    }

    try {
      await resolveOrgForUser(userId, org.slug);
    } catch (err) {
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }
    const actorContext = await resolveOrgForUser(userId, org.slug);
    const { data: membership } = await supabaseService
      .from('memberships')
      .select('role')
      .eq('org_id', actorContext.orgId)
      .eq('user_id', userId)
      .maybeSingle();

    const actorRole = membership?.role ?? 'EMPLOYEE';
    const isUploader = document.uploaded_by === userId;
    const isManager = actorRole === 'MANAGER' || actorRole === 'SYSTEM_ADMIN';
    if (!isUploader && !isManager) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { error: storageError } = await supabaseService
      .storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabaseService
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('org_id', document.org_id);

    if (deleteError) {
      throw deleteError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: document.org_id,
      user_id: userId,
      action: 'DELETE_DOCUMENT',
      entity_type: 'document',
      entity_id: documentId,
      metadata: {
        name: document.name,
        path: document.file_path,
      },
    });

    logInfo('documents.deleted', { userId, documentId });
    return res.status(204).send();
  } catch (err) {
    logError('documents.delete_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'delete failed' });
  }
});

app.get('/v1/clients', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '50')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: clients, error } = await supabaseService
      .from('clients')
      .select('*')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ clients: clients ?? [] });
  } catch (err) {
    logError('clients.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/clients', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const {
      orgSlug,
      name,
      contactName,
      email,
      phone,
      country,
      industry,
      fiscalYearEnd,
    } = req.body as {
      orgSlug?: string;
      name?: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      country?: string | null;
      industry?: string | null;
      fiscalYearEnd?: string | null;
    };

    if (!orgSlug || !name) {
      return res.status(400).json({ error: 'orgSlug and name are required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: client, error } = await supabaseService
      .from('clients')
      .insert({
        org_id: orgContext.orgId,
        name,
        contact_name: contactName ?? null,
        email: email ?? null,
        phone: phone ?? null,
        country: country ?? null,
        industry: industry ?? null,
        fiscal_year_end: fiscalYearEnd ?? null,
      })
      .select('*')
      .single();

    if (error || !client) {
      throw error ?? new Error('client_not_created');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'CREATE_CLIENT',
      entity_type: 'client',
      entity_id: client.id,
      metadata: {
        name: client.name,
        industry: client.industry,
      },
    });

    logInfo('clients.created', { userId, clientId: client.id, orgId: orgContext.orgId });
    return res.status(201).json({ client });
  } catch (err) {
    logError('clients.create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.patch('/v1/clients/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const clientId = req.params.id;
    const {
      orgSlug,
      name,
      contactName,
      email,
      phone,
      country,
      industry,
      fiscalYearEnd,
    } = req.body as {
      orgSlug?: string;
      name?: string | null;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      country?: string | null;
      industry?: string | null;
      fiscalYearEnd?: string | null;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: existing, error: fetchError } = await supabaseService
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (fetchError || !existing || existing.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'client not found' });
    }

    const updatePayload: Record<string, unknown> = {};

    const independenceFieldsProvided =
      typeof isAuditClient === 'boolean' ||
      typeof requiresEqr === 'boolean' ||
      typeof nonAuditServices !== 'undefined' ||
      typeof independenceChecked === 'boolean' ||
      typeof overrideNote !== 'undefined';

    const targetIsAuditClient = Boolean(
      typeof isAuditClient === 'boolean' ? isAuditClient : existing.is_audit_client,
    );
    const targetRequiresEqr = Boolean(
      typeof requiresEqr === 'boolean' ? requiresEqr : existing.requires_eqr,
    );
    let targetServices = typeof nonAuditServices !== 'undefined'
      ? sanitizeNonAuditServices(nonAuditServices)
      : sanitizeNonAuditServices(existing.non_audit_services);
    let targetIndependenceChecked = typeof independenceChecked === 'boolean'
      ? independenceChecked
      : Boolean(existing.independence_checked);
    let targetOverrideNote =
      typeof overrideNote === 'undefined'
        ? existing.independence_conclusion_note ?? null
        : (overrideNote ?? null);

    let independenceAssessment: IndependenceAssessmentResult | null = null;
    let overrideApprovalId: string | null = null;

    if (independenceFieldsProvided) {
      independenceAssessment = assessIndependence({
        isAuditClient: targetIsAuditClient,
        independenceChecked: targetIndependenceChecked,
        services: targetServices,
        overrideNote: targetOverrideNote,
      });

      if (!independenceAssessment.ok) {
        if (independenceAssessment.error === 'independence_check_required') {
          return res.status(400).json({ error: 'independence_check_required' });
        }
        if (independenceAssessment.error === 'prohibited_nas') {
          return res.status(409).json({ error: 'prohibited_non_audit_services' });
        }
      } else {
        targetIndependenceChecked = independenceAssessment.checked;
        targetOverrideNote = independenceAssessment.note;
        targetServices = independenceAssessment.services;
        updatePayload.independence_checked = independenceAssessment.checked;
        updatePayload.independence_conclusion = independenceAssessment.conclusion;
        updatePayload.independence_conclusion_note = independenceAssessment.note;
        updatePayload.non_audit_services = targetServices.length > 0 ? targetServices : null;
        updatePayload.is_audit_client = targetIsAuditClient;
        updatePayload.requires_eqr = targetRequiresEqr;

        await supabaseService.from('activity_log').insert({
          org_id: orgContext.orgId,
          user_id: userId,
          action: 'ENGAGEMENT_INDEPENDENCE_CHECK',
          entity_type: 'engagement',
          entity_id: engagementId,
          metadata: {
            isAuditClient: targetIsAuditClient,
            prohibitedServices: targetServices.filter((svc) => svc.prohibited).map((svc) => svc.service),
            conclusion: independenceAssessment.conclusion,
          },
        });

        if (independenceAssessment.needsApproval) {
          overrideApprovalId = await ensureIndependenceOverrideApproval({
            orgId: orgContext.orgId,
            engagementId,
            userId,
            note: independenceAssessment.note ?? '',
            services: targetServices,
            isAuditClient: targetIsAuditClient,
          });

          await supabaseService.from('activity_log').insert({
            org_id: orgContext.orgId,
            user_id: userId,
            action: 'INDEPENDENCE_OVERRIDE_REQUESTED',
            entity_type: 'engagement',
            entity_id: engagementId,
            metadata: {
              approvalId: overrideApprovalId,
              note: independenceAssessment.note,
            },
          });
        }
      }
    } else {
      if (typeof isAuditClient === 'boolean') {
        updatePayload.is_audit_client = targetIsAuditClient;
      }
      if (typeof requiresEqr === 'boolean') {
        updatePayload.requires_eqr = targetRequiresEqr;
      }
    }
    if (typeof name === 'string') updatePayload.name = name;
    if (typeof contactName !== 'undefined') updatePayload.contact_name = contactName;
    if (typeof email !== 'undefined') updatePayload.email = email;
    if (typeof phone !== 'undefined') updatePayload.phone = phone;
    if (typeof country !== 'undefined') updatePayload.country = country;
    if (typeof industry !== 'undefined') updatePayload.industry = industry;
    if (typeof fiscalYearEnd !== 'undefined') updatePayload.fiscal_year_end = fiscalYearEnd;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no updates provided' });
    }

    const { data: client, error: updateError } = await supabaseService
      .from('clients')
      .update(updatePayload)
      .eq('id', clientId)
      .eq('org_id', orgContext.orgId)
      .select('*')
      .single();

    if (updateError || !client) {
      throw updateError ?? new Error('client_not_updated');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPDATE_CLIENT',
      entity_type: 'client',
      entity_id: client.id,
      metadata: {
        name: client.name,
        updates: updatePayload,
      },
    });

    logInfo('clients.updated', { userId, clientId: client.id, orgId: orgContext.orgId });
    return res.json({ client });
  } catch (err) {
    logError('clients.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.delete('/v1/clients/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const clientId = req.params.id;
    const orgSlug = req.query.orgSlug as string | undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: client, error: fetchError } = await supabaseService
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (fetchError || !client || client.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'client not found' });
    }

    const { count: dependentEngagements } = await supabaseService
      .from('engagements')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgContext.orgId)
      .eq('client_id', client.id);

    if ((dependentEngagements ?? 0) > 0) {
      return res.status(409).json({ error: 'client_has_engagements' });
    }

    const { error: deleteError } = await supabaseService
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('org_id', orgContext.orgId);

    if (deleteError) {
      throw deleteError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'DELETE_CLIENT',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        name: client.name,
        email: client.email,
      },
    });

    logInfo('clients.deleted', { userId, clientId, orgId: orgContext.orgId });
    return res.status(204).send();
  } catch (err) {
    logError('clients.delete_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'delete failed' });
  }
});

app.get('/v1/engagements', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '50')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: rows, error } = await supabaseService
      .from('engagements')
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const engagements = (rows ?? []).map((row) => ({
      ...row,
      status: row.status ?? 'PLANNING',
      is_audit_client: Boolean(row.is_audit_client),
      requires_eqr: Boolean(row.requires_eqr),
      non_audit_services: sanitizeNonAuditServices(row.non_audit_services),
      independence_checked: Boolean(row.independence_checked),
      independence_conclusion: typeof row.independence_conclusion === 'string' ? row.independence_conclusion : 'OK',
      independence_conclusion_note: row.independence_conclusion_note ?? null,
    }));

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ engagements });
  } catch (err) {
    logError('engagements.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/engagements', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const {
      orgSlug,
      clientId,
      title,
      description,
      status,
      startDate,
      endDate,
      budget,
      isAuditClient,
      requiresEqr,
      nonAuditServices,
      independenceChecked,
      overrideNote,
    } = req.body as {
      orgSlug?: string;
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

    if (!orgSlug || !clientId || !title) {
      return res.status(400).json({ error: 'orgSlug, clientId, and title are required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: clientRow, error: clientError } = await supabaseService
      .from('clients')
      .select('org_id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError || !clientRow || clientRow.org_id !== orgContext.orgId) {
      return res.status(400).json({ error: 'client does not belong to organization' });
    }

    const sanitizedServices = sanitizeNonAuditServices(nonAuditServices);

    const independenceAssessment = assessIndependence({
      isAuditClient: Boolean(isAuditClient),
      independenceChecked: Boolean(independenceChecked),
      services: sanitizedServices,
      overrideNote,
    });

    if (!independenceAssessment.ok) {
      if (independenceAssessment.error === 'independence_check_required') {
        return res.status(400).json({ error: 'independence_check_required' });
      }
      if (independenceAssessment.error === 'prohibited_nas') {
        return res.status(409).json({ error: 'prohibited_non_audit_services' });
      }
    }

    const payload = {
      org_id: orgContext.orgId,
      client_id: clientId,
      title,
      description: description ?? null,
      status: (status ?? 'PLANNING').toUpperCase(),
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      budget: budget ?? null,
      is_audit_client: Boolean(isAuditClient),
      requires_eqr: Boolean(requiresEqr),
      non_audit_services: sanitizedServices.length > 0 ? sanitizedServices : null,
      independence_checked: independenceAssessment.checked,
      independence_conclusion: independenceAssessment.conclusion,
      independence_conclusion_note: independenceAssessment.note,
    };

    const { data: engagement, error } = await supabaseService
      .from('engagements')
      .insert(payload)
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .single();

    if (error || !engagement) {
      throw error ?? new Error('engagement_not_created');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'ENGAGEMENT_INDEPENDENCE_CHECK',
      entity_type: 'engagement',
      entity_id: engagement.id,
      metadata: {
        isAuditClient: Boolean(isAuditClient),
        prohibitedServices: sanitizedServices.filter((svc) => svc.prohibited).map((svc) => svc.service),
        conclusion: independenceAssessment.conclusion,
      },
    });

    let overrideApprovalId: string | null = null;
    if (independenceAssessment.needsApproval) {
      overrideApprovalId = await ensureIndependenceOverrideApproval({
        orgId: orgContext.orgId,
        engagementId: engagement.id,
        userId,
        note: independenceAssessment.note ?? '',
        services: sanitizedServices,
        isAuditClient: Boolean(isAuditClient),
      });

      await supabaseService.from('activity_log').insert({
        org_id: orgContext.orgId,
        user_id: userId,
        action: 'INDEPENDENCE_OVERRIDE_REQUESTED',
        entity_type: 'engagement',
        entity_id: engagement.id,
        metadata: {
          approvalId: overrideApprovalId,
          note: independenceAssessment.note,
        },
      });
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'CREATE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagement.id,
      metadata: {
        title: engagement.title,
        client_id: engagement.client_id,
        status: engagement.status,
        independence: {
          isAuditClient: Boolean(isAuditClient),
          conclusion: independenceAssessment.conclusion,
          overrideApprovalId,
        },
      },
    });

    const normalizedEngagement = {
      ...engagement,
      non_audit_services: sanitizeNonAuditServices(engagement.non_audit_services),
      is_audit_client: Boolean(engagement.is_audit_client),
      requires_eqr: Boolean(engagement.requires_eqr),
      independence_checked: Boolean(engagement.independence_checked),
      independence_conclusion: typeof engagement.independence_conclusion === 'string'
        ? engagement.independence_conclusion
        : 'OK',
      independence_conclusion_note: engagement.independence_conclusion_note ?? null,
    };

    logInfo('engagements.created', { userId, engagementId: engagement.id, orgId: orgContext.orgId });
    return res.status(201).json({ engagement: normalizedEngagement });
  } catch (err) {
    logError('engagements.create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.patch('/v1/engagements/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const engagementId = req.params.id;
    const {
      orgSlug,
      clientId,
      title,
      description,
      status,
      startDate,
      endDate,
      budget,
      isAuditClient,
      requiresEqr,
      nonAuditServices,
      independenceChecked,
      overrideNote,
    } = req.body as {
      orgSlug?: string;
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: existing, error: fetchError } = await supabaseService
      .from('engagements')
      .select('*')
      .eq('id', engagementId)
      .maybeSingle();

    if (fetchError || !existing || existing.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'engagement not found' });
    }

    const updatePayload: Record<string, unknown> = {};

    if (typeof clientId === 'string') {
      const { data: clientRow, error: clientError } = await supabaseService
        .from('clients')
        .select('org_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !clientRow || clientRow.org_id !== orgContext.orgId) {
        return res.status(400).json({ error: 'client does not belong to organization' });
      }
      updatePayload.client_id = clientId;
    }

    if (typeof title === 'string') updatePayload.title = title;
    if (typeof description !== 'undefined') updatePayload.description = description ?? null;
    if (typeof status === 'string') updatePayload.status = status.toUpperCase();
    if (typeof startDate !== 'undefined') updatePayload.start_date = startDate ?? null;
    if (typeof endDate !== 'undefined') updatePayload.end_date = endDate ?? null;
    if (typeof budget !== 'undefined') updatePayload.budget = budget ?? null;

    const currentStatus = (existing.status ?? 'PLANNING').toUpperCase();
    const nextStatus = typeof status === 'string' ? status.toUpperCase() : currentStatus;

    const finalConclusion =
      independenceAssessment && independenceAssessment.ok
        ? independenceAssessment.conclusion
        : typeof existing.independence_conclusion === 'string'
        ? existing.independence_conclusion
        : 'OK';

    const finalIndependenceChecked =
      independenceAssessment && independenceAssessment.ok
        ? independenceAssessment.checked
        : Boolean(existing.independence_checked);

    const activating = currentStatus === 'PLANNING' && nextStatus !== 'PLANNING';

    if (activating && targetIsAuditClient) {
      if (!finalIndependenceChecked) {
        return res.status(400).json({ error: 'independence_check_required' });
      }
      if (finalConclusion === 'OK') {
        // no-op
      } else if (finalConclusion === 'OVERRIDE') {
        const overrideApproved = await hasApprovedIndependenceOverride(orgContext.orgId, engagementId);
        if (!overrideApproved) {
          return res.status(403).json({ error: 'independence_override_pending' });
        }
      } else {
        return res.status(409).json({ error: 'prohibited_non_audit_services' });
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no updates provided' });
    }

    const { data: engagement, error: updateError } = await supabaseService
      .from('engagements')
      .update(updatePayload)
      .eq('id', engagementId)
      .eq('org_id', orgContext.orgId)
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .single();

    if (updateError || !engagement) {
      throw updateError ?? new Error('engagement_not_updated');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPDATE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagement.id,
      metadata: {
        title: engagement.title,
        updates: updatePayload,
        independence: {
          conclusion: engagement.independence_conclusion,
        },
      },
    });

    const normalizedEngagement = {
      ...engagement,
      non_audit_services: sanitizeNonAuditServices(engagement.non_audit_services),
      is_audit_client: Boolean(engagement.is_audit_client),
      requires_eqr: Boolean(engagement.requires_eqr),
      independence_checked: Boolean(engagement.independence_checked),
      independence_conclusion: typeof engagement.independence_conclusion === 'string'
        ? engagement.independence_conclusion
        : 'OK',
      independence_conclusion_note: engagement.independence_conclusion_note ?? null,
    };

    logInfo('engagements.updated', { userId, engagementId: engagement.id, orgId: orgContext.orgId });
    return res.json({ engagement: normalizedEngagement });
  } catch (err) {
    logError('engagements.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.delete('/v1/engagements/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const engagementId = req.params.id;
    const orgSlug = req.query.orgSlug as string | undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: engagement, error: fetchError } = await supabaseService
      .from('engagements')
      .select('*')
      .eq('id', engagementId)
      .maybeSingle();

    if (fetchError || !engagement || engagement.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'engagement not found' });
    }

    const { count: dependentTasks } = await supabaseService
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgContext.orgId)
      .eq('engagement_id', engagementId);

    if ((dependentTasks ?? 0) > 0) {
      return res.status(409).json({ error: 'engagement_has_tasks' });
    }

    const { error: deleteError } = await supabaseService
      .from('engagements')
      .delete()
      .eq('id', engagementId)
      .eq('org_id', orgContext.orgId);

    if (deleteError) {
      throw deleteError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'DELETE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagementId,
      metadata: {
        title: engagement.title,
        client_id: engagement.client_id,
      },
    });

    logInfo('engagements.deleted', { userId, engagementId, orgId: orgContext.orgId });
    return res.status(204).send();
  } catch (err) {
    logError('engagements.delete_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'delete failed' });
  }
});

app.get('/v1/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));
    const status = req.query.status as string | undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    let query = supabaseService
      .from('tasks')
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ tasks: data ?? [] });
  } catch (err) {
    logError('tasks.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const {
      orgSlug,
      title,
      description,
      status,
      priority,
      engagementId,
      assigneeId,
      dueDate,
    } = req.body as {
      orgSlug?: string;
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      engagementId?: string | null;
      assigneeId?: string | null;
      dueDate?: string | null;
    };

    if (!orgSlug || !title) {
      return res.status(400).json({ error: 'orgSlug and title are required' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    const { data: task, error: insertError } = await supabaseService
      .from('tasks')
      .insert({
        org_id: orgId,
        title,
        description: description ?? null,
        status: status ?? 'TODO',
        priority: priority ?? 'MEDIUM',
        engagement_id: engagementId ?? null,
        assigned_to: assigneeId ?? null,
        due_date: dueDate ?? null,
      })
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'CREATE_TASK',
      entity_type: 'task',
      entity_id: task.id,
      metadata: {
        title: task.title,
        status: task.status,
      },
    });

    logInfo('tasks.created', { userId, taskId: task.id });
    return res.status(201).json({ task });
  } catch (err) {
    logError('tasks.create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.patch('/v1/tasks/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const taskId = req.params.id;
    const updates = req.body as {
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      engagementId?: string | null;
      dueDate?: string | null;
      title?: string;
      description?: string | null;
    };

    const { data: taskRow, error: fetchError } = await supabaseService
      .from('tasks')
      .select('id, org_id, assigned_to, status, priority, engagement_id, due_date, title, description')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError || !taskRow) {
      return res.status(404).json({ error: 'task not found' });
    }

    const { data: orgRow } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', taskRow.org_id)
      .maybeSingle();

    if (!orgRow) {
      return res.status(404).json({ error: 'organization not found' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgRow.slug);

    const isAssignee = taskRow.assigned_to === userId;
    if (!isAssignee && !hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const updatePayload: Record<string, unknown> = {};
    if (updates.status && ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(updates.status)) {
      updatePayload.status = updates.status;
    }
    if (updates.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(updates.priority)) {
      updatePayload.priority = updates.priority;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'assigneeId')) {
      updatePayload.assigned_to = updates.assigneeId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'engagementId')) {
      updatePayload.engagement_id = updates.engagementId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
      updatePayload.due_date = updates.dueDate ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      updatePayload.title = updates.title;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      updatePayload.description = updates.description;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no valid updates provided' });
    }

    const { data: task, error: updateError } = await supabaseService
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'UPDATE_TASK',
      entity_type: 'task',
      entity_id: taskId,
      metadata: {
        updates: updatePayload,
      },
    });

    logInfo('tasks.updated', { userId, taskId });
    return res.json({ task });
  } catch (err) {
    logError('tasks.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.patch('/v1/notifications/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const notificationId = req.params.id;
    const { read } = req.body as { read?: boolean };

    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { data: notification, error: fetchError } = await supabaseService
      .from('notifications')
      .select('id, org_id, user_id, read')
      .eq('id', notificationId)
      .maybeSingle();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'notification not found' });
    }

    const { data: orgRow } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', notification.org_id)
      .maybeSingle();

    if (!orgRow) {
      return res.status(404).json({ error: 'organization not found' });
    }

    await resolveOrgForUser(userId, orgRow.slug);

    if (notification.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { data: updated, error: updateError } = await supabaseService
      .from('notifications')
      .update({ read: read ?? true })
      .eq('id', notificationId)
      .select('id, org_id, user_id, title, body, type, read, created_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json({ notification: updated });
  } catch (err) {
    logError('notifications.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.post('/v1/notifications/mark-all', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug } = req.body as { orgSlug?: string };

    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    const { error } = await supabaseService
      .from('notifications')
      .update({ read: true })
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (err) {
    logError('notifications.mark_all_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'mark all failed' });
  }
});

export default app;
