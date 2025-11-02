import { Router } from 'express';
import type { Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import ApiClient from '@prisma-glow/api-client';
import { createOrgGuard } from '../middleware/org-guard.js';
import { createIdempotencyMiddleware } from '../middleware/idempotency.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { getRequestContext } from '../utils/request-context.js';
import { buildTraceparent, isValidTraceparent } from '../utils/trace.js';
import { scrubPii } from '../utils/pii.js';
import { env, getRuntimeEnv } from '../env.js';
import { withSpan } from '@prisma-glow/otel';
import type { Span } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';

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

type SpanHandler = (req: Request, res: Response, span: Span) =>
  | Promise<void | Response>
  | void
  | Response;

function spanRoute(name: string, handler: SpanHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await withSpan(name, async (span) => {
        span.setAttribute('http.route', req.route?.path ?? req.path ?? name);
        span.setAttribute('http.method', req.method);
        span.setAttribute('http.target', req.originalUrl ?? req.url ?? name);
        await handler(req, res, span);
      });
    } catch (error) {
      next(error);
    }
  };
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
router.get(
  '/autonomy/status',
  spanRoute('gateway.autonomy.status', async (req, res, span) => {
    const orgSlug = String(req.query.orgSlug || req.query.org || '').trim();
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    try {
      const payload = await createApiClient(req).getAutonomyStatus(orgSlug);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

router.post(
  '/release-controls/check',
  spanRoute('gateway.release_controls.check', async (req, res, span) => {
    const { orgSlug, engagementId } = req.body || {};
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    if (engagementId) {
      span.setAttribute('gateway.engagement_id', String(engagementId));
    }
    try {
      const payload = await createApiClient(req).checkReleaseControls({ orgSlug, engagementId });
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

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
router.get(
  '/knowledge/web-sources',
  spanRoute('gateway.knowledge.web_sources', async (req, res, span) => {
    const orgSlug = String(req.query.orgSlug || '').trim();
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    try {
      const payload = await createApiClient(req).listWebSources(orgSlug);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

router.get(
  '/knowledge/drive/metadata',
  spanRoute('gateway.knowledge.drive_metadata', async (req, res, span) => {
    const orgSlug = String(req.query.orgSlug || '').trim();
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    try {
      const payload = await createApiClient(req).getDriveMetadata(orgSlug);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

router.get(
  '/knowledge/drive/status',
  spanRoute('gateway.knowledge.drive_status', async (req, res, span) => {
    const orgSlug = String(req.query.orgSlug || '').trim();
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    try {
      const payload = await createApiClient(req).getDriveStatus(orgSlug);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

// Tasks proxy endpoints
router.get(
  '/tasks',
  spanRoute('gateway.tasks.list', async (req, res, span) => {
    const orgSlug = String(req.query.orgSlug || '').trim();
    if (!orgSlug) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'orgSlug_required' });
      return res.status(400).json({ error: 'orgSlug_required' });
    }
    span.setAttribute('gateway.org_slug', orgSlug);
    try {
      const payload = await createApiClient(req).listTasks(orgSlug);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

router.post(
  '/tasks',
  spanRoute('gateway.tasks.create', async (req, res, span) => {
    span.setAttribute('gateway.payload.kind', req.body?.kind ?? 'unknown');
    try {
      const payload = await createApiClient(req).createTask(req.body);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

router.patch(
  '/tasks/:taskId',
  spanRoute('gateway.tasks.update', async (req, res, span) => {
    const taskId = String(req.params.taskId || '').trim();
    if (!taskId) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'taskId_required' });
      return res.status(400).json({ error: 'taskId_required' });
    }
    span.setAttribute('gateway.task_id', taskId);
    try {
      const payload = await createApiClient(req).updateTask(taskId, req.body);
      res.json(payload);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      res.status(502).json({ error: (error as Error).message });
    }
  }),
);

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
