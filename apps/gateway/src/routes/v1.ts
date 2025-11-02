import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import ApiClient from '@prisma-glow/api-client';
import { createOrgGuard } from '../middleware/org-guard.js';
import { createIdempotencyMiddleware } from '../middleware/idempotency.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { getRequestContext } from '../utils/request-context.js';
import { buildTraceparent, isValidTraceparent } from '../utils/trace.js';
import { scrubPii } from '../utils/pii.js';
import { env, getRuntimeEnv } from '../env.js';
import type { SafeParseReturnType } from 'zod';
import {
  CommentBodySchema,
  DocumentIdParamsSchema,
  DocumentListQuerySchema,
  DocumentSignBodySchema,
  formatValidationErrors,
  GenericMutationBodySchema,
  NotificationIdParamsSchema,
  NotificationListQuerySchema,
  OrgScopedBodySchema,
  OrgSlugQuerySchema,
  ReleaseControlsCheckSchema,
  TaskIdParamsSchema,
  TaskListQuerySchema,
} from '@prisma-glow/api/schemas';
import { securityEnv } from '@prisma-glow/config/env/security';

const router: ExpressRouter = Router();

function parseOrRespond<T>(res: Response, result: SafeParseReturnType<unknown, T>): T | null {
  if (result.success) {
    return result.data;
  }
  res.status(400).json({ error: 'invalid_request', details: formatValidationErrors(result.error) });
  return null;
}

function getFirstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') return entry;
    }
  }
  return undefined;
}

function buildOrgSlugQuery(req: Request): { orgSlug?: string } {
  const query = req.query as Record<string, unknown>;
  return {
    orgSlug: getFirstString(query.orgSlug) ?? getFirstString(query.org),
  };
}

function buildDocumentListQuery(req: Request) {
  const query = req.query as Record<string, unknown>;
  return {
    orgSlug: getFirstString(query.orgSlug) ?? getFirstString(query.org),
    limit: getFirstString(query.limit),
    offset: getFirstString(query.offset),
    repo: getFirstString(query.repo),
    state: getFirstString(query.state),
  };
}

function getApiBaseUrl(): string {
  const runtime = getRuntimeEnv();
  const raw = runtime.FASTAPI_BASE_URL ?? runtime.API_BASE_URL ?? '';
  return raw ? raw.replace(/\/$/, '') : 'http://localhost:8000';
}

function buildForwardHeaders(req: Request): Record<string, string> {
  const ctx = getRequestContext();
  const headers: Record<string, string> = {};
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.trim()) headers['authorization'] = auth;
  if (ctx?.requestId) headers['x-request-id'] = ctx.requestId;
  if (ctx?.traceId) headers['x-trace-id'] = ctx.traceId;
  const serviceVersion = env.SERVICE_VERSION || env.SENTRY_RELEASE || 'dev';
  headers['user-agent'] = `prisma-glow-gateway/${serviceVersion}`;
  const incomingTraceparent = req.headers['traceparent'];
  headers['traceparent'] =
    (typeof incomingTraceparent === 'string' && isValidTraceparent(incomingTraceparent)
      ? incomingTraceparent
      : buildTraceparent(ctx?.traceId));
  const tracestate = req.headers['tracestate'];
  if (typeof tracestate === 'string' && tracestate.trim()) headers['tracestate'] = tracestate.trim();
  return headers;
}

function createApiClient(req: Request): ApiClient {
  return new ApiClient({ baseUrl: getApiBaseUrl(), defaultHeaders: buildForwardHeaders(req) });
}

router.use(createOrgGuard());
router.use(
  createRateLimitMiddleware({
    capacity: 60,
    windowMs: 60_000,
    keyGenerator: (req) => {
      const org = (req.headers['x-org-id'] as string) ?? 'global';
      const user = (req.headers['x-user-id'] as string) ?? 'anonymous';
      return `${org}:${user}:${req.method}:${req.path}`;
    },
  }),
);
router.use(createIdempotencyMiddleware());

router.get('/health', (_req, res) => {
  const context = getRequestContext();
  res.json({
    status: 'ok',
    requestId: context?.requestId ?? null,
    traceId: context?.traceId ?? null,
    timestamp: new Date().toISOString(),
  });
});

router.post('/echo', (req, res) => {
  const context = getRequestContext();
  const orgContext = res.locals.org;
  res.status(200).json({
    orgId: orgContext?.orgId ?? null,
    userId: orgContext?.userId ?? null,
    role: orgContext?.role ?? null,
    requestId: context?.requestId ?? null,
    traceId: context?.traceId ?? null,
    payload: scrubPii(req.body),
  });
});

