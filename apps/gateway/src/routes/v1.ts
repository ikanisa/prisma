import { Router } from 'express';
import ApiClient from '@prisma-glow/api-client';
import { createOrgGuard } from '../middleware/org-guard.js';
import { createIdempotencyMiddleware } from '../middleware/idempotency.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { getRequestContext } from '../utils/request-context.js';
import { buildTraceparent, isValidTraceparent } from '../utils/trace.js';
import type { Request } from 'express';
import { scrubPii } from '../utils/pii.js';
import { env, getRuntimeEnv } from '../env.js';

const router = Router();

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
  const orgSlug = String(req.query.orgSlug || req.query.org || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).getAutonomyStatus(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/release-controls/check', async (req, res) => {
  const { orgSlug, engagementId } = req.body || {};
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).checkReleaseControls({ orgSlug, engagementId });
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/storage/documents', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const repo = req.query.repo ? String(req.query.repo) : undefined;
  const state = req.query.state ? (String(req.query.state) as 'active' | 'archived' | 'all') : undefined;
  try {
    const payload = await createApiClient(req).listDocuments({ orgSlug, limit, offset, repo, state });
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Knowledge endpoints
router.get('/knowledge/web-sources', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).listWebSources(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/knowledge/drive/metadata', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).getDriveMetadata(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/knowledge/drive/status', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).getDriveStatus(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Tasks proxy endpoints
router.get('/tasks', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).listTasks(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const payload = await createApiClient(req).createTask(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.patch('/tasks/:taskId', async (req, res) => {
  const taskId = String(req.params.taskId || '').trim();
  if (!taskId) return res.status(400).json({ error: 'taskId_required' });
  try {
    const payload = await createApiClient(req).updateTask(taskId, req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.get('/tasks/:taskId/comments', async (req, res) => {
  const taskId = String(req.params.taskId || '').trim();
  if (!taskId) return res.status(400).json({ error: 'taskId_required' });
  try {
    const payload = await createApiClient(req).listTaskComments(taskId);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/tasks/:taskId/comments', async (req, res) => {
  const taskId = String(req.params.taskId || '').trim();
  if (!taskId) return res.status(400).json({ error: 'taskId_required' });
  try {
    const payload = await createApiClient(req).addTaskComment(taskId, req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Document signing
router.post('/storage/sign', async (req, res) => {
  try {
    const payload = await createApiClient(req).signDocument(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Observability dry-run: intentionally raise an error to exercise alerting
router.post('/observability/dry-run', (req, res) => {
  const allow =
    process.env.ALLOW_SENTRY_DRY_RUN !== undefined
      ? ['true', '1', 'yes'].includes(String(process.env.ALLOW_SENTRY_DRY_RUN).toLowerCase())
      : env.ALLOW_SENTRY_DRY_RUN;
  if (!allow) return res.status(404).json({ error: 'not_found' });
  const rid = req.headers['x-request-id'] || null;
  // Unhandled error will be caught by the server error handler and logged
  throw new Error(`sentry_dry_run_triggered request_id=${rid}`);
});

// Notifications proxy endpoints
router.get('/notifications', async (req, res) => {
  const orgSlug = String(req.query.orgSlug || '').trim();
  if (!orgSlug) return res.status(400).json({ error: 'orgSlug_required' });
  try {
    const payload = await createApiClient(req).listNotifications(orgSlug);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.patch('/notifications/:notificationId', async (req, res) => {
  const notificationId = String(req.params.notificationId || '').trim();
  if (!notificationId) return res.status(400).json({ error: 'notificationId_required' });
  try {
    const payload = await createApiClient(req).updateNotification(notificationId, req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/notifications/mark-all', async (req, res) => {
  try {
    const payload = await createApiClient(req).markAllNotifications(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Documents management
router.delete('/storage/documents/:documentId', async (req, res) => {
  const id = String(req.params.documentId || '').trim();
  if (!id) return res.status(400).json({ error: 'documentId_required' });
  try {
    const payload = await createApiClient(req).deleteDocument(id);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/storage/documents/:documentId/restore', async (req, res) => {
  const id = String(req.params.documentId || '').trim();
  if (!id) return res.status(400).json({ error: 'documentId_required' });
  try {
    const payload = await createApiClient(req).restoreDocument(id);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/documents/:documentId/extraction', async (req, res) => {
  const id = String(req.params.documentId || '').trim();
  if (!id) return res.status(400).json({ error: 'documentId_required' });
  try {
    const payload = await createApiClient(req).updateDocumentExtraction(id, req.body);
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
  try {
    const payload = await createApiClient(req).runAnalytics(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// Onboarding proxies
router.post('/onboarding/start', async (req, res) => {
  try {
    const payload = await createApiClient(req).onboardingStart(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/onboarding/link-doc', async (req, res) => {
  try {
    const payload = await createApiClient(req).onboardingLinkDoc(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

router.post('/onboarding/commit', async (req, res) => {
  try {
    const payload = await createApiClient(req).onboardingCommit(req.body);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
