import { Router } from 'express';
import { createOrgGuard } from '../middleware/org-guard';
import { createIdempotencyMiddleware } from '../middleware/idempotency';
import { createRateLimitMiddleware } from '../middleware/rate-limit';
import { getRequestContext } from '../utils/request-context';
import { scrubPii } from '../utils/pii';

const router = Router();

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

export default router;