router.post('/jobs', (req, res) => {
  const context = getRequestContext();
  const orgContext = res.locals.org;
  const jobId = `${orgContext?.orgId ?? 'org'}:${Date.now()}`;
  res.status(202).json({
    jobId,
    acceptedAt: new Date().toISOString(),
    requestId: context?.requestId ?? null,
    traceId: context?.traceId ?? null,
  });
});

// Proxy helper routes to backend API using the typed client
router.get('/autonomy/status', async (req, res) => {
  const query = parseOrRespond(res, OrgSlugQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).getAutonomyStatus(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/release-controls/check', async (req, res) => {
  const body = parseOrRespond(res, ReleaseControlsCheckSchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).checkReleaseControls(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/storage/documents', async (req, res) => {
  const query = parseOrRespond(res, DocumentListQuerySchema.safeParse(buildDocumentListQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).listDocuments(query);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Knowledge endpoints
router.get('/knowledge/web-sources', async (req, res) => {
  const query = parseOrRespond(res, OrgSlugQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).listWebSources(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/knowledge/drive/metadata', async (req, res) => {
  const query = parseOrRespond(res, OrgSlugQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).getDriveMetadata(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/knowledge/drive/status', async (req, res) => {
  const query = parseOrRespond(res, OrgSlugQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).getDriveStatus(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Tasks proxy endpoints
router.get('/tasks', async (req, res) => {
  const query = parseOrRespond(res, TaskListQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).listTasks(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/tasks', async (req, res) => {
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).createTask(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.patch('/tasks/:taskId', async (req, res) => {
  const params = parseOrRespond(res, TaskIdParamsSchema.safeParse(req.params));
  if (!params) return;
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).updateTask(params.taskId, body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/tasks/:taskId/comments', async (req, res) => {
  const params = parseOrRespond(res, TaskIdParamsSchema.safeParse(req.params));
  if (!params) return;
  try {
    const payload = await createApiClient(req).listTaskComments(params.taskId);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/tasks/:taskId/comments', async (req, res) => {
  const params = parseOrRespond(res, TaskIdParamsSchema.safeParse(req.params));
  if (!params) return;
  const body = parseOrRespond(res, CommentBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).addTaskComment(params.taskId, body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Document signing
router.post('/storage/sign', async (req, res) => {
  const body = parseOrRespond(res, DocumentSignBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).signDocument(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Observability dry-run: intentionally raise an error to exercise alerting
router.post('/observability/dry-run', (req, res) => {
  const allow = securityEnv.allowSentryDryRun || env.ALLOW_SENTRY_DRY_RUN;
  if (!allow) return res.status(404).json({ error: 'not_found' });
  const rid = req.headers['x-request-id'] || null;
  // Unhandled error will be caught by the server error handler and logged
  throw new Error(`sentry_dry_run_triggered request_id=${rid}`);
});

// Notifications proxy endpoints
router.get('/notifications', async (req, res) => {
  const query = parseOrRespond(res, NotificationListQuerySchema.safeParse(buildOrgSlugQuery(req)));
  if (!query) return;
  try {
    const payload = await createApiClient(req).listNotifications(query.orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.patch('/notifications/:notificationId', async (req, res) => {
  const params = parseOrRespond(res, NotificationIdParamsSchema.safeParse(req.params));
  if (!params) return;
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).updateNotification(params.notificationId, body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/notifications/mark-all', async (req, res) => {
  const body = parseOrRespond(res, OrgScopedBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).markAllNotifications(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Documents management
router.delete('/storage/documents/:documentId', async (req, res) => {
  const params = parseOrRespond(res, DocumentIdParamsSchema.safeParse(req.params));
  if (!params) return;
  try {
    const payload = await createApiClient(req).deleteDocument(params.documentId);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/storage/documents/:documentId/restore', async (req, res) => {
  const params = parseOrRespond(res, DocumentIdParamsSchema.safeParse(req.params));
  if (!params) return;
  try {
    const payload = await createApiClient(req).restoreDocument(params.documentId);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/documents/:documentId/extraction', async (req, res) => {
  const params = parseOrRespond(res, DocumentIdParamsSchema.safeParse(req.params));
  if (!params) return;
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).updateDocumentExtraction(params.documentId, body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Analytics (ADA)
router.get('/analytics/run', async (req, res) => {
  try {
    const payload = await createApiClient(req).getAnalyticsRun(req.query as any);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/analytics/run', async (req, res) => {
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).runAnalytics(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Onboarding proxies
router.post('/onboarding/start', async (req, res) => {
  const body = parseOrRespond(res, OrgScopedBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).onboardingStart(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/onboarding/link-doc', async (req, res) => {
  const body = parseOrRespond(res, GenericMutationBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).onboardingLinkDoc(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/onboarding/commit', async (req, res) => {
  const body = parseOrRespond(res, OrgScopedBodySchema.safeParse(req.body));
  if (!body) return;
  try {
    const payload = await createApiClient(req).onboardingCommit(body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
